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
  apply:             '#4ade80',
  apply_with_caveats:'#fbbf24',
  stretch:           '#fb923c',
  skip:              '#f87171',
};

function JobCard({ job, onUpdated }) {
  const [updating, setUpdating] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  async function changeStatus(e) {
    const newStatus = e.target.value;
    setUpdating(true);
    await fetch('/api/desk/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: job.id, status: newStatus }),
    });
    setUpdating(false);
    onUpdated();
  }

  async function loadDetail() {
    if (detail) { setDetail(null); return; }
    setLoadingDetail(true);
    const res = await fetch(`/api/desk/jobs?id=${job.id}`);
    setDetail(await res.json());
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
          <span style={{ color: REC_COLOR[job.recommendation], marginLeft: 8 }}>
            {job.recommendation.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <div className={s.scoreBar}>
        <div className={s.scoreBarFill} style={{ width: `${job.score}%`, background: scoreColor }} />
      </div>

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
        <span className={`${s.badge} ${STATUS_BADGE[job.status] || s.badgeMuted}`}>
          {job.status}
        </span>
        <select
          className={s.statusSelect}
          value={job.status}
          onChange={changeStatus}
          disabled={updating}
        >
          {STATUS_OPTIONS.map(st => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>
        <button className={s.btn} onClick={loadDetail} disabled={loadingDetail}>
          {loadingDetail ? '…' : detail ? 'Hide' : 'Detail'}
        </button>
      </div>

      {detail && (
        <div style={{ marginTop: 10 }}>
          {detail.job && (
            <div className={s.docNote}>
              <strong style={{ color: '#666' }}>Stack:</strong>{' '}
              {(detail.job.tech_stack || []).join(', ') || '—'}
              {detail.job.salary_raw && (
                <><br /><strong style={{ color: '#666' }}>Salary:</strong> {detail.job.salary_raw}</>
              )}
            </div>
          )}
          {detail.financials && (
            <div className={s.docNote}>
              <strong style={{ color: '#666' }}>Net monthly:</strong>{' '}
              €{Math.round(detail.financials.net_monthly).toLocaleString()}
              {detail.financials.cities && detail.financials.cities.slice(0, 2).map(c => (
                <span key={c.city} style={{ marginLeft: 10 }}>
                  {c.city}: €{Math.round(c.disposable_mid).toLocaleString()}/mo disposable
                </span>
              ))}
            </div>
          )}
          {detail.assessment && detail.assessment.notes && (
            <div className={s.docNote} style={{ marginTop: 6 }}>
              {detail.assessment.notes.slice(0, 2).map((n, i) => (
                <div key={i} style={{ marginBottom: 2 }}>· {n}</div>
              ))}
            </div>
          )}
          {(detail.resumemd || detail.cover_lettermd) && (
            <div className={s.btnGroup} style={{ marginTop: 8 }}>
              {detail.resumemd && (
                <button className={`${s.btn} ${s.btnPrimary}`}
                  onClick={() => {
                    const w = window.open('', '_blank');
                    w.document.write(`<pre style="font-family:monospace;padding:20px;background:#111;color:#ddd">${detail.resumemd}</pre>`);
                  }}>
                  View resume
                </button>
              )}
              {detail.cover_lettermd && (
                <button className={`${s.btn} ${s.btnPrimary}`}
                  onClick={() => {
                    const w = window.open('', '_blank');
                    w.document.write(`<pre style="font-family:monospace;padding:20px;background:#111;color:#ddd">${detail.cover_lettermd}</pre>`);
                  }}>
                  View cover letter
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JobPanel({ jobs, onUpdate }) {
  const active = (jobs || []).filter(j => !['rejected', 'withdrawn'].includes(j.status));
  const archived = (jobs || []).filter(j => ['rejected', 'withdrawn'].includes(j.status));

  // Stats
  const byStatus = {};
  for (const j of jobs || []) {
    byStatus[j.status] = (byStatus[j.status] || 0) + 1;
  }

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <span className={s.panelTitle}>Job pipeline</span>
        <span className={s.panelCount}>{active.length} active</span>
      </div>
      <div className={s.panelBody}>
        {/* Stats row */}
        {jobs && jobs.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {['applied', 'interview', 'offer'].map(st => (
              <div key={st} style={{
                background: '#141414', border: '1px solid #1e1e1e', borderRadius: 6,
                padding: '6px 12px', fontSize: 11, color: '#555',
              }}>
                <span style={{ color: '#888', fontWeight: 700 }}>{byStatus[st] || 0}</span>
                {' '}{st}
              </div>
            ))}
          </div>
        )}

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
              <div className={s.empty}>
                No applications yet.<br />
                Run: <code style={{ color: '#555', fontSize: 11 }}>python -m tools.job_assistant apply --url "…"</code>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
