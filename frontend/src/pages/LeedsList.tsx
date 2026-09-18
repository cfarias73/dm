import React, { useState, useEffect } from 'react';
import { useApp, Lead } from '../App';
import { 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Mail, 
  Phone, 
  User, 
  Eye, 
  X, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Check, 
  Building2, 
  Layers, 
  MessageSquare, 
  Sparkles,
  ShieldCheck,
  Send,
  MapPin,
  Flame
} from 'lucide-react';

const LeedsList: React.FC = () => {
  const { activeCampaign, leads, updateLeadStatus } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'profile' | 'research' | 'outreach'>('profile');

  // Filter leads
  const campaignLeads = activeCampaign 
    ? leads.filter(l => l.campaign_id === activeCampaign.id) 
    : leads;

  const filteredLeads = campaignLeads.filter(lead => {
    const matchesSearch = lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.contact_name && lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.website && lead.website.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesPriority = priorityFilter ? lead.priority === priorityFilter : true;
    const matchesStatus = statusFilter ? lead.status === statusFilter : true;
    
    return matchesSearch && matchesPriority && matchesStatus;
  });

  // ESC key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedLead(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Safe outreach messages helper with nested object extraction
  const getOutreach = (lead: Lead | null): { email?: string; whatsapp?: string; linkedin?: string } => {
    if (!lead || !lead.outreach_messages) return {};
    let raw: any = lead.outreach_messages;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        return { email: raw };
      }
    }
    if (typeof raw !== 'object' || raw === null) return {};

    const extractStr = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val === 'object') {
        const subj = val.asunto || val.subject || val.title || '';
        const body = val.cuerpo || val.body || val.mensaje || val.message || val.text || '';
        if (subj && body) return `Asunto: ${subj}\n\n${body}`;
        if (body) return body;
        if (subj) return `Asunto: ${subj}`;
        return Object.entries(val).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('\n\n');
      }
      return String(val);
    };

    return {
      email: extractStr(raw.email),
      whatsapp: extractStr(raw.whatsapp),
      linkedin: extractStr(raw.linkedin)
    };
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const exportCSV = () => {
    if (filteredLeads.length === 0) return;
    
    const headers = [
      "Company", "Website", "Score", "Priority", "Contact Name", 
      "Contact Role", "Contact Email", "Status", "Research Notes", 
      "Validation Status", "Confidence Score", "Email Draft", 
      "WhatsApp Draft", "LinkedIn Draft"
    ];
    
    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredLeads.map(l => {
      const msgs = getOutreach(l);
      return [
        l.company_name, l.website, l.score, l.priority, l.contact_name, 
        l.contact_role, l.contact_email, l.status, l.research_notes,
        l.validation_status, l.confidence_score,
        msgs.email || '',
        msgs.whatsapp || '',
        msgs.linkedin || ''
      ];
    });
    
    const bom = "\uFEFF";
    const csvContent = bom + [headers.join(","), ...rows.map(e => e.map(escapeCsv).join(","))].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_${activeCampaign ? activeCampaign.id : 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentOutreach = getOutreach(selectedLead);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title & Filters Panel */}
      <div className="glass-panel" style={{ border: '1px solid rgba(0, 0, 0, 0.05)', padding: '20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '8px 14px', width: '320px' }}>
            <Search size={18} style={{ color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Buscar por empresa, contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Selector filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            
            {/* Priority filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '6px 12px' }}>
              <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-primary)', backgroundColor: 'transparent', cursor: 'pointer' }}
              >
                <option value="">Prioridades (Todas)</option>
                <option value="HOT">🔥 HOT</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            {/* Status filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '10px', padding: '6px 12px' }}>
              <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '0.85rem', color: 'var(--text-primary)', backgroundColor: 'transparent', cursor: 'pointer' }}
              >
                <option value="">Estatus (Todos)</option>
                <option value="DISCOVERED">DISCOVERED</option>
                <option value="QUALIFIED">QUALIFIED</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="RESPONDED">RESPONDED</option>
                <option value="MEETING">MEETING</option>
              </select>
            </div>

            {/* Export CSV Button */}
            <button 
              onClick={exportCSV}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
            >
              <Download size={14} />
              Exportar CSV ({filteredLeads.length})
            </button>
          </div>

        </div>
      </div>

      {/* Main Leads Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {filteredLeads.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Building2 size={40} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              No se encontraron prospectos
            </h3>
            <span style={{ fontSize: '0.85rem' }}>Prueba ajustando los filtros de búsqueda o ejecutando una campaña.</span>
          </div>
        ) : (
          <div className="table-container" style={{ margin: 0 }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>EMPRESA</th>
                  <th>SCORE</th>
                  <th>PRIORIDAD</th>
                  <th>CONTACTO</th>
                  <th>ESTATUS</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', display: 'block', color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {lead.company_name}
                        </span>
                        {lead.website && (
                          <a 
                            href={`https://${lead.website.replace(/^https?:\/\//, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                          >
                            {lead.website}
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="score-container">
                        <span className="score-num">{lead.score}</span>
                        <div className="score-bar-bg">
                          <div className="score-bar-fill" style={{ width: `${Math.min(100, Math.max(0, lead.score))}%` }}></div>
                        </div>
                      </div>
                      <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '4px', fontSize: '0.75rem' }}>
                        Prospect: {lead.prospect_score ?? 0} · {lead.prospect_band || 'Lead'}
                      </small>
                    </td>
                    <td>
                      <span className={`badge-priority ${(lead.priority || 'medium').toLowerCase()}`}>
                        {lead.priority === 'HOT' ? '🔥 HOT' : lead.priority || 'MEDIUM'}
                      </span>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                          {lead.contact_name || 'No identificado'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>
                          {lead.contact_role || 'Puesto N/A'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className={`badge-status ${(lead.status || 'new').toLowerCase()}`}>
                          {lead.status === 'MEETING' ? 'MEETING' : lead.status === 'RESPONDED' ? 'RESPONDED' : lead.status || 'DISCOVERED'}
                        </span>
                        <small style={{ color: lead.validation_status === 'QUALIFIED' ? '#2f9e44' : '#f08c00', fontWeight: 600, fontSize: '0.75rem' }}>
                          {lead.validation_status || 'UNVERIFIED'}
                        </small>
                      </div>
                    </td>
                    <td>
                      <button 
                        onClick={() => {
                          setSelectedLead(lead);
                          setModalTab('profile');
                        }}
                        className="btn-dark"
                        style={{ padding: '8px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', borderRadius: '8px' }}
                      >
                        <Eye size={13} />
                        Detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Robust Executive Details Modal */}
      {selectedLead && (
        <div 
          onClick={() => setSelectedLead(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="glass-panel" 
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '88vh',
              overflowY: 'auto',
              padding: '28px',
              backgroundColor: '#ffffff',
              position: 'relative',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.4)'
            }}
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedLead(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(0,0,0,0.05)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                transition: 'var(--transition-smooth)'
              }}
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px', paddingRight: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h2 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.4rem', margin: 0 }}>
                  {selectedLead.company_name}
                </h2>
                <span className={`badge-priority ${selectedLead.priority.toLowerCase()}`}>
                  {selectedLead.priority === 'HOT' ? '🔥 HOT' : selectedLead.priority}
                </span>
                <span style={{
                  backgroundColor: 'var(--bg-dark)',
                  color: 'var(--accent-mint)',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 900
                }}>
                  Score: {selectedLead.score}%
                </span>
                {selectedLead.prospect_band && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5' }}>
                    Banda {selectedLead.prospect_band}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                {selectedLead.website && (
                  <a 
                    href={`https://${selectedLead.website.replace(/^https?:\/\//, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#4f46e5', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                  >
                    <Globe size={13} />
                    {selectedLead.website}
                    <ExternalLink size={11} />
                  </a>
                )}
                {selectedLead.source_url && (
                  <a 
                    href={selectedLead.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    Fuente: {new URL(selectedLead.source_url).hostname || 'Directorio'}
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>

            {/* Navigation Tabs in Modal */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '10px' }}>
              <button
                onClick={() => setModalTab('profile')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: modalTab === 'profile' ? '1.5px solid var(--accent-mint)' : '1px solid transparent',
                  backgroundColor: modalTab === 'profile' ? 'rgba(0, 255, 163, 0.12)' : 'transparent',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <User size={14} /> Ficha & Calificación
              </button>

              <button
                onClick={() => setModalTab('research')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: modalTab === 'research' ? '1.5px solid var(--accent-mint)' : '1px solid transparent',
                  backgroundColor: modalTab === 'research' ? 'rgba(0, 255, 163, 0.12)' : 'transparent',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={14} /> Deep Research
              </button>

              <button
                onClick={() => setModalTab('outreach')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: modalTab === 'outreach' ? '1.5px solid var(--accent-mint)' : '1px solid transparent',
                  backgroundColor: modalTab === 'outreach' ? 'rgba(0, 255, 163, 0.12)' : 'transparent',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <MessageSquare size={14} /> Mensajes de Salida
              </button>
            </div>

            {/* TAB 1: Profile & Qualification */}
            {modalTab === 'profile' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Contact Information */}
                <div>
                  <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>
                    Contacto Identificado
                  </h4>
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-light)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Nombre del Contacto:</span>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {selectedLead.contact_name || 'No especificado'}
                      </span>
                    </div>

                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cargo / Rol:</span>
                      <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {selectedLead.contact_role || 'No especificado'}
                      </span>
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '2px' }}>Email de Contacto:</span>
                      {selectedLead.contact_email ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <a href={`mailto:${selectedLead.contact_email}`} style={{ fontWeight: 700, fontSize: '0.92rem', color: '#4f46e5', textDecoration: 'none' }}>
                            {selectedLead.contact_email}
                          </a>
                          <button
                            onClick={() => handleCopy(selectedLead.contact_email || '', 'email')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                            title="Copiar email"
                          >
                            {copiedKey === 'email' ? <Check size={14} style={{ color: '#059669' }} /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin correo directo registrado</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Validation Status Box */}
                <div style={{ 
                  backgroundColor: selectedLead.validation_status === 'QUALIFIED' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)', 
                  borderRadius: '12px', 
                  padding: '16px',
                  border: `1px solid ${selectedLead.validation_status === 'QUALIFIED' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={18} style={{ color: selectedLead.validation_status === 'QUALIFIED' ? '#059669' : '#d97706' }} />
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                        Estatus de Validación: {selectedLead.validation_status || 'UNVERIFIED'}
                      </strong>
                    </div>
                    {selectedLead.confidence_score !== undefined && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        Confianza: {Math.round((selectedLead.confidence_score || 0) * 100)}%
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.86rem', lineHeight: '1.5' }}>
                    {selectedLead.validation_reason || 'Prospecto procesado por el pipeline.'}
                  </p>
                </div>

                {/* Quick Status Changers */}
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Actualizar Estatus del Lead:
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['DISCOVERED', 'QUALIFIED', 'CONTACTED', 'RESPONDED', 'MEETING'].map((st) => (
                      <button
                        key={st}
                        onClick={async () => {
                          await updateLeadStatus(selectedLead.id, st);
                          setSelectedLead(prev => prev ? { ...prev, status: st } : null);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: selectedLead.status === st ? '1.5px solid var(--accent-mint)' : '1px solid var(--border-light)',
                          backgroundColor: selectedLead.status === st ? 'rgba(0, 255, 163, 0.15)' : '#fff',
                          color: selectedLead.status === st ? '#059669' : 'var(--text-primary)',
                          transition: 'var(--transition-smooth)'
                        }}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: Deep Research */}
            {modalTab === 'research' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>
                    Reporte de Deep Research
                  </h4>
                  <button
                    onClick={() => handleCopy(selectedLead.research_notes || '', 'notes')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-light)',
                      backgroundColor: '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {copiedKey === 'notes' ? <Check size={12} style={{ color: '#059669' }} /> : <Copy size={12} />}
                    {copiedKey === 'notes' ? 'Copiado' : 'Copiar Texto'}
                  </button>
                </div>

                <div style={{ 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '12px', 
                  padding: '20px', 
                  border: '1px solid var(--border-light)',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <p style={{ 
                    color: 'var(--text-primary)', 
                    fontSize: '0.88rem', 
                    lineHeight: '1.6', 
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedLead.research_notes || 'No se han registrado notas de investigación para este prospecto.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: Outreach Sequences */}
            {modalTab === 'outreach' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Email Draft */}
                <div style={{ border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', backgroundColor: '#f0f9ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={14} /> SECUENCIA DE EMAIL
                    </span>
                    {currentOutreach.email && (
                      <button
                        onClick={() => handleCopy(currentOutreach.email || '', 'copy_email')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {copiedKey === 'copy_email' ? <Check size={12} style={{ color: '#059669' }} /> : <Copy size={12} />}
                        {copiedKey === 'copy_email' ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: '1.5', margin: 0 }}>
                    {currentOutreach.email || 'Sin borrador de email generado.'}
                  </p>
                </div>

                {/* WhatsApp Draft */}
                <div style={{ border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', backgroundColor: '#f0fdf4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={14} /> MENSAJE DE WHATSAPP
                    </span>
                    {currentOutreach.whatsapp && (
                      <button
                        onClick={() => handleCopy(currentOutreach.whatsapp || '', 'copy_wa')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '4px 8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {copiedKey === 'copy_wa' ? <Check size={12} style={{ color: '#059669' }} /> : <Copy size={12} />}
                        {copiedKey === 'copy_wa' ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: '1.5', margin: 0 }}>
                    {currentOutreach.whatsapp || 'Sin borrador de WhatsApp generado.'}
                  </p>
                </div>

                {/* LinkedIn Draft */}
                <div style={{ border: '1px solid #ddd6fe', borderRadius: '12px', padding: '16px', backgroundColor: '#faf5ff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Send size={14} /> MENSAJE DE LINKEDIN
                    </span>
                    {currentOutreach.linkedin && (
                      <button
                        onClick={() => handleCopy(currentOutreach.linkedin || '', 'copy_li')}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #ddd6fe', borderRadius: '6px', padding: '4px 8px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        {copiedKey === 'copy_li' ? <Check size={12} style={{ color: '#059669' }} /> : <Copy size={12} />}
                        {copiedKey === 'copy_li' ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                  </div>
                  <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: '1.5', margin: 0 }}>
                    {currentOutreach.linkedin || 'Sin borrador de LinkedIn generado.'}
                  </p>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default LeedsList;
