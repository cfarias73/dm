import React, { useState, useMemo } from 'react';
import { useApp, Lead } from '../App';
import { 
  Globe, 
  Landmark, 
  ShieldAlert, 
  FileText, 
  ExternalLink, 
  Search, 
  Building2, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Copy, 
  Check, 
  Layers, 
  Info,
  MapPin,
  Mail,
  Compass,
  ArrowUpRight
} from 'lucide-react';

interface ParsedSection {
  id: string;
  title: string;
  type: 'business_model' | 'size' | 'pain_points' | 'general';
  isVerified: boolean;
  intro?: string;
  bullets: Array<{ title?: string; content: string }>;
  paragraphs: string[];
}

// Utility to render inline markdown-like bold text and status chips safely
const renderFormattedText = (text: string): React.ReactNode => {
  if (!text) return null;

  // Split by bold tokens **...**
  const parts = text.split(/(\*\*.*?\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2);
      
      if (inner.toLowerCase().includes('no verificado')) {
        return (
          <span 
            key={index} 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#d97706',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              margin: '0 4px',
              verticalAlign: 'middle'
            }}
          >
            <AlertTriangle size={12} />
            No verificado
          </span>
        );
      }

      return (
        <strong key={index} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
          {inner}
        </strong>
      );
    }

    return part;
  });
};

