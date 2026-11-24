import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Markdown from './Markdown';
import { C, linkBtn } from './Reader';

// One task of the tool agent (backend/tasks) as it runs: the graph of what it called and
// found (mails, links, files, forms), the forms it made with how far each is filled, every
// step, and its report. Streams over SSE until the task ends.

const ForceGraph = dynamic(() => import('./ForceGraph'), { ssr: false });
const STATUS_COLOR = { running: C.warn, done: C.ok, failed: C.bad, interrupted: C.faint };

const dur = s => (s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);

// What the task was forecast to take (backend/tasks/effort.py, from the decisions tool) beside
// what it has taken. The forecast is an upper end that held for past runs with at least the
// stated share; with too few past runs there is none, and the line says how many are missing.
function Effort({ t }) {
  const [now, setNow] = useState(Date.now());
  const running = t.status === 'running';
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  const e = t.estimate || {};
  const run = (t.runs || [])[(t.runs || []).length - 1];
  const high = e.seconds?.high;
  const parts = [];
  if (high != null) {
    const share = e.seconds.coverage ? `, as at least ${Math.round(e.seconds.coverage * 100)}% of runs do` : '';
    parts.push(`forecast: within ${dur(high)}${e.steps?.high != null ? ` and ${e.steps.high} steps` : ''}${share} (from ${e.records} past runs)`);
  } else if (e.needs) {
    parts.push(`no forecast yet: ${e.needs.more} more finished ${e.needs.more === 1 ? 'run' : 'runs'} needed`);
  }
  const first = (t.runs || []).length === (running ? 0 : 1);     // the forecast is for a first run
  let over = false;
  if (running && t.run_started) {
    const el = Math.max(0, (now - new Date(t.run_started).getTime()) / 1000);
    over = first && high != null && el > high;
    parts.push(`${dur(el)} so far${over ? ' — past the forecast' : ''}`);
  } else if (run) {
    over = first && high != null && run.seconds > high;
    const verdict = first && high != null ? (over ? ' — longer than forecast' : ' — within the forecast') : '';
    parts.push(`took ${dur(run.seconds)}, ${run.steps} steps${verdict}`);
  }
  if (!parts.length) return null;
  return <div style={{ color: over ? C.warn : C.faint, fontSize: 12, marginBottom: 8 }}>{parts.join(' · ')}</div>;
}

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

// A file plan the agent wrote (drogba, run on the laptop): every step it would take. The agent
// only previews; this is the one place a plan runs, and only as last previewed — drogba
// refuses a run if the plan or the disk changed since (status "stale": preview again).
const PLAN_COLOR = { previewed: C.warn, running: C.warn, ran: C.ok, stopped: C.bad, stale: C.bad, 'has problems': C.bad };

