import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Markdown from './Markdown';
import { C, linkBtn } from './Reader';

// One task of the tool agent (backend/tasks) as it runs: the graph of what it called and
// found (mails, links, files, forms), the forms it made with how far each is filled, every
// step, and its report. Streams over SSE until the task ends.

const ForceGraph = dynamic(() => import('./ForceGraph'), { ssr: false });
const STATUS_COLOR = { running: C.warn, done: C.ok, failed: C.bad, interrupted: C.faint };

function FormRow({ id, title }) {
  const [v, setV] = useState(null);
  useEffect(() => { fetch(`/api/desk/forms/${id}`).then(r => r.json()).then(d => d.id && setV(d)).catch(() => {}); }, [id]);
  const n = v?.rows?.length || 0;
  const pct = k => (n ? `${(100 * (v.counts[k] || 0)) / n}%` : '0%');
  return (
    <a href={`/desk/forms?id=${id}`} style={{ display: 'block', textDecoration: 'none', padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: C.ink, fontSize: 14 }}>
        <span>{title}</span>
        <span style={{ color: C.faint, fontSize: 12 }}>{v ? `${v.counts.solved} of ${n} filled · ${v.counts.undecided + v.counts.assumed} need you` : '…'}</span>
      </div>
      {v && (
        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', background: C.panel2, marginTop: 5 }}>
          <div style={{ width: pct('solved'), background: C.ok }} />
          <div style={{ width: pct('declined'), background: C.faint }} />
          <div style={{ width: pct('undecided'), background: C.warn }} />
        </div>
      )}
    </a>
  );
}

export default function AgentTaskPanel({ taskId, onRead, onClose }) {
  const [t, setT] = useState(null);
  const [showSteps, setShowSteps] = useState(false);
  useEffect(() => {
    if (!taskId) return undefined;
    setT(null);
    const es = new EventSource(`/api/desk/tasks/${encodeURIComponent(taskId)}/stream`);
    es.addEventListener('task', e => {
      const d = JSON.parse(e.data);
      setT(d);
      if (d.status !== 'running') es.close();
    });
    return () => es.close();
  }, [taskId]);
  if (!taskId) return null;
  const box = { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, margin: '16px 0' };
  if (!t) return <div style={{ ...box, color: C.faint, fontSize: 13 }}>starting…</div>;
  const running = t.status === 'running';
  const last = t.steps[t.steps.length - 1];
  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <div style={{ color: C.ink, fontSize: 15, fontWeight: 600 }}>{t.text}</div>
        <div style={{ flexShrink: 0, fontSize: 12, textAlign: 'right' }}>
          <span style={{ color: STATUS_COLOR[t.status] || C.faint }}>{running ? '● ' : ''}{t.status}</span>
          {onClose && <button onClick={onClose} style={{ ...linkBtn, padding: '0 0 0 10px' }}>close</button>}
          {t.ran_on && <div style={{ color: C.faint }}>on {t.ran_on} — what it reads goes to that provider</div>}
        </div>
      </div>

      <ForceGraph graph={t.graph} height={340}
        onNodeClick={n => (n.kind === 'mail' && n.ref ? onRead('mail', n.ref)
          : n.id.startsWith('form:') ? window.open(`/desk/forms?id=${n.id.slice(5)}`, '_self') : null)} />

      {running && last && <div style={{ color: C.faint, fontSize: 13, marginTop: 8 }}>step {last.n}: {last.tool.replace(/_/g, ' ')} — {last.result.slice(0, 140)}</div>}
      {t.note && <div style={{ color: t.status === 'failed' ? C.bad : C.faint, fontSize: 13, marginTop: 8 }}>{t.note}</div>}

      {t.forms?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: C.faint, fontSize: 12 }}>Forms</div>
          {t.forms.map(f => <FormRow key={f.id} id={f.id} title={f.title} />)}
        </div>
      )}
      {t.answer && <div style={{ marginTop: 12 }}><Markdown text={t.answer} onRead={onRead} /></div>}

      <button onClick={() => setShowSteps(!showSteps)} style={{ ...linkBtn, paddingBottom: 0 }}>
        {showSteps ? 'hide' : 'show'} the {t.steps.length} steps →
      </button>
      {showSteps && t.steps.map(s => (
        <div key={s.n} style={{ fontSize: 12, color: C.soft, margin: '6px 0', borderLeft: `2px solid ${C.line}`, paddingLeft: 8 }}>
          <span style={{ color: C.ink }}>{s.n}. {s.tool}</span>{' '}
          <span style={{ color: C.faint }}>{JSON.stringify(s.args).slice(0, 160)}</span>
          <div style={{ color: C.faint }}>{s.result}</div>
        </div>
      ))}
    </div>
  );
}
