import React from 'react';
import { useApp, Lead } from '../App';
import { MapPin, User, ArrowRight, Trash2, Calendar, Smile } from 'lucide-react';

const FollowUps: React.FC = () => {
  const { activeCampaign, leads, updateLeadStatus } = useApp();

  const campaignLeads = activeCampaign 
    ? leads.filter(l => l.campaign_id === activeCampaign.id) 
    : leads;

  // Group leads by pipeline columns
  // Column 1: Contacted & Responded
  const contactedLeads = campaignLeads.filter(l => l.status === 'CONTACTED' || l.status === 'RESPONDED');
  // Column 2: Meeting Booked
  const meetingLeads = campaignLeads.filter(l => l.status === 'MEETING');
  // Column 3: Closed / Lost
  const lostLeads = campaignLeads.filter(l => l.status === 'CLOSED_LOST');

  const moveNext = async (lead: Lead) => {
    if (lead.status === 'CONTACTED' || lead.status === 'RESPONDED') {
      await updateLeadStatus(lead.id, 'MEETING');
    }
  };

  const markLost = async (lead: Lead) => {
    await updateLeadStatus(lead.id, 'CLOSED_LOST');
  };

  const markNew = async (lead: Lead) => {
    await updateLeadStatus(lead.id, 'RESPONDED');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      <div className="glass-panel" style={{ border: '1px solid rgba(0, 0, 0, 0.05)', padding: '20px' }}>
        <h2 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem', marginBottom: '6px' }}>
          Follow Ups & Pipeline
        </h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Arrastra o mueve los prospectos a lo largo de las distintas etapas del embudo de ventas.
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        alignItems: 'start'
      }}>
        
        {/* Column 1: Contacted / Responded */}
        <div className="kanban-column">
          <div className="kanban-column-header">
            <span className="kanban-column-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#7048e8' }}></span>
              Contactados / Respondieron
            </span>
            <span className="kanban-column-count">{contactedLeads.length}</span>
          </div>

          <div className="kanban-cards">
            {contactedLeads.map((lead) => (
              <div key={lead.id} className="kanban-card">
                <div className="kanban-card-header">
                  <span className="kanban-card-title">{lead.company_name}</span>
                  <span className="kanban-card-score">{lead.score}</span>
                </div>
                <div className="kanban-card-location">
                  <MapPin size={12} />
                  Guadalajara, MX
                </div>
                <div className="kanban-card-contact">
                  <User size={12} />
                  {lead.contact_name}
                </div>
                
                {/* Actions row */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                  <button 
                    onClick={() => markLost(lead)}
                    style={{ background: 'none', border: 'none', color: '#ff4d6d', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Perder
                  </button>
                  <button 
                    onClick={() => moveNext(lead)}
                    style={{ background: 'none', border: 'none', color: '#0ca678', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
                  >
                    Next <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
            {contactedLeads.length === 0 && (
              <div style={{ border: '2px dashed var(--border-light)', borderRadius: '12px', padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Columna vacía
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Meeting Booked */}
        <div className="kanban-column">
          <div className="kanban-column-header">
            <span className="kanban-column-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0ca678' }}></span>
              Reunión Agendada (Meeting Booked)
            </span>
            <span className="kanban-column-count">{meetingLeads.length}</span>
          </div>

          <div className="kanban-cards">
            {meetingLeads.map((lead) => (
              <div key={lead.id} className="kanban-card">
                <div className="kanban-card-header">
                  <span className="kanban-card-title">{lead.company_name}</span>
                  <span className="kanban-card-score" style={{ backgroundColor: '#e6fcf5', color: '#0ca678', borderColor: '#c3fae8' }}>{lead.score}</span>
                </div>
                <div className="kanban-card-location">
                  <MapPin size={12} />
                  Guadalajara, MX
                </div>
                <div className="kanban-card-contact">
                  <User size={12} />
                  {lead.contact_name}
                </div>

                {/* Actions row */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                  <button 
                    onClick={() => markLost(lead)}
                    style={{ background: 'none', border: 'none', color: '#ff4d6d', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Perder
                  </button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2b8a3e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} /> Reagendada
                  </span>
                </div>
              </div>
            ))}
            {meetingLeads.length === 0 && (
              <div style={{ border: '2px dashed var(--border-light)', borderRadius: '12px', padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Columna vacía
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Closed / Lost */}
        <div className="kanban-column">
          <div className="kanban-column-header">
            <span className="kanban-column-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff4d6d' }}></span>
              Cerradas / Perdidas (Closed / Lost)
            </span>
            <span className="kanban-column-count">{lostLeads.length}</span>
          </div>

          <div className="kanban-cards">
            {lostLeads.map((lead) => (
              <div key={lead.id} className="kanban-card">
                <div className="kanban-card-header">
                  <span className="kanban-card-title" style={{ color: 'var(--text-secondary)' }}>{lead.company_name}</span>
                  <span className="kanban-card-score" style={{ backgroundColor: '#f1f3f5', color: '#868e96', borderColor: '#e9ecef' }}>{lead.score}</span>
                </div>
                <div className="kanban-card-location">
                  <MapPin size={12} />
                  Guadalajara, MX
                </div>
                <div className="kanban-card-contact">
                  <User size={12} />
                  {lead.contact_name}
                </div>

                {/* Actions row */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                  <button 
                    onClick={() => markNew(lead)}
                    style={{ background: 'none', border: 'none', color: '#7048e8', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    Reactivar
                  </button>
                </div>
              </div>
            ))}
            {lostLeads.length === 0 && (
              <div style={{ border: '2px dashed var(--border-light)', borderRadius: '12px', padding: '30px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Columna vacía
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default FollowUps;