function PlanRow({ taskId, plan }) {
  const [p, setP] = useState(plan);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  useEffect(() => setP(plan), [plan]);
  const s = p.summary || {};
  const counts = [['folders_made', 'new folders'], ['moves', 'moves'], ['copies', 'copies'], ['renames', 'renames'],
    ['archives', 'archives'], ['deletes', 'deletes']].filter(([k]) => s[k]).map(([k, l]) => `${s[k]} ${l}`).join(' · ');
  const act = async action => {
    if (action === 'run' && !window.confirm(`Run "${p.name || p.id}" on the laptop?\n\n${p.step_count} steps: ${counts}`
      + `${s.deletes ? '\nDeleted items go to the Recycle Bin.' : ''}`)) return;
    setBusy(action);
    const r = await fetch(`/api/desk/tasks/${encodeURIComponent(taskId)}/plans/${p.id}/${action}`, { method: 'POST' })
      .then(x => x.json()).catch(() => null);
    setBusy('');
    if (r?.id) setP(r); else setP({ ...p, error: r?.detail || r?.error || 'no answer from the desk' });
  };
  return (
    <div style={{ padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 14, color: C.ink }}>
        <span>🗂 {p.name || p.id} <span style={{ color: C.faint, fontSize: 12 }}>{p.step_count} steps{counts ? ` · ${counts}` : ''}</span></span>
        <span style={{ color: PLAN_COLOR[p.status] || C.faint, fontSize: 12, flexShrink: 0 }}>{busy ? `${busy}…` : p.status}</span>
      </div>
      {p.error && <div style={{ color: C.bad, fontSize: 12, marginTop: 4 }}>{p.error}</div>}
      {p.problems?.length > 0 && p.problems.map((x, i) => <div key={i} style={{ color: C.bad, fontSize: 12 }}>{x}</div>)}
      {!p.runs_allowed && p.status === 'previewed' && (
        <div style={{ color: C.faint, fontSize: 12, marginTop: 4 }}>running plans is off on the laptop — set "plans": true in its laptop-node.json</div>)}
      {p.report && (
        <div style={{ color: p.report.completed ? C.ok : C.bad, fontSize: 12, marginTop: 4 }}>
          {p.report.executed} of {p.report.total} steps done{p.report.completed ? '' : ' — stopped at the first failure'}
          {p.report.needs_admin ? '; the rest needs administrator rights (finish it in drogba on the laptop)' : ''}
        </div>)}
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        <button onClick={() => setOpen(!open)} style={{ ...linkBtn, padding: 0 }}>{open ? 'hide' : 'show'} steps</button>
        {['previewed', 'stale', 'has problems', 'stopped'].includes(p.status) && !busy && (
          <button onClick={() => act('preview')} style={{ ...linkBtn, padding: 0 }}>preview again</button>)}
        {p.status === 'previewed' && p.runs_allowed && !busy && (
          <button onClick={() => act('run')} style={{ ...linkBtn, padding: 0, color: C.warn }}>run on the laptop →</button>)}
      </div>
      {open && (
        <div style={{ fontSize: 12, color: C.soft, marginTop: 6, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
          {p.steps.map((x, i) => <div key={i}>{i + 1}. {x}</div>)}
          {p.step_count > p.steps.length && <div style={{ color: C.faint }}>… and {p.step_count - p.steps.length} more</div>}
        </div>)}
    </div>
  );
}

// Go on with a task: from its conversation so far, with an optional hint ("use the forms on
// the Referat Personal page"). The panel re-subscribes, so the graph keeps growing.
function Continue({ taskId, onStarted }) {
  const [hint, setHint] = useState('');
  const go = async () => {
    const r = await fetch(`/api/desk/tasks/${encodeURIComponent(taskId)}/continue`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: hint }) })
      .then(x => x.json()).catch(() => null);
    if (r?.id) { setHint(''); onStarted(); }
  };
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <input value={hint} onChange={e => setHint(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()}
        placeholder="continue — optionally tell it what to do next"
        style={{ flex: 1, background: C.panel2, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 10px', fontSize: 14 }} />
      <button onClick={go} style={{ ...linkBtn, padding: '0 6px' }}>continue →</button>
    </div>
  );
}

export default function AgentTaskPanel({ taskId, onRead, onClose }) {
  const [t, setT] = useState(null);
  const [showSteps, setShowSteps] = useState(false);
  const [sub, setSub] = useState(0);                 // bumped to re-subscribe after Continue
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
  }, [taskId, sub]);
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
      <Effort t={t} />

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
      {t.drafts?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: C.faint, fontSize: 12 }}>Drafts in your mailbox — not sent; check, sign and send them yourself</div>
          {t.drafts.map((d, i) => (
            <div key={i} style={{ fontSize: 14, color: C.ink, padding: '6px 0', borderBottom: `1px solid ${C.line}` }}>
              ✉ {d.subject} <span style={{ color: C.faint }}>→ {d.to} · {d.mailbox}/{d.folder}</span>
              {d.attachments?.length > 0 && <div style={{ color: C.soft, fontSize: 12 }}>attached: {d.attachments.join(', ')}</div>}
            </div>
          ))}
        </div>
      )}
      {t.plans?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ color: C.faint, fontSize: 12 }}>File plans for the laptop — previewed only; nothing changes until you run one</div>
          {t.plans.map(p => <PlanRow key={p.id} taskId={t.id} plan={p} />)}
        </div>
      )}
      {t.answer && <div style={{ marginTop: 12 }}><Markdown text={t.answer} onRead={onRead} /></div>}
      {!running && <Continue taskId={t.id} onStarted={() => setSub(s => s + 1)} />}

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
