import { useEffect, useState } from 'react';
import Markdown from './Markdown';
import { C, linkBtn } from './Reader';

// One primitive task (backend/primitive) as it grows: the answer with its grade, then the
// trie — each agent's role, instruction, the model(s) that answered, and its outcome —
// what was ruled out, and which models were called. Streams over SSE until it ends.

const GRADE = {
  corroborated: { color: C.ok, says: 'checked by models of two other families, all agreeing' },
  unconfirmed: { color: C.warn, says: 'written by a model, not independently checked' },
};
const STATUS_COLOR = { running: C.warn, answered: C.ok, declined: C.bad, failed: C.bad,
                       interrupted: C.faint, 'out of budget': C.warn };
function Outcome({ o }) {
  if (!o) return null;
  if (o.kind === 'convergent') {
    const g = GRADE[o.grade] || GRADE.unconfirmed;
    return <span style={{ color: g.color }}>[{o.grade}]</span>;
  }
  return <span style={{ color: C.bad }}>declined: {o.reason}</span>;
}

export default function TaskPanel({ taskId, onRead, onClose }) {
  const [t, setT] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!taskId) return undefined;
    setT(null);
    const es = new EventSource(`/api/desk/primitive/tasks/${encodeURIComponent(taskId)}/stream`);
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

  const o = t.trie?.outcome;
  const nodes = t.trie?.nodes || [];
  const running = t.status === 'running';
  return (
    <div style={box}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ color: C.ink, fontSize: 15, fontWeight: 600 }}>{t.task}</div>
        <div style={{ flexShrink: 0, fontSize: 12, textAlign: 'right' }}>
          <span style={{ color: STATUS_COLOR[t.status] || C.faint }}>{running ? '● ' : ''}{t.status}</span>
          {onClose && <button onClick={onClose} style={{ ...linkBtn, padding: '0 0 0 10px' }}>close</button>}
        </div>
      </div>

      {o?.kind === 'convergent' && (
        <div style={{ borderLeft: `3px solid ${(GRADE[o.grade] || GRADE.unconfirmed).color}`, paddingLeft: 12 }}>
          <Markdown text={o.value} onRead={onRead} />
          <div style={{ color: C.faint, fontSize: 12, marginTop: 6 }}>
            {o.grade} — {(GRADE[o.grade] || GRADE.unconfirmed).says}
          </div>
        </div>
      )}
      {o?.kind === 'contested' && (
        <div style={{ color: C.soft, fontSize: 14 }}>
          <div style={{ color: C.bad, marginBottom: 6 }}>Declined: {o.reason}</div>
          {o.classes?.length > 0 && <div style={{ color: C.faint, fontSize: 12, marginBottom: 4 }}>What was tried:</div>}
          {o.classes?.map((c, i) => <div key={i} style={{ borderLeft: `2px solid ${C.line}`, paddingLeft: 10, margin: '6px 0' }}>
            <Markdown text={c} onRead={onRead} /></div>)}
        </div>
      )}
      {t.note && <div style={{ color: t.status === 'failed' ? C.bad : C.faint, fontSize: 13, marginTop: 8 }}>{t.note}</div>}

      <div style={{ marginTop: 12 }}>
        <button onClick={() => setOpen(!open)} style={{ ...linkBtn, padding: 0 }}>
          {open ? 'hide' : 'show'} the agents ({nodes.length}{t.trie?.archived ? `, ${t.trie.archived} set aside` : ''}) →
        </button>
      </div>
      {(open || running) && (
        <div style={{ marginTop: 8, fontSize: 13 }}>
          {nodes.map(n => (
            <div key={n.addr} style={{ paddingLeft: n.depth * 16, margin: '6px 0', color: C.soft }}>
              <span style={{ color: C.faint, fontFamily: 'monospace' }}>{n.addr === 'root' ? '·' : n.addr}</span>{' '}
              <span style={{ color: C.faint }}>{n.role || 'task'}</span>{' '}
              <span style={{ color: C.ink }}>{n.instruction.length > 140 ? `${n.instruction.slice(0, 140)}…` : n.instruction}</span>{' '}
              {n.outcome ? <Outcome o={n.outcome} /> : <span style={{ color: C.faint }}>({n.state})</span>}
              {n.by?.length > 0 && <div style={{ color: C.faint, fontSize: 11, paddingLeft: 18 }}>by {n.by.join(', ')}</div>}
            </div>
          ))}
          {t.trie?.foreclosures?.length > 0 && (
            <div style={{ marginTop: 10, color: C.faint, fontSize: 12 }}>
              Ruled out: {t.trie.foreclosures.map((f, i) => <div key={i}>· {f.addr} — {f.why}</div>)}
            </div>
          )}
          {t.usage?.length > 0 && (
            <div style={{ marginTop: 10, color: C.faint, fontSize: 11 }}>{t.usage.join(' · ')}</div>
          )}
        </div>
      )}
    </div>
  );
}
