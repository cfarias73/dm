import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  LayoutDashboard, 
  ListTodo, 
  Search, 
  Mail, 
  CalendarDays, 
  Terminal, 
  ArrowLeft, 
  Sparkles, 
  TrendingUp, 
  Flame, 
  Send, 
  Calendar,
  Lock,
  Pause,
  Play,
  Download,
  AlertCircle
} from 'lucide-react';

// API Base URL
const API_URL = 'http://localhost:3378/api';

// Types
export interface Organization {
  id: string;
  name: string;
  plan: string;
  leads_limit: number;
  leads_used: number;
}

export interface Campaign {
  id: string;
  name: string;
  prompt: string;
  city?: string;
  status: string;
  progress: number;
  created_at: string;
  logs?: any[];
  max_leads?: number;
}

export interface Lead {
  id: string;
  campaign_id: string;
  company_name: string;
  website: string;
  score: number;
  priority: string;
  contact_name: string | null;
  contact_role: string | null;
  contact_email: string | null;
  research_notes: string;
  outreach_messages: {
    email?: string;
    whatsapp?: string;
    linkedin?: string;
  };
  status: string;
  source_url?: string | null;
  source_type?: string | null;
  location_verified?: boolean;
  business_category_verified?: boolean;
  domain_verified?: boolean;
  contact_verified?: boolean;
  email_verified?: boolean;
  validation_status?: string;
  validation_reason?: string | null;
  confidence_score?: number;
}

interface AppContextType {
  org: Organization | null;
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  leads: Lead[];
  loading: boolean;
  error: string | null;
  setActiveCampaign: (c: Campaign | null) => void;
  loadOrganization: () => void;
  loadCampaigns: () => void;
  loadLeads: () => void;
  startCampaign: (name: string, prompt: string, city: string, maxLeads?: number) => Promise<Campaign>;
  upgradeTenant: () => Promise<void>;
  updateLeadStatus: (leadId: string, status: string) => Promise<void>;
  isPaused: boolean;
  setIsPaused: (p: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

// Pages imports (we will write these files next)
import Landing from './pages/Landing';
import Overview from './pages/Overview';
import LeedsList from './pages/LeedsList';
import DeepResearch from './pages/DeepResearch';
import OutreachCenter from './pages/OutreachCenter';
import FollowUps from './pages/FollowUps';
import AgentLogs from './pages/AgentLogs';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaignState] = useState<Campaign | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const loadOrganization = async () => {
    try {
      const res = await axios.get(`${API_URL}/organizations/default-tenant-id`);
      setOrg(res.data);
    } catch (err: any) {
      console.error("Error loading organization:", err);
      setError("No se pudo cargar la organización");
    }
  };

  const loadCampaigns = async () => {
    try {
      const res = await axios.get(`${API_URL}/campaigns`);
      setCampaigns(res.data);
      // Set active campaign to the latest running/completed one if none set
      if (res.data.length > 0) {
        const running = res.data.find((c: any) => c.status === 'running');
        if (running) {
          setActiveCampaignState(running);
        } else if (!activeCampaign) {
          setActiveCampaignState(res.data[0]);
        }
      }
    } catch (err) {
      console.error("Error loading campaigns:", err);
    }
  };

  const loadLeads = async () => {
    try {
      const res = await axios.get(`${API_URL}/leads`);
      setLeads(res.data);
    } catch (err) {
      console.error("Error loading leads:", err);
    }
  };

  const setActiveCampaign = (campaign: Campaign | null) => {
    setActiveCampaignState(campaign);
  };

  const startCampaign = async (name: string, prompt: string, city: string, maxLeads = 12): Promise<Campaign> => {
    try {
      setError(null);
      const res = await axios.post(`${API_URL}/campaigns`, { name, prompt, city, max_leads: maxLeads });
      const newCampaign = res.data;
      setCampaigns(prev => [newCampaign, ...prev]);
      setActiveCampaignState(newCampaign);
      // Reload organization to update limits
      await loadOrganization();
      return newCampaign;
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Error al iniciar campaña";
      setError(msg);
      throw new Error(msg);
    }
  };

  const upgradeTenant = async () => {
    try {
      const res = await axios.post(`${API_URL}/billing/upgrade`);
      if (res.data.status === 'success') {
        await loadOrganization();
      }
    } catch (err) {
      console.error("Error upgrading tenant:", err);
    }
  };

  const updateLeadStatus = async (leadId: string, status: string) => {
    try {
      await axios.patch(`${API_URL}/leads/${leadId}`, { status });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
    } catch (err) {
      console.error("Error updating lead status:", err);
    }
  };

