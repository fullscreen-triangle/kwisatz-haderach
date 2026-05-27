import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../layout/Layout';
import HeaderNormal from '../components/header/HeaderNormal';
import Footer from '../components/footer/Footer';
import TitleSection from '../components/heading/TitleSection';

function deriveAlerts(docs) {
  const alerts = [];
  if (!docs) return alerts;
  for (const doc of Object.values(docs)) {
    if (doc.urgency === 'expired') {
      alerts.push({
        level: 'danger',
        message: `${doc.name} EXPIRED (${doc.expiryDate || 'date unknown'}).`,
        action: doc.typeId === 'PASSPORT'
          ? 'Zimbabwe Embassy Berlin — +49 30 206 2263'
          : 'Ausländerbehörde — request Fiktionsbescheinigung',
      });
    } else if (doc.urgency === 'overdue') {
      alerts.push({ level: 'danger', message: `${doc.name} past renewal deadline.`, action: 'Apply now' });
    } else if (doc.urgency === 'urgent') {
      alerts.push({ level: 'warning', message: `${doc.name} renewal due within 30 days.`, action: 'Start process' });
    }
  }
  return alerts;
}

export default function Desk() {
  const [docs,     setDocs]     = useState(null);
  const [jobs,     setJobs]     = useState(null);
  const [journals, setJournals] = useState(null);
  const [academic, setAcademic] = useState(null);

  useEffect(() => {
    fetch('/api/desk/documents').then(r => r.json()).then(setDocs);
    fetch('/api/desk/jobs').then(r => r.json()).then(setJobs);
    fetch('/api/desk/journals').then(r => r.json()).then(setJournals);
    fetch('/api/desk/academic').then(r => r.json()).then(setAcademic).catch(() => {});
  }, []);

  const alerts   = deriveAlerts(docs);
  const today    = new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const expiredDocs     = Object.values(docs || {}).filter(d => d.urgency === 'expired' || d.urgency === 'overdue').length;
  const activeJobs      = (jobs  || []).filter(j => !['rejected','withdrawn'].includes(j.status)).length;
  const pendingJournals = (journals || []).filter(e => e.status === 'pending').length;
  const totalCitations  = academic?.author?.cited_by ?? null;

  const tools = [
    {
      href:    '/desk/documents',
      title:   'Documents',
      sub:     'Passport · Aufenthaltserlaubnis',
      stat:    docs   ? `${Object.values(docs).length} tracked` : '…',
      urgent:  expiredDocs > 0,
      urgentLabel: expiredDocs > 0 ? `${expiredDocs} require action` : null,
      color:   expiredDocs > 0 ? '#f87171' : '#34d399',
    },
    {
      href:    '/desk/inbox',
      title:   'Inbox',
      sub:     'Email intelligence · Journal tracker',
      stat:    journals ? `${pendingJournals} pending decisions` : '…',
      urgent:  false,
      color:   '#14bfb5',
    },
    {
      href:    '/desk/jobs',
      title:   'Jobs',
      sub:     'Applications · Scores · Documents',
      stat:    jobs ? `${activeJobs} active` : '…',
      urgent:  false,
      color:   '#60a5fa',
    },
    {
      href:    '/desk/academic',
      title:   'Academic',
      sub:     'Publications · Citations · h-index',
      stat:    academic ? `${academic.author?.works_count ?? 0} papers · ${totalCitations} citations` : '…',
      urgent:  false,
      color:   '#a78bfa',
    },
    {
      href:    '/desk/repos',
      title:   'Repos',
      sub:     'crossfilter · 17 linked charts · S-coords',
      stat:    '63 repos',
      urgent:  false,
      color:   '#fb923c',
    },
  ];

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Personal Dashboard</span>
        </p>
        <h1 className="title text-uppercase">Desk</h1>
        <p style={{ opacity: 0.4, fontSize: 13, marginTop: 12 }}>{today}</p>
      </HeaderNormal>

      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="container" style={{ marginBottom: 40 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '12px 18px', borderRadius: 6, marginBottom: 8,
              background: a.level === 'danger' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${a.level === 'danger' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
              color: a.level === 'danger' ? '#fca5a5' : '#fcd34d',
              fontSize: 13, lineHeight: 1.6,
            }}>
              <span>{a.level === 'danger' ? '🚨' : '⚠️'}</span>
              <span>{a.message}</span>
              {a.action && <span style={{ opacity: 0.6, marginLeft: 'auto', flexShrink: 0 }}>→ {a.action}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Tool navigation cards */}
      <section className="container section-margin" data-dsn-title="Tools">
        <TitleSection description="Personal tools" defaultSpace={false} className="mb-section">
          Your workspace
        </TitleSection>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24, marginTop: 40 }}>
          {tools.map(tool => (
            <Link key={tool.href} href={tool.href} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--assistant-color, #101010)',
                border: `1px solid ${tool.urgent ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 10,
                padding: '32px 28px',
                cursor: 'pointer',
                transition: 'border-color 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = tool.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = tool.urgent ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ width: 40, height: 3, background: tool.color, borderRadius: 2, marginBottom: 20 }} />
                <div style={{ fontFamily: 'var(--heading-font, Poppins)', fontSize: 22, fontWeight: 700, color: 'var(--heading-color, #fff)', marginBottom: 8 }}>
                  {tool.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--font-color, #bbb)', opacity: 0.5, marginBottom: 20 }}>
                  {tool.sub}
                </div>
                <div style={{ fontSize: 13, color: tool.color, fontWeight: 600 }}>
                  {tool.stat}
                  {tool.urgentLabel && <span style={{ color: '#f87171', marginLeft: 8 }}>· {tool.urgentLabel}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer className="background-section" />
    </Layout>
  );
}
