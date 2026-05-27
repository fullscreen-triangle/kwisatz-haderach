import { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import s from '../../styles/desk.module.css';

const STATUS_OPTIONS = ['saved', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'];

const STATUS_BADGE = {
  saved: s.badgeMuted, applied: s.badgeInfo, interview: s.badgeWarning,
  offer: s.badgeOk, rejected: s.badgeDanger, withdrawn: s.badgeMuted,
};

const REC_COLOR = {
  apply: '#4ade80', apply_with_caveats: '#fbbf24', stretch: '#fb923c', skip: '#f87171',
};

function openCodeWindow(content, title) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>body{margin:0;background:#0d0d0d;color:#d4d4d4;font-family:'Courier New',monospace;font-size:13px}
pre{padding:24px;margin:0;white-space:pre-wrap;word-break:break-word;line-height:1.6}
.bar{position:sticky;top:0;background:#111;padding:8px 16px;display:flex;gap:10px;align-items:center;border-bottom:1px solid #222}
button{background:#1e1e1e;border:1px solid #333;color:#aaa;padding:4px 12px;cursor:pointer;border-radius:4px;font-size:12px}
button:hover{background:#2a2a2a}</style></head><body>
<div class="bar">
  <button onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent)">Copy</button>
  <span style="color:#555;font-size:11px">${title}</span>
</div>
<pre>${content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
</body></html>`);
}

// ── Add form ────────────────────────────────────────────────────────────────

function AddJobForm({ onAdded }) {
  const [url,    setUrl]    = useState('');
  const [status, setStatus] = useState('idle');
  const [error,  setError]  = useState('');
  const [last,   setLast]   = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!url.trim().startsWith('http')) return;
    setStatus('loading'); setError('');
    try {
      const res  = await fetch('/api/desk/jobs/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) });
      const data = await res.json();
      if (!res.ok || data.error) { setStatus('error'); setError(data.error || 'Analysis failed'); }
      else { setLast(data.app); setUrl(''); setStatus('done'); onAdded(); }
    } catch (err) { setStatus('error'); setError(err.message); }
  }

  return (
    <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '28px 28px', marginBottom: 40 }}>
      <div style={{ fontFamily: 'var(--heading-font)', fontSize: 15, fontWeight: 600, color: 'var(--heading-color)', marginBottom: 16 }}>
        Analyse a job posting
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 10 }}>
        <input type="text" className={s.urlInput} placeholder="https://jobs.example.com/..." value={url}
          onChange={e => { setUrl(e.target.value); if (status !== 'idle') setStatus('idle'); }}
          disabled={status === 'loading'}
          style={{ flex: 1 }}
        />
        <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ padding: '8px 20px', fontSize: 13 }}
          disabled={status === 'loading' || !url.startsWith('http')}>
          {status === 'loading' ? 'Analysing…' : 'Analyse'}
        </button>
      </form>
      {status === 'loading' && (
        <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.45, marginTop: 10 }}>
          Fetching posting · scoring against profile · generating LaTeX resume and cover letter — 30–90 seconds
        </div>
      )}
      {status === 'error' && <div style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>{error}</div>}
      {status === 'done' && last && (
        <div style={{ fontSize: 13, color: '#4ade80', marginTop: 10 }}>
          ✓ {last.title} @ {last.company} — {last.score}/100 ({last.recommendation?.replace(/_/g, ' ')})
        </div>
      )}
    </div>
  );
}

// ── Pipeline stats ──────────────────────────────────────────────────────────

function PipelineStats({ jobs }) {
  if (!jobs || jobs.length === 0) return null;
  const by       = {};
  for (const j of jobs) by[j.status] = (by[j.status] || 0) + 1;
  const scores   = jobs.map(j => j.score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const topScore = Math.max(...scores);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 40 }}>
      {[
        { n: by['applied']   || 0, label: 'applied',   color: '#60a5fa' },
        { n: by['interview'] || 0, label: 'interview',  color: '#fbbf24' },
        { n: by['offer']     || 0, label: 'offer',      color: '#4ade80' },
        { n: avgScore,             label: 'avg match',  color: 'var(--font-color)' },
        { n: topScore,             label: 'best match', color: '#4ade80' },
      ].map(({ n, label, color }) => (
        <div key={label} style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '18px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--heading-font)', fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{n}</div>
          <div style={{ fontSize: 10, color: 'var(--font-color)', opacity: 0.35, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Job card ────────────────────────────────────────────────────────────────

function JobCard({ job, onUpdated }) {
  const [updating, setUpdating]           = useState(false);
  const [detail,   setDetail]             = useState(null);
  const [loading,  setLoading]            = useState(false);

  const scoreColor = job.score >= 70 ? '#4ade80' : job.score >= 55 ? '#fbbf24' : '#fb923c';

  async function changeStatus(e) {
    setUpdating(true);
    await fetch('/api/desk/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appId: job.id, status: e.target.value }) });
    setUpdating(false); onUpdated();
  }

  async function loadDetail() {
    if (detail) { setDetail(null); return; }
    setLoading(true);
    setDetail(await fetch(`/api/desk/jobs?id=${job.id}`).then(r => r.json()));
    setLoading(false);
  }

  return (
    <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '22px 24px' }}>
      <div style={{ fontFamily: 'var(--heading-font)', fontSize: 16, fontWeight: 700, color: 'var(--heading-color)', marginBottom: 4 }}>{job.title}</div>
      <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.4, marginBottom: 14 }}>{job.company} · {job.date}</div>

      <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor, marginBottom: 4 }}>
        {job.score}/100
        {job.recommendation && (
          <span style={{ color: REC_COLOR[job.recommendation], marginLeft: 10, fontSize: 11, fontWeight: 400 }}>
            {job.recommendation.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <div style={{ height: 4, background: 'var(--bg-color)', borderRadius: 2, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ width: `${job.score}%`, height: '100%', background: scoreColor, borderRadius: 2 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className={`${s.badge} ${STATUS_BADGE[job.status] || s.badgeMuted}`}>{job.status}</span>
        <select className={s.statusSelect} value={job.status} onChange={changeStatus} disabled={updating}>
          {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <button className={s.btn} onClick={loadDetail} disabled={loading}>{loading ? '…' : detail ? 'Hide' : 'Details'}</button>
      </div>

      {detail && (
        <div style={{ marginTop: 16 }}>
          {detail.job && (
            <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.5, marginBottom: 8, lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--font-color)', opacity: 0.7 }}>Stack:</strong> {(detail.job.tech_stack || []).join(', ') || '—'}
              {detail.job.salary_raw && <><br /><strong style={{ opacity: 0.7 }}>Salary:</strong> {detail.job.salary_raw}</>}
            </div>
          )}
          {detail.financials && (
            <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.5, marginBottom: 8 }}>
              <strong style={{ opacity: 0.7 }}>Net:</strong> €{Math.round(detail.financials.net_monthly).toLocaleString()}/mo
              {(detail.financials.cities || []).slice(0, 2).map(c => (
                <span key={c.city} style={{ marginLeft: 10 }}>{c.city} €{Math.round(c.disposable_mid).toLocaleString()} disp.</span>
              ))}
            </div>
          )}
          {detail.assessment?.notes && (
            <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.45, lineHeight: 1.6, marginBottom: 12 }}>
              {detail.assessment.notes.slice(0, 3).map((n, i) => <div key={i}>· {n}</div>)}
            </div>
          )}
          {detail.narrative && (
            <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.4, fontStyle: 'italic', marginBottom: 12, lineHeight: 1.6 }}>
              {detail.narrative.slice(0, 300)}…
            </div>
          )}
          {(detail.resumetex || detail.cover_lettertex || detail.resumemd || detail.cover_lettermd) && (
            <div className={s.btnGroup}>
              {detail.resumetex && (
                <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => openCodeWindow(detail.resumetex, `resume.tex — ${job.company}`)}>resume.tex</button>
              )}
              {detail.cover_lettertex && (
                <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => openCodeWindow(detail.cover_lettertex, `cover_letter.tex — ${job.company}`)}>cover_letter.tex</button>
              )}
              {detail.resumemd && (
                <button className={s.btn} onClick={() => openCodeWindow(detail.resumemd, `resume.md — ${job.company}`)}>resume.md</button>
              )}
              {detail.cover_lettermd && (
                <button className={s.btn} onClick={() => openCodeWindow(detail.cover_lettermd, `cover_letter.md — ${job.company}`)}>cover_letter.md</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function JobsPage() {
  const [jobs, setJobs] = useState(null);
  const fetch_ = useCallback(() => fetch('/api/desk/jobs').then(r => r.json()).then(setJobs), []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const active   = (jobs || []).filter(j => !['rejected', 'withdrawn'].includes(j.status));
  const archived = (jobs || []).filter(j =>  ['rejected', 'withdrawn'].includes(j.status));

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Jobs — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Desk · Jobs</span>
        </p>
        <h1 className="title text-uppercase">Job Pipeline</h1>
        {jobs && (
          <p style={{ color: 'var(--font-color)', opacity: 0.4, fontSize: 13, marginTop: 12 }}>
            {active.length} active · {archived.length} archived
          </p>
        )}
      </HeaderNormal>

      <section className="container section-margin" data-dsn-title="Add">
        <AddJobForm onAdded={fetch_} />
        <PipelineStats jobs={jobs} />
      </section>

      {!jobs ? (
        <section className="container"><div style={{ color: 'var(--font-color)', opacity: 0.4 }}>Loading…</div></section>
      ) : (
        <>
          {active.length > 0 && (
            <section className="container section-margin" data-dsn-title="Active">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 24 }}>
                Active ({active.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                {active.map(j => <JobCard key={j.id} job={j} onUpdated={fetch_} />)}
              </div>
            </section>
          )}

          {archived.length > 0 && (
            <section className="container section-margin" data-dsn-title="Archived">
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 24 }}>
                Archived ({archived.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20, opacity: 0.55 }}>
                {archived.map(j => <JobCard key={j.id} job={j} onUpdated={fetch_} />)}
              </div>
            </section>
          )}

          {jobs.length === 0 && (
            <section className="container">
              <div style={{ color: 'var(--font-color)', opacity: 0.35, fontSize: 14 }}>No applications yet — paste a job URL above.</div>
            </section>
          )}
        </>
      )}

      <Footer className="background-section" />
    </Layout>
  );
}