  // Poll active campaign details while running
  useEffect(() => {
    let interval: any;
    if (activeCampaign && activeCampaign.status === 'running') {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_URL}/campaigns/${activeCampaign.id}`);
          const updatedCampaign = res.data;
          setActiveCampaignState(updatedCampaign);
          
          // Update the campaign in the list
          setCampaigns(prev => prev.map(c => c.id === updatedCampaign.id ? updatedCampaign : c));
          
          if (updatedCampaign.status !== 'running') {
            clearInterval(interval);
            loadLeads();
            loadOrganization();
          }
        } catch (err) {
          console.error("Error polling campaign:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [activeCampaign?.id, activeCampaign?.status]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadOrganization();
      await loadCampaigns();
      await loadLeads();
      setLoading(false);
    };
    init();
  }, []);

  return (
    <AppContext.Provider value={{
      org,
      campaigns,
      activeCampaign,
      leads,
      loading,
      error,
      setActiveCampaign,
      loadOrganization,
      loadCampaigns,
      loadLeads,
      startCampaign,
      upgradeTenant,
      updateLeadStatus,
      isPaused,
      setIsPaused
    }}>
      {children}
    </AppContext.Provider>
  );
};

const NavigationSidebar = () => {
  const { org, activeCampaign, upgradeTenant } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  // If we are on landing, don't show sidebar
  if (location.pathname === '/') return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="sidebar">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 mb-8" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
        <div style={{
          backgroundColor: '#2d3135',
          border: '1.5px solid var(--accent-mint)',
          borderRadius: '8px',
          padding: '6px 12px',
          fontWeight: '900',
          fontSize: '1.4rem',
          color: 'var(--accent-mint)',
          fontStyle: 'italic',
          letterSpacing: '-1px'
        }}>
          dm
        </div>
        <div>
          <span style={{ fontWeight: 800, fontSize: '1rem', display: 'block', color: 'var(--text-light)', letterSpacing: '0.5px' }}>EVENT LOVERS</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--accent-mint)', fontWeight: 600, letterSpacing: '1px' }}>SDR AGENT</span>
        </div>
      </div>

      {/* Active Campaign Block */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.03)', 
        borderRadius: '12px', 
        padding: '14px', 
        marginBottom: '24px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
          Campaña Activa
        </span>
        <span style={{ 
          fontSize: '0.85rem', 
          fontWeight: 700, 
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: '1.2',
          marginBottom: '8px',
          color: '#f5f6f7'
        }}>
          {activeCampaign ? activeCampaign.name : 'Ninguna activa'}
        </span>
        
        {activeCampaign && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: activeCampaign.status === 'running' ? 'var(--accent-mint)' : activeCampaign.status === 'completed' ? '#7048e8' : activeCampaign.status === 'completed_with_review' ? '#f59f00' : '#8d949e',
              display: 'inline-block'
            }}></span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {activeCampaign.status === 'running' ? 'PROCESANDO' : activeCampaign.status === 'completed' ? 'COMPLETADO' : activeCampaign.status === 'completed_with_review' ? 'REVISIÓN NECESARIA' : activeCampaign.status === 'completed_empty' ? 'SIN RESULTADOS VÁLIDOS' : 'FALLIDO'}
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexGrow: 1 }}>
        <Link to="/dashboard/overview" className="nav-link" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          textDecoration: 'none',
          color: isActive('/dashboard/overview') ? 'var(--bg-dark)' : 'var(--text-muted)',
          backgroundColor: isActive('/dashboard/overview') ? 'var(--accent-mint)' : 'transparent',
          fontWeight: isActive('/dashboard/overview') ? 700 : 500,
          fontSize: '0.9rem',
          transition: 'var(--transition-smooth)'
        }}>
          <LayoutDashboard size={18} />
          Overview
        </Link>

        <Link to="/dashboard/leads" className="nav-link" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          textDecoration: 'none',
          color: isActive('/dashboard/leads') ? 'var(--bg-dark)' : 'var(--text-muted)',
          backgroundColor: isActive('/dashboard/leads') ? 'var(--accent-mint)' : 'transparent',
          fontWeight: isActive('/dashboard/leads') ? 700 : 500,
          fontSize: '0.9rem',
          transition: 'var(--transition-smooth)'
        }}>
          <ListTodo size={18} />
          Leeds List
        </Link>

        <Link to="/dashboard/research" className="nav-link" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          textDecoration: 'none',
          color: isActive('/dashboard/research') ? 'var(--bg-dark)' : 'var(--text-muted)',
          backgroundColor: isActive('/dashboard/research') ? 'var(--accent-mint)' : 'transparent',
          fontWeight: isActive('/dashboard/research') ? 700 : 500,
          fontSize: '0.9rem',
          transition: 'var(--transition-smooth)'
        }}>
          <Search size={18} />
          Deep Research
        </Link>

        <Link to="/dashboard/outreach" className="nav-link" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          textDecoration: 'none',
          color: isActive('/dashboard/outreach') ? 'var(--bg-dark)' : 'var(--text-muted)',
          backgroundColor: isActive('/dashboard/outreach') ? 'var(--accent-mint)' : 'transparent',
          fontWeight: isActive('/dashboard/outreach') ? 700 : 500,
          fontSize: '0.9rem',
          transition: 'var(--transition-smooth)'
        }}>
          <Mail size={18} />
          Outreach Center
        </Link>

        <Link to="/dashboard/followups" className="nav-link" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          textDecoration: 'none',
          color: isActive('/dashboard/followups') ? 'var(--bg-dark)' : 'var(--text-muted)',
          backgroundColor: isActive('/dashboard/followups') ? 'var(--accent-mint)' : 'transparent',
          fontWeight: isActive('/dashboard/followups') ? 700 : 500,
          fontSize: '0.9rem',
          transition: 'var(--transition-smooth)'
        }}>
          <CalendarDays size={18} />
          Follow Ups
        </Link>

        <Link to="/dashboard/logs" className="nav-link" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          borderRadius: '10px',
          textDecoration: 'none',
          color: isActive('/dashboard/logs') ? 'var(--bg-dark)' : 'var(--text-muted)',
          backgroundColor: isActive('/dashboard/logs') ? 'var(--accent-mint)' : 'transparent',
          fontWeight: isActive('/dashboard/logs') ? 700 : 500,
          fontSize: '0.9rem',
          transition: 'var(--transition-smooth)'
        }}>
          <Terminal size={18} />
          Agent Logs
        </Link>
      </nav>

      {/* Footer / Tenant SaaS credit meters */}
      <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {org && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Consumo de Leads:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-light)' }}>
                {org.leads_used} / {org.leads_limit > 10000 ? '∞' : org.leads_limit}
              </span>
            </div>
            
            {org.plan === 'free' ? (
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(118, 232, 167, 0.15) 0%, rgba(118, 232, 167, 0.03) 100%)',
                border: '1px solid rgba(118, 232, 167, 0.25)',
                borderRadius: '10px',
                padding: '12px',
                marginTop: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Sparkles size={14} style={{ color: 'var(--accent-mint)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-mint)' }}>PLAN GRATUITO</span>
                </div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: '1.3' }}>
                  Límite de 5 leads. Actualiza a Premium para leads ilimitados y multiusuario.
                </p>
                <button 
                  onClick={upgradeTenant}
                  className="btn-primary" 
                  style={{ width: '100%', fontSize: '0.75rem', padding: '8px 12px', justifyContent: 'center' }}
                >
                  Actualizar a Premium
                </button>
              </div>
            ) : (
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(112, 72, 232, 0.15) 0%, rgba(112, 72, 232, 0.03) 100%)',
                border: '1px solid rgba(112, 72, 232, 0.25)',
                borderRadius: '10px',
                padding: '12px',
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={16} style={{ color: '#7048e8' }} />
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f5f6f7', display: 'block' }}>PLAN PREMIUM</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Procesamiento Ilimitado</span>
                </div>
              </div>
            )}

            <button 
              onClick={() => navigate('/')} 
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '16px',
                padding: '4px 0'
              }}
            >
              <ArrowLeft size={14} />
              Volver a Campañas
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

const HeaderBar = () => {
  const { activeCampaign, isPaused, setIsPaused } = useApp();
  const location = useLocation();

  if (location.pathname === '/') return null;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 0 24px 0',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      marginBottom: '32px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
          {activeCampaign ? `Campaña: ${activeCampaign.name}` : 'Workspace'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className="btn-dark"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          {isPaused ? <Play size={16} /> : <Pause size={16} />}
          {isPaused ? 'Reanudar' : 'Pausar'}
        </button>
        <button 
          className="btn-dark"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          onClick={() => {
            // Trigger raw CSV download simulation
            alert("Exportando reporte de leads en formato CSV...");
          }}
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>
    </header>
  );
};

const AppContent = () => {
  const { loading } = useApp();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        backgroundColor: 'var(--bg-dark)',
        color: 'var(--accent-mint)',
        fontSize: '1.5rem',
        fontWeight: 700
      }}>
        Cargando Plataforma DM...
      </div>
    );
  }

  return (
    <div className="app-container">
      <NavigationSidebar />
      <main className="main-content">
        <HeaderBar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard/overview" element={<Overview />} />
          <Route path="/dashboard/leads" element={<LeedsList />} />
          <Route path="/dashboard/research" element={<DeepResearch />} />
          <Route path="/dashboard/outreach" element={<OutreachCenter />} />
          <Route path="/dashboard/followups" element={<FollowUps />} />
          <Route path="/dashboard/logs" element={<AgentLogs />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </Router>
  );
};

export default App;
