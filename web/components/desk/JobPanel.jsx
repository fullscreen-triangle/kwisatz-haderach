import { useState } from 'react';
import s from '../../styles/desk.module.css';

const STATUS_OPTIONS = ['saved', 'applied', 'interview', 'offer', 'rejected', 'withdrawn'];

const STATUS_BADGE = {
  saved:     s.badgeMuted,
  applied:   s.badgeInfo,
  interview: s.badgeWarning,
  offer:     s.badgeOk,
  rejected:  s.badgeDanger,
  withdrawn: s.badgeMuted,
};

const REC_COLOR = {
  apply:              '#4ade80',
  apply_with_caveats: '#fbbf24',
  stretch:            '#fb923c',
  skip:               '#f87171',
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

// ── Add application form ───────────────────────────────────────────────────

function AddApplicationForm({ onAdded }) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | error | done
  const [error, setError] = useState('');
  const [lastAdded, setLastAdded] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!url.trim().startsWith('http')) return;
    setStatus('loading');
    setError('');
    try {
      const res = await fetch('/api/desk/jobs/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus('error');
        setError(data.error || 'Analysis failed');
      } else {
        setLastAdded(data.app);
        setUrl('');
        setStatus('done');
        onAdded();
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  }

  return (
    <div className={s.addAppForm}>
      <div className={s.scanLabel}>Add job posting</div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <input
          type="text"
          className={s.urlInput}
          placeholder="https://jobs.example.com/..."
          value={url}
          onChange={e => { setUrl(e.target.value); if (status !== 'idle') setStatus('idle'); }}
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          className={`${s.btn} ${s.btnPrimary}`}
          disabled={status === 'loading' || !url.startsWith('http')}
        >
          {status === 'loading' ? '…' : 'Analyse'}
        </button>
      </form>
      {status === 'loading' && (
        <div style={{ fontSize: 11, color: '#555', marginTop: 6, lineHeight: 1.6 }}>
          Fetching · scoring · generating LaTeX documents — 30–90 seconds
        </div>
      )}
      {status === 'error' && (
        <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>{error}</div>
      )}
      {status === 'done' && lastAdded && (
        <div style={{ fontSize: 11, color: '#4ade80', marginTop: 6 }}>
          ✓ {lastAdded.title} @ {lastAdded.company} — {lastAdded.score}/100 ({lastAdded.recommendation?.replace(/_/g,' ')})
        </div>
      )}
    </div>
  );
}

// ── Pipeline stats ─────────────────────────────────────────────────────────

function PipelineStats({ jobs }) {
  if (!jobs || jobs.length === 0) return null;
  const by = {};
  for (const j of jobs) by[j.status] = (by[j.status] || 0) + 1;
  const scores = jobs.map(j => j.score);
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const topScore = Math.max(...scores);

  return (
    <div className={s.pipelineStats}>
      {[['applied', '#60a5fa'], ['interview', '#fbbf24'], ['offer', '#4ade80']].map(([st, color]) => (
        <div key={st} className={s.statCell}>
          <span style={{ color, fontWeight: 700, fontSize: 20 }}>{by[st] || 0}</span>
          <span className={s.statLabel}>{st}</span>
        </div>
      ))}
      <div className={s.statCell}>
        <span style={{ color: '#888', fontWeight: 700, fontSize: 20 }}>{avgScore}</span>
        <span className={s.statLabel}>avg score</span>
      </div>
      <div className={s.statCell}>
        <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 20 }}>{topScore}</span>
        <span className={s.statLabel}>best match</span>
      </div>
    </div>
  );
}

// ── Job card ───────────────────────────────────────────────────────────────