// Parser to turn raw markdown research notes into structured UI sections
const parseResearchNotes = (rawNotes?: string): { headerTitle?: string; sections: ParsedSection[] } => {
  if (!rawNotes || !rawNotes.trim()) {
    return {
      sections: [
        {
          id: 'default',
          title: 'Resumen de Investigación',
          type: 'general',
          isVerified: false,
          paragraphs: ['Sin notas de investigación disponibles para este lead.'],
          bullets: []
        }
      ]
    };
  }

  const text = rawNotes.trim();
  let headerTitle: string | undefined;

  // Check if text has markdown headings ## or numbered items
  const lines = text.split('\n');
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    // Header like # Análisis: Café Tenango
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      headerTitle = line.replace(/^#\s*/, '').replace(/^[A-ZáéíóúÁÉÍÓÚ\s]+:\s*/i, '');
      continue;
    }

    // Section header like ## 1. Modelo de negocio or ## Modelo de negocio
    const isHeading2 = line.startsWith('## ');
    const isHeading3 = line.startsWith('### ');
    const isNumberedHeader = /^\d+\.\s+[A-Za-zÁÉÍÓÚáéíóú]/.test(line) && !line.includes('(') && line.length < 60;

    if (isHeading2 || isHeading3 || isNumberedHeader) {
      if (currentSection) {
        sections.push(currentSection);
      }

      let title = line
        .replace(/^##\s*/, '')
        .replace(/^###\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .trim();

      const lowerTitle = title.toLowerCase();
      let type: ParsedSection['type'] = 'general';
      if (lowerTitle.includes('modelo') || lowerTitle.includes('negocio') || lowerTitle.includes('propuesta')) {
        type = 'business_model';
      } else if (lowerTitle.includes('tamaño') || lowerTitle.includes('capacidad') || lowerTitle.includes('empleados') || lowerTitle.includes('aforo')) {
        type = 'size';
      } else if (lowerTitle.includes('pain point') || lowerTitle.includes('dolor') || lowerTitle.includes('problema') || lowerTitle.includes('oportunidad')) {
        type = 'pain_points';
      }

      currentSection = {
        id: `sec-${sections.length}-${type}`,
        title,
        type,
        isVerified: true,
        paragraphs: [],
        bullets: []
      };
      continue;
    }

    // If we have not started a section yet, initialize a default one
    if (!currentSection) {
      currentSection = {
        id: 'sec-initial',
        title: 'Hallazgos de Investigación',
        type: 'general',
        isVerified: true,
        paragraphs: [],
        bullets: []
      };
    }

    // Bullet point
    if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('• ')) {
      const bulletText = line.replace(/^[-*•]\s*/, '').trim();
      
      // Check if bullet has bold sub-title like **Café de especialidad**: details...
      const match = bulletText.match(/^\*\*(.*?)\*\*:\s*(.*)$/);
      if (match) {
        currentSection.bullets.push({
          title: match[1],
          content: match[2]
        });
      } else {
        currentSection.bullets.push({
          content: bulletText
        });
      }
      continue;
    }

    // Normal paragraph line
    if (line.toLowerCase().includes('no verificado') && currentSection.paragraphs.length === 0 && currentSection.bullets.length === 0) {
      currentSection.isVerified = false;
    }
    
    currentSection.paragraphs.push(line);
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // If no structured sections were created, fallback
  if (sections.length === 0) {
    sections.push({
      id: 'sec-fallback',
      title: 'Resumen Ejecutivo',
      type: 'general',
      isVerified: !text.toLowerCase().includes('no verificado'),
      paragraphs: [text],
      bullets: []
    });
  }

  return { headerTitle, sections };
};

const DeepResearch: React.FC = () => {
  const { activeCampaign, leads } = useApp();
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'report' | 'technical'>('report');

  const campaignLeads = useMemo(() => {
    return activeCampaign 
      ? leads.filter(l => l.campaign_id === activeCampaign.id) 
      : leads;
  }, [activeCampaign, leads]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return campaignLeads;
    const q = searchTerm.toLowerCase();
    return campaignLeads.filter(l => 
      l.company_name.toLowerCase().includes(q) || 
      (l.website && l.website.toLowerCase().includes(q))
    );
  }, [campaignLeads, searchTerm]);

  const currentLead: Lead | undefined = 
    campaignLeads.find(l => l.id === selectedLeadId) || filteredLeads[0] || campaignLeads[0];

  const parsedReport = useMemo(() => {
    return parseResearchNotes(currentLead?.research_notes);
  }, [currentLead?.research_notes]);

  const handleCopyNotes = () => {
    if (!currentLead) return;
    navigator.clipboard.writeText(currentLead.research_notes || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSectionIcon = (type: ParsedSection['type']) => {
    switch (type) {
      case 'business_model':
        return <Landmark size={18} style={{ color: '#6366f1' }} />;
      case 'size':
        return <Users size={18} style={{ color: '#0284c7' }} />;
      case 'pain_points':
        return <ShieldAlert size={18} style={{ color: '#ef4444' }} />;
      default:
        return <Sparkles size={18} style={{ color: 'var(--accent-mint)' }} />;
    }
  };

  const getSectionTheme = (type: ParsedSection['type'], isVerified: boolean) => {
    if (!isVerified) {
      return {
        bgHeader: 'rgba(245, 158, 11, 0.05)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        badgeBg: 'rgba(245, 158, 11, 0.1)',
        badgeColor: '#b45309',
        badgeText: 'Evidencia Limitada'
      };
    }
    switch (type) {
      case 'business_model':
        return {
          bgHeader: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.18)',
          badgeBg: 'rgba(99, 102, 241, 0.1)',
          badgeColor: '#4f46e5',
          badgeText: 'Modelo Detectado'
        };
      case 'size':
        return {
          bgHeader: 'rgba(2, 132, 199, 0.05)',
          border: '1px solid rgba(2, 132, 199, 0.18)',
          badgeBg: 'rgba(2, 132, 199, 0.1)',
          badgeColor: '#0284c7',
          badgeText: 'Capacidad Operativa'
        };
      case 'pain_points':
        return {
          bgHeader: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          badgeBg: 'rgba(239, 68, 68, 0.1)',
          badgeColor: '#dc2626',
          badgeText: 'Oportunidad Comercial'
        };
      default:
        return {
          bgHeader: 'rgba(0, 255, 163, 0.04)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          badgeBg: 'rgba(0, 255, 163, 0.15)',
          badgeColor: '#047857',
          badgeText: 'Verificado'
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Top Banner */}
      <div className="glass-panel" style={{ border: '1px solid rgba(255, 255, 255, 0.1)', padding: '22px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(0, 255, 163, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-mint)' }}>
              <Compass size={18} />
            </div>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.3rem', margin: 0 }}>
              Deep Research & Domain Intelligence
            </h2>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Investigación profunda autónoma, mapeo de oferta comercial y extracción de puntos de dolor mediante IA.
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setActiveTab('report')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'report' ? '1.5px solid var(--accent-mint)' : '1px solid var(--border-light)',
              backgroundColor: activeTab === 'report' ? 'rgba(0, 255, 163, 0.12)' : '#fff',
              color: 'var(--text-primary)',
              transition: 'var(--transition-smooth)'
            }}
          >
            <Layers size={14} style={{ color: activeTab === 'report' ? '#059669' : 'inherit' }} />
            Informe Estructurado
          </button>

          <button
            onClick={() => setActiveTab('technical')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'technical' ? '1.5px solid var(--accent-mint)' : '1px solid var(--border-light)',
              backgroundColor: activeTab === 'technical' ? 'rgba(0, 255, 163, 0.12)' : '#fff',
              color: 'var(--text-primary)',
              transition: 'var(--transition-smooth)'
            }}
          >
            <FileText size={14} />
            Metadatos Técnicos
          </button>
        </div>
      </div>

      {campaignLeads.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Compass size={48} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No hay datos de investigación disponibles
          </h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
            Ejecuta o selecciona una campaña activa para que el agente de investigación recopile información profunda de cada lead.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
          
          {/* Left Column: Leads Selection List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Search filter input */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text"
                placeholder="Buscar prospecto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#fff',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>

            {/* List container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredLeads.map((lead) => {
                const isSelected = lead.id === (currentLead?.id);
                const scoreColor = lead.score >= 70 ? '#059669' : lead.score >= 40 ? '#d97706' : '#64748b';
                
                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: isSelected ? '1.5px solid var(--accent-mint)' : '1px solid var(--border-light)',
                      backgroundColor: isSelected ? 'rgba(0, 255, 163, 0.08)' : '#fff',
                      boxShadow: isSelected ? '0 4px 12px rgba(0, 255, 163, 0.12)' : 'none',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                        {lead.company_name}
                      </span>
                      <span 
                        style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 800, 
                          color: scoreColor, 
                          backgroundColor: `${scoreColor}15`, 
                          padding: '2px 7px', 
                          borderRadius: '6px',
                          flexShrink: 0
                        }}
                      >
                        {lead.score}%
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Globe size={11} style={{ flexShrink: 0 }} />
                        {lead.website || 'Sin dominio'}
                      </span>
                      {lead.domain_verified && (
                        <span style={{ fontSize: '0.7rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <CheckCircle2 size={10} /> Verificado
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredLeads.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  No se encontraron resultados para "{searchTerm}"
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Detailed Research Analysis Content */}
          {currentLead && (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '28px' }}>
              
              {/* Lead Profile Header */}
              <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      {currentLead.company_name}
                    </h3>
                    {currentLead.prospect_band && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', backgroundColor: 'rgba(99, 102, 241, 0.12)', color: '#4f46e5' }}>
                        Banda {currentLead.prospect_band}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
                    {currentLead.website && (
                      <a 
                        href={`https://${currentLead.website.replace(/^https?:\/\//, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
                      >
                        <Globe size={13} />
                        {currentLead.website}
                        <ArrowUpRight size={12} />
                      </a>
                    )}

                    {currentLead.contact_name && (
                      <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={13} />
                        {currentLead.contact_name} {currentLead.contact_role ? `(${currentLead.contact_role})` : ''}
                      </span>
                    )}

                    {currentLead.contact_email && (
                      <span style={{ color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={13} />
                        {currentLead.contact_email}
                      </span>
                    )}
                  </div>
                </div>

                {/* Score and Quick Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    onClick={handleCopyNotes}
                    title="Copiar texto de investigación"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                      backgroundColor: '#fff',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {copied ? <Check size={14} style={{ color: '#059669' }} /> : <Copy size={14} />}
                    {copied ? 'Copiado' : 'Copiar Resumen'}
                  </button>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                      Score de Coincidencia
                    </span>
                    <span style={{ 
                      fontSize: '1.4rem', 
                      fontWeight: 900, 
                      color: 'var(--accent-mint)', 
                      backgroundColor: 'var(--bg-dark)', 
                      padding: '4px 12px', 
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                      {currentLead.score}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-view: Executive Report */}
              {activeTab === 'report' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Cards for each section extracted from DeepSeek research */}
                  {parsedReport.sections.map((sec) => {
                    const theme = getSectionTheme(sec.type, sec.isVerified);

                    return (
                      <div 
                        key={sec.id}
                        style={{
                          borderRadius: '14px',
                          border: theme.border,
                          backgroundColor: '#ffffff',
                          overflow: 'hidden',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
                        }}
                      >
                        {/* Section Header */}
                        <div style={{
                          padding: '14px 20px',
                          backgroundColor: theme.bgHeader,
                          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                              {getSectionIcon(sec.type)}
                            </div>
                            <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                              {sec.title}
                            </h4>
                          </div>

                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 9px',
                            borderRadius: '20px',
                            backgroundColor: theme.badgeBg,
                            color: theme.badgeColor,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {sec.isVerified ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                            {theme.badgeText}
                          </span>
                        </div>

                        {/* Section Body */}
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          
                          {/* Narrative Paragraphs */}
                          {sec.paragraphs.map((p, pIdx) => (
                            <p 
                              key={pIdx} 
                              style={{ 
                                fontSize: '0.88rem', 
                                color: 'var(--text-primary)', 
                                lineHeight: '1.6', 
                                margin: 0 
                              }}
                            >
                              {renderFormattedText(p)}
                            </p>
                          ))}

                          {/* Bullet Points list */}
                          {sec.bullets.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginTop: '4px' }}>
                              {sec.bullets.map((b, bIdx) => (
                                <div 
                                  key={bIdx}
                                  style={{
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    backgroundColor: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '10px'
                                  }}
                                >
                                  <div style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    backgroundColor: sec.type === 'pain_points' ? '#ef4444' : '#6366f1',
                                    marginTop: '7px',
                                    flexShrink: 0
                                  }} />
                                  <div style={{ fontSize: '0.84rem', lineHeight: '1.5', color: 'var(--text-primary)' }}>
                                    {b.title && (
                                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'inline', marginRight: '5px' }}>
                                        {b.title}:
                                      </span>
                                    )}
                                    <span>{renderFormattedText(b.content)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })}

                </div>
              )}

              {/* Sub-view: Technical Metadata & Scraping Diagnostics */}
              {activeTab === 'technical' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Verification Checklist */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Validación de Dominio</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: currentLead.domain_verified ? '#059669' : '#d97706', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {currentLead.domain_verified ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                        {currentLead.domain_verified ? 'Dominio Activo y Accesible' : 'Pendiente o Sin Verificar'}
                      </span>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Ubicación Geográfica</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: currentLead.location_verified ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={14} />
                        {currentLead.location_verified ? 'Ubicación Validada' : 'No verificada en sitio'}
                      </span>
                    </div>

                    <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: '#f8fafc', border: '1px solid var(--border-light)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Categoría de Negocio</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: currentLead.business_category_verified ? '#059669' : '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Building2 size={14} />
                        {currentLead.business_category_verified ? 'Alineada con ICP' : 'Genérica'}
                      </span>
                    </div>
                  </div>

                  {/* Raw Structured Notes / Code View */}
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '10px' }}>
                      <FileText size={16} style={{ color: 'var(--accent-mint)' }} />
                      Cuerpo Completo de Respuesta del Agente (Texto Plano)
                    </h4>
                    <pre style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      backgroundColor: '#1a1d20',
                      color: '#e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      overflowX: 'auto',
                      maxHeight: '350px'
                    }}>
                      {currentLead.research_notes || 'No hay notas sin procesar registradas.'}
                    </pre>
                  </div>

                  {/* Metadata Mock Crawler Object */}
                  <div>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', marginBottom: '10px' }}>
                      <Globe size={16} style={{ color: '#6366f1' }} />
                      Metadatos Extraídos del Rastreo Web
                    </h4>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      backgroundColor: '#111827',
                      color: '#38bdf8',
                      borderRadius: '10px',
                      padding: '16px',
                      lineHeight: '1.5',
                      whiteSpace: 'pre-wrap'
                    }}>
{`{
  "company_name": "${currentLead.company_name}",
  "website": "${currentLead.website}",
  "source_url": "${currentLead.source_url || `https://${currentLead.website}`}",
  "crawler_status": "${currentLead.domain_verified ? 'verified_active' : 'unverified'}",
  "qualification_score": ${currentLead.score},
  "prospect_band": "${currentLead.prospect_band || 'B'}",
  "research_agent": "DM DeepSeek Deep Research V2",
  "data_verified": ${currentLead.domain_verified ? true : false}
}`}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
};

export default DeepResearch;
