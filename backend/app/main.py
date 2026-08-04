import os
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from backend.app.database import init_db, SessionLocal, Organization, User, Campaign, Lead, AgentLog
from backend.app.agents.pipeline import execute_pipeline

# Initialize database tables
init_db()

app = FastAPI(title="DM Autonomous SDR Platform API")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get db session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic schemas
class CampaignCreate(BaseModel):
    name: str
    prompt: str
    city: str
    organization_id: str = "default-tenant-id"
    max_leads: int = 12

class CampaignResponse(BaseModel):
    id: str
    organization_id: str
    name: str
    prompt: str
    city: str
    status: str
    progress: float
    created_at: str
    max_leads: int

    class Config:
        from_attributes = True

class LeadUpdate(BaseModel):
    status: str

# Endpoints
@app.get("/api/organizations/{org_id}")
def get_organization(org_id: str, db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {
        "id": org.id,
        "name": org.name,
        "plan": org.plan,
        "leads_limit": org.leads_limit,
        "leads_used": org.leads_used,
        "created_at": org.created_at
    }

@app.post("/api/billing/upgrade")
def upgrade_organization(org_id: str = "default-tenant-id", db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org.plan = "premium"
    org.leads_limit = 999999
    db.commit()
    
    return {
        "status": "success",
        "message": "Organización actualizada a Plan Premium con procesamiento ilimitado.",
        "plan": org.plan,
        "leads_limit": org.leads_limit
    }

@app.post("/api/campaigns")
def create_campaign(campaign_in: CampaignCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Verify organization exists
    org = db.query(Organization).filter(Organization.id == campaign_in.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # SAAS limit check
    if org.plan == "free" and org.leads_used >= org.leads_limit:
        raise HTTPException(
            status_code=403, 
            detail="Límite de leads excedido en Plan Gratuito (máximo 5 leads). Por favor, actualiza a Premium."
        )

    # Create campaign
    new_campaign = Campaign(
        name=campaign_in.name,
        prompt=campaign_in.prompt,
        city=campaign_in.city.strip(),
        organization_id=campaign_in.organization_id,
        status="draft",
        progress=0.0,
        max_leads=max(1, min(campaign_in.max_leads, 100))
    )
    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    # Launch pipeline in background task
    background_tasks.add_task(execute_pipeline, new_campaign.id)

    return {
        "id": new_campaign.id,
        "name": new_campaign.name,
        "prompt": new_campaign.prompt,
        "city": new_campaign.city,
        "status": "running",  # pipeline.py immediately sets status to running
        "progress": 0.0,
        "max_leads": new_campaign.max_leads,
        "created_at": new_campaign.created_at.isoformat()
    }

@app.get("/api/campaigns")
def get_campaigns(org_id: str = "default-tenant-id", db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).filter(Campaign.organization_id == org_id).order_by(Campaign.created_at.desc()).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "prompt": c.prompt,
            "city": c.city or "",
            "status": c.status,
            "progress": c.progress,
            "created_at": c.created_at.isoformat(),
            "max_leads": c.max_leads or 12
        } for c in campaigns
    ]

@app.get("/api/campaigns/{campaign_id}")
def get_campaign(campaign_id: str, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get associated logs
    logs = db.query(AgentLog).filter(AgentLog.campaign_id == campaign_id).order_by(AgentLog.created_at.asc()).all()
    
    return {
        "id": campaign.id,
        "name": campaign.name,
        "prompt": campaign.prompt,
        "city": campaign.city or "",
        "status": campaign.status,
        "progress": campaign.progress,
        "created_at": campaign.created_at.isoformat(),
        "max_leads": campaign.max_leads or 12,
        "logs": [
            {
                "id": l.id,
                "agent_name": l.agent_name,
                "status": l.status,
                "message": l.message,
                "created_at": l.created_at.isoformat()
            } for l in logs
        ]
    }

@app.get("/api/leads")
def get_leads(
    org_id: str = "default-tenant-id", 
    campaign_id: Optional[str] = None, 
    priority: Optional[str] = None, 
    status: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(Lead).filter(Lead.organization_id == org_id)
    
    if campaign_id:
        query = query.filter(Lead.campaign_id == campaign_id)
    if priority:
        query = query.filter(Lead.priority == priority)
    if status:
        query = query.filter(Lead.status == status)
        
    leads = query.order_by(Lead.score.desc()).all()
    
    result = []
    for l in leads:
        outreach = {}
        if l.outreach_messages:
            try:
                outreach = json.loads(l.outreach_messages)
            except Exception:
                outreach = {"email": l.outreach_messages}
                
        result.append({
            "id": l.id,
            "campaign_id": l.campaign_id,
            "company_name": l.company_name,
            "website": l.website,
            "score": l.score,
            "priority": l.priority,
            "contact_name": l.contact_name,
            "contact_role": l.contact_role,
            "contact_email": l.contact_email,
            "research_notes": l.research_notes,
            "outreach_messages": outreach,
            "status": l.status,
            "created_at": l.created_at.isoformat(),
            "source_url": l.source_url,
            "source_type": l.source_type,
            "location_verified": bool(l.location_verified),
            "business_category_verified": bool(l.business_category_verified),
            "domain_verified": bool(l.domain_verified),
            "contact_verified": bool(l.contact_verified),
            "email_verified": bool(l.email_verified),
            "validation_status": l.validation_status or "UNVERIFIED",
            "validation_reason": l.validation_reason,
            "confidence_score": l.confidence_score or 0
        })
    return result

@app.patch("/api/leads/{lead_id}")
def update_lead(lead_id: str, lead_update: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    if lead_update.status in {"CONTACTED", "RESPONDED", "MEETING"} and lead.validation_status != "QUALIFIED":
        raise HTTPException(status_code=409, detail="Este prospecto requiere validación antes de iniciar outreach.")
        
    lead.status = lead_update.status
    db.commit()
    
    return {"status": "success", "lead_id": lead.id, "new_status": lead.status}

# Serve React static files in production mode
# First check if the directory exists to avoid crashes in dev mode before building the frontend
frontend_dist_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend", "dist")

if os.path.exists(frontend_dist_path):
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="static")
    
    # Catch-all route to redirect all unknown routes to React's index.html for client-side routing
    @app.exception_handler(404)
    async def custom_404_handler(request, exc):
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))
else:
    @app.get("/")
    def read_root():
        return {
            "message": "FastAPI is running. Build the frontend in frontend/dist to serve it here, or run Vite dev server."
        }