function JobCard({ job, onUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function changeStatus(e) {
    setUpdating(true);
    await fetch('/api/desk/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: job.id, status: e.target.value }),
    });
    setUpdating(false);
    onUpdated();
  }

  async function loadDetail() {
    if (detail) { setDetail(null); return; }
    setLoadingDetail(true);
    setDetail(await fetch(`/api/desk/jobs?id=${job.id}`).then(r => r.json()));
    setLoadingDetail(false);
  }

  const scoreColor = job.score >= 70 ? '#4ade80' : job.score >= 55 ? '#fbbf24' : '#fb923c';

  return (
    <div className={s.jobCard}>
      <div className={s.jobTitle}>{job.title}</div>
      <div className={s.jobCompany}>{job.company} · {job.date}</div>

      <div className={s.jobScore} style={{ color: scoreColor }}>
        {job.score}/100
        {job.recommendation && (
          <span style={{ color: REC_COLOR[job.recommendation], marginLeft: 8, fontSize: 11 }}>
            {job.recommendation.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <div className={s.scoreBar}>
        <div className={s.scoreBarFill} style={{ width: `${job.score}%`, background: scoreColor }} />
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        <span className={`${s.badge} ${STATUS_BADGE[job.status] || s.badgeMuted}`}>{job.status}</span>
        <select className={s.statusSelect} value={job.status} onChange={changeStatus} disabled={updating}>
          {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <button className={s.btn} onClick={loadDetail} disabled={loadingDetail}>
          {loadingDetail ? '…' : detail ? 'Hide' : 'Details'}
        </button>
      </div>

      {detail && (
        <div style={{ marginTop: 10 }}>
          {detail.job && (
            <div className={s.docNote}>
              <strong style={{ color: '#555' }}>Stack:</strong>{' '}
              {(detail.job.tech_stack || []).join(', ') || '—'}
              {detail.job.salary_raw && (
                <><br /><strong style={{ color: '#555' }}>Salary:</strong> {detail.job.salary_raw}</>
              )}
            </div>
          )}
          {detail.financials && (
            <div className={s.docNote}>
              <strong style={{ color: '#555' }}>Net:</strong>{' '}
              €{Math.round(detail.financials.net_monthly).toLocaleString()}/mo
              {(detail.financials.cities || []).slice(0, 2).map(c => (
                <span key={c.city} style={{ marginLeft: 8, color: '#444' }}>
                  {c.city} €{Math.round(c.disposable_mid).toLocaleString()} disp.
                </span>
              ))}
            </div>
          )}
          {detail.assessment?.notes && (
            <div className={s.docNote} style={{ marginTop: 4 }}>
              {detail.assessment.notes.slice(0, 3).map((n, i) => (
                <div key={i} style={{ color: '#555', marginBottom: 2 }}>· {n}</div>
              ))}
            </div>
          )}
          {detail.narrative && (
            <div className={s.docNote} style={{ fontStyle: 'italic', color: '#555', marginTop: 6 }}>
              {detail.narrative.slice(0, 280)}…
            </div>
          )}

          {(detail.resumetex || detail.cover_lettertex || detail.resumemd || detail.cover_lettermd) && (
            <div className={s.btnGroup} style={{ marginTop: 8, flexWrap: 'wrap' }}>
              {detail.resumetex && (
                <button className={`${s.btn} ${s.btnPrimary}`}
                  onClick={() => openCodeWindow(detail.resumetex, `resume.tex — ${job.company}`)}>
                  resume.tex
                </button>
              )}
              {detail.cover_lettertex && (
                <button className={`${s.btn} ${s.btnPrimary}`}
                  onClick={() => openCodeWindow(detail.cover_lettertex, `cover_letter.tex — ${job.company}`)}>
                  cover_letter.tex
                </button>
              )}
              {detail.resumemd && (
                <button className={s.btn}
                  onClick={() => openCodeWindow(detail.resumemd, `resume.md — ${job.company}`)}>
                  resume.md
                </button>
              )}
              {detail.cover_lettermd && (
                <button className={s.btn}
                  onClick={() => openCodeWindow(detail.cover_lettermd, `cover_letter.md — ${job.company}`)}>
                  cover_letter.md
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export default function JobPanel({ jobs, onUpdate }) {
  const active   = (jobs || []).filter(j => !['rejected', 'withdrawn'].includes(j.status));
  const archived = (jobs || []).filter(j =>  ['rejected', 'withdrawn'].includes(j.status));

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <span className={s.panelTitle}>Job pipeline</span>
        <span className={s.panelCount}>{active.length} active</span>
      </div>
      <div className={s.panelBody}>
        <AddApplicationForm onAdded={onUpdate} />
        <PipelineStats jobs={jobs} />

        {!jobs ? (
          <div className={s.loading}>Loading…</div>
        ) : (
          <>
            {active.length > 0 && (
              <>
                <div className={s.sectionHeading}>Active</div>
                {active.map(j => <JobCard key={j.id} job={j} onUpdated={onUpdate} />)}
              </>
            )}
            {archived.length > 0 && (
              <>
                <div className={s.sectionHeading}>Archived</div>
                {archived.map(j => <JobCard key={j.id} job={j} onUpdated={onUpdate} />)}
              </>
            )}
            {jobs.length === 0 && (
              <div className={s.empty}>No applications yet — paste a URL above.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
