import { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import s from '../../styles/desk.module.css';

const STATUS_OPTIONS = ['todo', 'in_progress', 'done', 'blocked'];
const SUBTOOL_STATUS_OPTIONS = ['available', 'todo', 'in_progress', 'done', 'blocked'];

const STATUS_BADGE = {
  todo:        { label: 'TODO',        cls: s.badgeMuted },
  in_progress: { label: 'IN PROGRESS', cls: s.badgeInfo },
  done:        { label: 'DONE',        cls: s.badgeOk },
  blocked:     { label: 'BLOCKED',     cls: s.badgeDanger },
  available:   { label: 'AVAILABLE',   cls: s.badgeInfo },
};

const PROGRESS_CLS = (pct) => (pct >= 100 ? s.progressOk : pct > 0 ? s.progressWarning : s.progressDanger);

function Badge({ status }) {
  const b = STATUS_BADGE[status] || STATUS_BADGE.todo;
  return <span className={`${s.badge} ${b.cls}`}>{b.label}</span>;
}

// ── Milestone row ────────────────────────────────────────────────────────────

function MilestoneRow({ m, projectId, onUpdate }) {
  const [saving, setSaving] = useState(false);

  async function setStatus(status) {
    setSaving(true);
    await fetch('/api/desk/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'milestone', projectId, milestoneId: m.id, status }),
    });
    setSaving(false);
    onUpdate();
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--heading-color)' }}>{m.title}</div>
        {m.notes && <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.4 }}>{m.notes}</div>}
      </div>
      <select
        value={m.status}
        disabled={saving}
        onChange={e => setStatus(e.target.value)}
        style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}
      >
        {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <Badge status={m.status} />
    </div>
  );
}

// ── Sub-tool row ─────────────────────────────────────────────────────────────

function SubtoolRow({ st, projectId, onUpdate }) {
  const [saving, setSaving] = useState(false);

  async function setStatus(status) {
    setSaving(true);
    await fetch('/api/desk/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'subtool', projectId, subtoolId: st.id, status }),
    });
    setSaving(false);
    onUpdate();
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--heading-color)' }}>
          {st.repo ? <a href={st.repo} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{st.name}</a> : st.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.4 }}>{st.role}</div>
      </div>
      <select
        value={st.status}
        disabled={saving}
        onChange={e => setStatus(e.target.value)}
        style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}
      >
        {SUBTOOL_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <Badge status={st.status} />
    </div>
  );
}

// ── Log feed ─────────────────────────────────────────────────────────────────

function LogFeed({ log, projectId, onUpdate }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function addEntry() {
    if (!text.trim()) return;
    setSaving(true);
    await fetch('/api/desk/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'log', projectId, text: text.trim() }),
    });
    setText('');
    setSaving(false);
    onUpdate();
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEntry()}
          placeholder="Log an update…"
          style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)', padding: '6px 10px', borderRadius: 4, fontSize: 13 }}
        />
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={addEntry} disabled={saving}>
          {saving ? '…' : 'Add'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
        {[...log].reverse().map((e, i) => (
          <div key={i} style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.6 }}>
            <span style={{ opacity: 0.5 }}>{e.date}</span> — {e.entry}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onUpdate }) {
  const { report } = project;
  const layers = Object.entries(report.by_layer);

  return (
    <div style={{
      background: 'var(--assistant-color, #101010)',
      border: `1px solid ${report.blocked.length ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 10, padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'var(--heading-font)', fontSize: 18, fontWeight: 700, color: 'var(--heading-color)', marginBottom: 4 }}>
            {project.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.4 }}>{project.context}</div>
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--heading-color)' }}>{report.percent_done}%</span>
      </div>

      <div className={s.progress}>
        <div className={`${s.progressBar} ${PROGRESS_CLS(report.percent_done)}`} style={{ width: `${report.percent_done}%` }} />
      </div>

      {report.blocked.length > 0 && (
        <div style={{ fontSize: 12, color: '#f87171' }}>🚨 Blocked: {report.blocked.join(', ')}</div>
      )}

      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 8 }}>
          Milestones by layer
        </div>
        {layers.map(([layer, counts]) => (
          <div key={layer} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--font-color)', opacity: 0.5, marginBottom: 4 }}>
              {layer} ({counts.done}/{counts.total})
            </div>
            {project.milestones.filter(m => (m.layer || 'general') === layer).map(m => (
              <MilestoneRow key={m.id} m={m} projectId={project.id} onUpdate={onUpdate} />
            ))}
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 8 }}>
          Sub-tools
        </div>
        {project.subtools.map(st => (
          <SubtoolRow key={st.id} st={st} projectId={project.id} onUpdate={onUpdate} />
        ))}
      </div>

      <div>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 8 }}>
          Log
        </div>
        <LogFeed log={project.log} projectId={project.id} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [data, setData] = useState(null);
  const fetch_ = useCallback(() => fetch('/api/desk/projects').then(r => r.json()).then(setData), []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const projects = data?.projects || [];
  const blockedCount = projects.reduce((n, p) => n + p.report.blocked.length, 0);

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Projects — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Desk · Projects</span>
        </p>
        <h1 className="title text-uppercase">Projects</h1>
        {blockedCount > 0 && (
          <p style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>
            🚨 {blockedCount} milestone{blockedCount > 1 ? 's' : ''} blocked
          </p>
        )}
      </HeaderNormal>

      <section className="container section-margin" data-dsn-title="Projects">
        {!data ? (
          <div style={{ color: 'var(--font-color)', opacity: 0.4 }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 24 }}>
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} onUpdate={fetch_} />
            ))}
          </div>
        )}
      </section>

      <Footer className="background-section" />
    </Layout>
  );
}
