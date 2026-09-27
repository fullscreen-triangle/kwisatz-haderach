import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

// The brief — the one screen the phone opens to (PWA start_url). There is no external
// calendar: this timeline is where the plan is read.
//
//   Timeline   today block by block with a now line, the next days, then every dated plan
//              milestone beyond the planner's horizon, month by month. Live over SSE. A block
//              opens to what it came from (the mail, the plan) and can be marked done.
//   Lists      the depth dial — every open item (mail, plans, todos), individuated
//              coarse-to-fine by the okgg engine (backend/individuate). Each row is a cell of
//              the descent tree, labelled by the distinction its members share. Tap = finer,
//              breadcrumb = coarser, θ = how completely things must be told apart. An item
//              itself opens in steps: the row → what was extracted → the raw text.
//              Below it, the plan tree (backend/plans): add, tick off, import.
//   Ask        four-sided-triangle over mail, projects, todos and plans

const C = {
  ground: '#0B0E13', panel: '#12161E', panel2: '#171C26', ink: '#E6EBF2', soft: '#B4BECC',
  faint: '#7A8698', line: '#2A313E', signal: '#3FD0C9', warn: '#E0A93E', bad: '#EF6B6B', ok: '#5CC98A',
};
const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const KIND_MARK = { mail: '✉', plan: '◆', todo: '☐' };
const REGIME = { satisfied: C.ok, feasible: C.signal, infeasible: C.warn, leaf: C.faint };

const hm = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const day = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  const days = Math.round((new Date(d.toDateString()) - new Date(new Date().toDateString())) / 864e5);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days < 0) return `${-days}d overdue`;
  if (days < 7) return d.toLocaleDateString('en-GB', { weekday: 'short' });
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined });
};
const overdue = iso => iso && new Date(iso) < new Date();

async function api(url, opts = {}) {
  const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts,
                               body: opts.body ? JSON.stringify(opts.body) : undefined });
  const j = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
  if (!r.ok && !j.error) j.error = j.detail || `HTTP ${r.status}`;
  return j;
}

function Section({ title, right, children }) {
  return (
    <section style={st.section}>
      <div style={st.sectionHead}><span>{title}</span>{right}</div>
      {children}
    </section>
  );
}

// ------------------------------------------------------------------ one item, three depths

function MailDetail({ k, deep }) {
  const [m, setM] = useState(null);
  useEffect(() => { api(`/api/desk/mail/messages/${encodeURIComponent(k)}`).then(setM); }, [k]);
  if (!m) return <div style={st.faint}>…</div>;
  if (m.error) return <div style={{ color: C.bad }}>{m.error}</div>;
  const ex = m.extraction || {};
  return (
    <div style={st.detail}>
      <div style={st.faint}>{m.from_name || m.from_addr} · {day(m.date)} · {m.account}</div>
      {ex.summary && <div style={{ margin: '6px 0' }}>{ex.summary}</div>}
      {(ex.action_items || []).map((a, i) => (
        <div key={i} style={{ fontSize: 14 }}>→ {a.title}{a.due ? <span style={st.faint}> · {day(a.due)}</span> : null}</div>
      ))}
      {(ex.key_facts || []).length > 0 && (
        <ul style={st.facts}>{ex.key_facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
      )}
      {deep && <pre style={st.raw}>{m.text}</pre>}
    </div>
  );
}

function PlanDetail({ node, onDone, deep }) {
  if (!node) return <div style={st.faint}>(not in plans any more)</div>;
  const w = node.when;
  return (
    <div style={st.detail}>
      {w?.date && <div>when · {day(w.date)} ({w.date})</div>}
      {w?.window && <div>between · {w.window[0]} and {w.window[1]}</div>}
      {node.every && <div>{node.every.times}× a {node.every.per}, {node.every.minutes} min</div>}
      {node.minutes && <div>about {node.minutes} min of work</div>}
      {node.cost && <div>costs {node.cost.amount} {node.cost.currency}</div>}
      {node.blocked_by?.length > 0 && (
        <div style={{ color: C.warn, marginTop: 4 }}>⛔ {node.blocked_by.join(' · ')}</div>
      )}
      {node.notes && <div style={{ marginTop: 6, color: C.soft }}>{node.notes}</div>}
      {deep && <pre style={st.raw}>{JSON.stringify(node, null, 1)}</pre>}
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button style={st.btnSmall} onClick={() => onDone(node.id, node.status !== 'done')}>
          {node.status === 'done' ? 'Undo done' : 'Done'}
        </button>
      </div>
    </div>
  );
}

function Item({ it, plans, onPlanDone, onMailDone }) {
  const [depth, setDepth] = useState(0);         // 0 row · 1 extracted · 2 raw
  const mark = KIND_MARK[it.kind] || '·';
  return (
    <div style={st.item}>
      <div style={st.itemRow} onClick={() => setDepth(depth ? 0 : 1)}>
        <span style={{ color: C.signal, fontFamily: mono, width: 18, flex: 'none' }}>{mark}</span>
        <span style={{ flex: 1 }}>{it.title}{it.who ? <span style={st.faint}> · {it.who}</span> : null}</span>
        {it.due && <span style={{ ...st.due, color: overdue(it.due) ? C.bad : C.faint }}>{day(it.due)}</span>}
      </div>
      {depth > 0 && (
        <>
          {it.kind === 'mail' && <MailDetail k={it.ref} deep={depth > 1} />}
          {it.kind === 'plan' && <PlanDetail node={plans[it.ref]} onDone={onPlanDone} deep={depth > 1} />}
          <div style={{ display: 'flex', gap: 8, margin: '4px 0 6px 26px' }}>
            <button style={st.link} onClick={() => setDepth(depth > 1 ? 1 : 2)}>{depth > 1 ? 'less' : 'more'}</button>
            {it.kind === 'mail' && <button style={st.link} onClick={() => onMailDone(it.ref)}>done</button>}
          </div>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ the dial

function Dial({ plans, reloadPlans }) {
  const router = useRouter();
  const nodeId = typeof router.query.n === 'string' ? router.query.n : '';
  const [d, setD] = useState(null);
  const [theta, setTheta] = useState(null);
  const tTimer = useRef(null);

  const load = useCallback(() => {
    api(`/api/desk/dial/node${nodeId ? `/${nodeId}` : ''}`).then(j => {
      if (j.error && nodeId) { router.replace({ query: {} }, undefined, { shallow: true }); return; }
      setD(j);
      if (theta === null && j.theta != null) setTheta(j.theta);
    });
  }, [nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);

  const go = id => router.push({ query: id ? { n: id } : {} }, undefined, { shallow: true });
  const changeTheta = v => {
    setTheta(v);
    clearTimeout(tTimer.current);
    tTimer.current = setTimeout(() => api('/api/desk/dial/theta', { method: 'PUT', body: { theta: v } }).then(load), 500);
  };
  const planDone = async (id, done) => { await api(`/api/desk/plans/${id}/done`, { method: 'POST', body: { done } }); reloadPlans(); load(); };
  const mailDone = async key => { await api(`/api/desk/mail/messages/${encodeURIComponent(key)}/done`, { method: 'POST', body: { done: true } }); load(); };

  if (!d) return <div style={st.faint}>loading…</div>;
  if (d.error) return <div style={{ color: C.bad }}>{d.error}</div>;
  const n = d.node;
  if (!n) return <div style={st.faint}>Nothing individuated yet{d.growing ? ' — reading your items now…' : '.'}</div>;
  const leafish = !d.children.length;
  return (
    <div>
      <div style={st.crumbs}>
        {d.breadcrumb.map(c => (
          <span key={c.id}><button style={st.link} onClick={() => go(c.id === d.breadcrumb[0]?.id ? '' : c.id)}>{c.label}</button> › </span>
        ))}
        <b style={{ color: C.ink }}>{n.label}</b>
      </div>
      <div style={st.dialMeta}>
        <span>{n.size} items</span>
        <span style={{ color: REGIME[n.regime] || C.faint }}>{n.regime}</span>
        <span>told apart {Math.round(n.value * 100)}% · needs {Math.round((n.target || 0) * 100)}%</span>
        {d.growing && <span style={{ color: C.signal }}>● drawing distinctions</span>}
      </div>
      {theta !== null && (
        <label style={st.theta}>
          <span>coarse</span>
          <input type="range" min="0.1" max="1" step="0.05" value={theta}
                 onChange={e => changeTheta(parseFloat(e.target.value))} style={{ flex: 1 }} />
          <span>fine</span>
          <span style={{ fontFamily: mono, width: 36, textAlign: 'right' }}>θ {theta.toFixed(2)}</span>
        </label>
      )}
      {d.children.map(c => (
        <button key={c.id} style={st.cell} onClick={() => go(c.id)}>
          <span style={{ flex: 1, textAlign: 'left' }}>
            {c.label.split(': ').slice(1).join(': ') || c.label}
            <span style={st.faint}> · {c.size}</span>
          </span>
          {c.due && <span style={{ ...st.due, color: overdue(c.due) ? C.bad : C.faint }}>{day(c.due)}</span>}
          <span style={{ color: C.faint, marginLeft: 8 }}>›</span>
        </button>
      ))}
      {d.children.length > 0 && n.split_by && <div style={{ ...st.faint, margin: '4px 2px 10px' }}>split by {n.split_by}</div>}
      {(leafish || d.items.length <= 8) && d.items.map(it =>
        <Item key={it.key} it={it} plans={plans} onPlanDone={planDone} onMailDone={mailDone} />)}
      {!leafish && d.items.length > 8 && (
        <details><summary style={st.summary}>all {d.items.length} items, by date</summary>
          {d.items.map(it => <Item key={it.key} it={it} plans={plans} onPlanDone={planDone} onMailDone={mailDone} />)}
        </details>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ plans

function AddPlan({ nodes, onAdded }) {
  const [f, setF] = useState({ title: '', parent: '', date: '', minutes: '', times: '' });
  const [err, setErr] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    if (!f.title.trim()) return;
    const body = { title: f.title.trim() };
    if (f.parent) body.parent = f.parent;
    if (f.date) body.when = { date: f.date };
    if (f.times) body.every = { times: +f.times, per: 'week', minutes: +(f.minutes || 30) };
    else if (f.minutes) body.minutes = +f.minutes;
    const j = await api('/api/desk/plans', { method: 'POST', body });
    if (j.error) return setErr(j.error);
    setErr(''); setF({ title: '', parent: '', date: '', minutes: '', times: '' }); onAdded();
  };
  return (
    <div style={st.form}>
      <input style={st.input} placeholder="New plan — e.g. Buy a chicken loop" value={f.title} onChange={set('title')} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select style={{ ...st.input, flex: '1 1 140px' }} value={f.parent} onChange={set('parent')}>
          <option value="">(top level)</option>
          {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
        </select>
        <input style={{ ...st.input, flex: '1 1 120px' }} type="date" value={f.date} onChange={set('date')} />
        <input style={{ ...st.input, width: 80 }} type="number" min="5" placeholder="min" value={f.minutes} onChange={set('minutes')} />
        <input style={{ ...st.input, width: 80 }} type="number" min="1" max="14" placeholder="×/wk" value={f.times} onChange={set('times')} />
      </div>
      <button style={st.btn} onClick={submit}>Add</button>
      {err && <div style={{ color: C.bad }}>{err}</div>}
    </div>
  );
}

function PlanTree({ view, onChange }) {
  const byParent = useMemo(() => {
    const m = {};
    for (const n of view.nodes) (m[n.parent || ''] ||= []).push(n);
    return m;
  }, [view]);
  const done = async (id, d) => { await api(`/api/desk/plans/${id}/done`, { method: 'POST', body: { done: d } }); onChange(); };
  const row = (n, depth) => (
    <div key={n.id}>
      <div style={{ ...st.planRow, paddingLeft: 4 + depth * 14, opacity: ['done', 'dropped'].includes(n.status) ? 0.45 : 1 }}>
        <input type="checkbox" checked={n.status === 'done'} onChange={e => done(n.id, e.target.checked)} />
        <span style={{ flex: 1 }}>
          {n.title}
          {n.effective === 'blocked' && <span style={{ color: C.warn }} title={n.blocked_by.join('; ')}> ⛔</span>}
          {n.status === 'idea' && <span style={st.faint}> · idea</span>}
          {n.every && <span style={st.faint}> · {n.every.times}×/wk</span>}
          {n.cost && <span style={st.faint}> · {n.cost.amount} {n.cost.currency}</span>}
        </span>
        {(n.when?.date || n.when?.window?.[0]) && <span style={st.due}>{day(n.when.date || n.when.window[0])}</span>}
      </div>
      {(byParent[n.id] || []).map(c => row(c, depth + 1))}
    </div>
  );
  return <div>{(byParent[''] || []).map(n => row(n, 0))}</div>;
}

function ImportSeed({ onDone }) {
  const [msg, setMsg] = useState('');
  const pick = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const j = await api('/api/desk/plans/import', { method: 'POST', body: { nodes: data.nodes || data } });
      setMsg(j.error ? j.error : `added ${j.added}, kept ${j.skipped} existing${j.rejected?.length ? `, rejected ${j.rejected.length}` : ''}`);
      onDone();
    } catch (err) { setMsg(`not a plans file: ${err.message}`); }
  };
  return <label style={st.faint}>Import plans (JSON) <input type="file" accept=".json,application/json" onChange={pick} /> {msg}</label>;
}

function Ask() {
  const [q, setQ] = useState('');
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    if (!q.trim()) return;
    setBusy(true);
    setOut(await api('/api/desk/mail/ask', { method: 'POST', body: { q } }));
    setBusy(false);
  };
  const color = out?.status === 'grounded' ? C.ok : out?.status === 'declined' ? C.faint : C.warn;
  return (
    <div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input style={{ ...st.input, flex: 1 }} placeholder="Ask your mail and plans…" value={q}
               onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} />
        <button style={st.btnSmall} onClick={run} disabled={busy}>{busy ? '…' : 'Ask'}</button>
      </div>
      {out && (out.error ? <div style={{ color: C.bad, marginTop: 8 }}>{out.error}</div> : (
        <div style={{ marginTop: 8 }}>
          <span style={{ color, fontFamily: mono, fontSize: 12 }}>{out.status}</span>
          {out.claim && <div style={{ margin: '4px 0' }}>{out.claim}</div>}
          {out.reason && <div style={st.faint}>{out.reason}</div>}
          {out.warning && <div style={{ ...st.faint, color: C.warn }}>{out.warning}</div>}
          {(out.support || []).slice(0, 4).map((c, i) => (
            <div key={i} style={{ ...st.faint, marginTop: 4 }}>· {c.origin || c.source}: {(c.text || '').slice(0, 140)}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ the timeline

const KIND = {
  fixed: { color: '#EF6B6B', label: 'appointment' }, task: { color: '#E0A93E', label: 'task' },
  work: { color: '#6E9BFF', label: 'work' }, pool: { color: '#5CC98A', label: 'focus' },
  meal: { color: '#A78BFA', label: 'meal' },
};
const SHOWN = new Set(Object.keys(KIND));                      // sleep, breaks, buffers stay off
const dayKey = d => new Date(d).toLocaleDateString('en-CA');   // YYYY-MM-DD, local
const dayTitle = key => {
  const d = new Date(`${key}T12:00:00`);
  const rel = day(d.toISOString());
  const date = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return ['today', 'tomorrow'].includes(rel) ? `${rel[0].toUpperCase()}${rel.slice(1)} · ${date}` : date;
};

function Block({ b, now, plans, onDone, onPlanDone }) {
  const [open, setOpen] = useState(false);
  const start = new Date(b.start), end = new Date(b.end);
  const current = start <= now && now < end;
  const past = end <= now;
  const k = KIND[b.kind] || { color: C.faint };
  const src = b.source || {};
  const pct = current ? Math.min(100, (now - start) / (end - start) * 100) : 0;
  return (
    <div style={{ ...st.block, opacity: past ? 0.45 : 1, background: current ? C.panel2 : 'transparent' }}>
      <div style={st.blockRow} onClick={() => setOpen(!open)}>
        <span style={st.time}>{hm(b.start)}<br /><span style={{ color: C.faint }}>{hm(b.end)}</span></span>
        <span style={{ ...st.bar, background: k.color }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ textDecoration: b.done ? 'line-through' : 'none', fontWeight: current ? 700 : 500 }}>
            {b.title}{b.tentative ? ' ?' : ''}
          </span>
          <span style={st.kindTag}>{current ? 'now' : k.label}{b.pinned ? ' · pinned' : ''}</span>
          {current && <span style={st.progress}><span style={{ ...st.progressBar, width: `${pct}%` }} /></span>}
        </span>
        {['task', 'pool', 'work'].includes(b.kind) && (
          <input type="checkbox" checked={!!b.done} onClick={e => e.stopPropagation()}
                 onChange={e => onDone(b.id, e.target.checked)} style={{ marginLeft: 8 }} />
        )}
      </div>
      {open && (
        <div style={{ paddingBottom: 8 }}>
          {src.type === 'mail' && <MailDetail k={src.ref} />}
          {src.type === 'plan' && <PlanDetail node={plans[src.plan || src.ref]} onDone={onPlanDone} />}
          {src.type === 'gcal' && <div style={st.detail}>from {src.calendar}</div>}
          {!['mail', 'plan', 'gcal'].includes(src.type) && (
            <div style={{ ...st.detail, color: C.faint }}>{Math.round((end - start) / 60000)} min · {k.label}</div>
          )}
        </div>
      )}
    </div>
  );
}

function Timeline({ plans, view, reloadPlans }) {
  const [snap, setSnap] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [earlier, setEarlier] = useState(false);
  const nowRef = useRef(null);
  const scrolled = useRef(false);

  useEffect(() => {
    api('/api/desk/plan/now').then(j => !j.error && setSnap(j));
    const es = new EventSource('/api/desk/plan/stream');
    es.addEventListener('plan', e => setSnap(JSON.parse(e.data)));
    const tick = setInterval(() => setNow(new Date()), 30_000);
    return () => { es.close(); clearInterval(tick); };
  }, []);
  useEffect(() => {                                   // land on "now" once, not on every update
    if (snap && nowRef.current && !scrolled.current) {
      scrolled.current = true;
      nowRef.current.scrollIntoView({ block: 'center' });
    }
  }, [snap]);

  const done = async (id, d) => { await api('/api/desk/plan/done', { method: 'POST', body: { block_id: id, done: d } }); };
  const planDone = async (id, d) => { await api(`/api/desk/plans/${id}/done`, { method: 'POST', body: { done: d } }); reloadPlans(); };

  const days = useMemo(() => {
    const m = {};
    for (const b of snap?.blocks || []) if (SHOWN.has(b.kind)) (m[dayKey(b.start)] ||= []).push(b);
    for (const k of Object.keys(m)) m[k].sort((a, b) => new Date(a.start) - new Date(b.start));
    return m;
  }, [snap]);
  const msByDay = useMemo(() => {
    const m = {};
    for (const x of view?.milestones || []) if (x.status !== 'done') (m[x.start] ||= []).push(x);
    return m;
  }, [view]);

  if (!snap) return <div style={st.faint}>loading the plan…</div>;
  const today = dayKey(now);
  const keys = Object.keys(days).filter(k => k >= today).sort();
  const lastPlanned = keys[keys.length - 1] || today;
  const later = (view?.milestones || []).filter(x => x.status !== 'done' && x.start > lastPlanned);
  const byMonth = {};
  for (const x of later) (byMonth[x.start.slice(0, 7)] ||= []).push(x);
  const overdueMs = (view?.milestones || []).filter(x => x.status !== 'done' && x.end < today);

  const chips = key => (msByDay[key] || []).map(x => (
    <div key={x.uid} style={{ ...st.chip, borderColor: x.status === 'blocked' ? C.warn : C.signal }}>
      ◆ {x.title}{x.cost ? ` · ${x.cost.amount} ${x.cost.currency}` : ''}
      {x.status === 'blocked' && <div style={{ color: C.warn, fontSize: 12 }}>⛔ {x.blocked_by.join(' · ')}</div>}
    </div>
  ));

  return (
    <div>
      {snap.error && <div style={{ color: C.bad, marginBottom: 8 }}>{snap.error}</div>}
      {(snap.at_risk || []).length > 0 && (
        <div style={{ ...st.card, color: C.warn, marginBottom: 12 }}>
          ⚠ won’t fit before its deadline: {snap.at_risk.map(a => a.title).join(' · ')}
        </div>
      )}
      {overdueMs.length > 0 && (
        <div style={{ ...st.card, color: C.bad, marginBottom: 12 }}>
          overdue: {overdueMs.map(x => x.title).join(' · ')}
        </div>
      )}
      {keys.map(key => {
        const blocks = days[key];
        const isToday = key === today;
        const gone = isToday ? blocks.filter(b => new Date(b.end) <= now) : [];
        const rest = isToday ? blocks.filter(b => new Date(b.end) > now) : blocks;
        return (
          <div key={key} style={{ marginBottom: 18 }}>
            <div style={st.dayHead}>{dayTitle(key)}</div>
            {chips(key)}
            {gone.length > 0 && (
              <button style={{ ...st.link, margin: '2px 0 6px' }} onClick={() => setEarlier(!earlier)}>
                {earlier ? 'hide' : 'show'} earlier today ({gone.length})
              </button>
            )}
            {earlier && gone.map(b => <Block key={b.id} b={b} now={now} plans={plans} onDone={done} onPlanDone={planDone} />)}
            {isToday && <div ref={nowRef} style={st.nowLine}><span style={st.nowDot} />{hm(now.toISOString())}</div>}
            {rest.map(b => <Block key={b.id} b={b} now={now} plans={plans} onDone={done} onPlanDone={planDone} />)}
          </div>
        );
      })}
      {Object.keys(byMonth).length > 0 && <div style={{ ...st.dayHead, marginTop: 10 }}>Later</div>}
      {Object.entries(byMonth).map(([ym, xs]) => (
        <div key={ym} style={{ marginBottom: 12 }}>
          <div style={st.monthHead}>{new Date(`${ym}-15T12:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
          {xs.map(x => (
            <div key={x.uid} style={st.planRow}>
              <span style={{ ...st.due, width: 58, textAlign: 'left', color: C.soft }}>
                {new Date(`${x.start}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
              <span style={{ flex: 1 }}>
                {x.title}{x.end !== x.start && <span style={st.faint}> · until {x.end}</span>}
                {x.status === 'blocked' && <div style={{ color: C.warn, fontSize: 12 }}>⛔ {x.blocked_by.join(' · ')}</div>}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ page

const TABS = [['timeline', 'Timeline'], ['lists', 'Lists'], ['ask', 'Ask']];

export default function Brief() {
  const router = useRouter();
  const tab = TABS.some(([k]) => k === router.query.tab) ? router.query.tab : 'timeline';
  const [view, setView] = useState(null);
  const loadPlans = useCallback(() => api('/api/desk/plans').then(j => !j.error && setView(j)), []);
  useEffect(() => { loadPlans(); const t = setInterval(loadPlans, 120_000); return () => clearInterval(t); }, [loadPlans]);
  const planIndex = useMemo(() => Object.fromEntries((view?.nodes || []).map(n => [n.id, n])), [view]);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const go = k => router.push({ query: k === 'timeline' ? {} : { tab: k } }, undefined, { shallow: true });

  return (
    <div style={st.page}>
      <Head>
        <title>Agent Smith</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={C.ground} />
        <link rel="manifest" href="/manifest.webmanifest" />
      </Head>
      <header style={st.header}>
        <div>
          <div style={st.brand}>AGENT SMITH</div>
          <div style={st.faint}>{today}</div>
        </div>
        <Link href="/desk/console" style={st.nav} aria-label="console">🎙</Link>
      </header>

      {tab === 'timeline' && <Timeline plans={planIndex} view={view} reloadPlans={loadPlans} />}

      {tab === 'lists' && (
        <>
          <Section title="What's open">
            <Dial plans={planIndex} reloadPlans={loadPlans} />
          </Section>
          <Section title={`Plans${view ? ` (${view.nodes.length})` : ''}`}>
            {view ? <PlanTree view={view} onChange={loadPlans} /> : <div style={st.faint}>loading…</div>}
            {view && <AddPlan nodes={view.nodes} onAdded={loadPlans} />}
            <div style={{ marginTop: 10 }}><ImportSeed onDone={loadPlans} /></div>
          </Section>
        </>
      )}

      {tab === 'ask' && (
        <Section title="Ask your mail and plans">
          <Ask />
        </Section>
      )}

      <nav style={st.tabs}>
        {TABS.map(([k, label]) => (
          <button key={k} onClick={() => go(k)} style={{ ...st.tab, color: tab === k ? C.signal : C.faint }}>{label}</button>
        ))}
      </nav>
    </div>
  );
}

const st = {
  page: { minHeight: '100vh', background: C.ground, color: C.ink, fontFamily: sans, fontSize: 15, lineHeight: 1.45,
          padding: 'max(14px, env(safe-area-inset-top)) 14px calc(76px + env(safe-area-inset-bottom))', maxWidth: 720, margin: '0 auto' },
  tabs: { position: 'fixed', left: 0, right: 0, bottom: 0, display: 'flex', background: C.panel, borderTop: `1px solid ${C.line}`,
          paddingBottom: 'env(safe-area-inset-bottom)', zIndex: 10 },
  tab: { flex: 1, background: 'none', border: 0, padding: '14px 0', fontSize: 15, fontWeight: 600, fontFamily: sans, cursor: 'pointer' },
  dayHead: { fontFamily: mono, fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: C.soft,
             padding: '6px 0', borderBottom: `1px solid ${C.line}`, marginBottom: 4, position: 'sticky', top: 0,
             background: C.ground, zIndex: 2 },
  monthHead: { fontSize: 13, color: C.faint, margin: '8px 0 2px' },
  chip: { border: '1px solid', borderRadius: 8, padding: '6px 10px', margin: '6px 0', fontSize: 14 },
  block: { borderRadius: 8 },
  blockRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', cursor: 'pointer' },
  time: { fontFamily: mono, fontSize: 12, width: 42, flex: 'none', lineHeight: 1.3 },
  bar: { width: 3, alignSelf: 'stretch', borderRadius: 2, flex: 'none' },
  kindTag: { display: 'block', fontSize: 11, color: C.faint, fontFamily: mono },
  progress: { display: 'block', height: 3, background: C.line, borderRadius: 2, marginTop: 5 },
  progressBar: { display: 'block', height: 3, background: C.signal, borderRadius: 2 },
  nowLine: { display: 'flex', alignItems: 'center', gap: 6, color: C.signal, fontFamily: mono, fontSize: 11,
             borderTop: `1px solid ${C.signal}`, margin: '4px 0', paddingTop: 2 },
  nowDot: { width: 7, height: 7, borderRadius: 4, background: C.signal, marginTop: -6 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  brand: { fontFamily: mono, fontSize: 13, letterSpacing: '.12em', color: C.signal, fontWeight: 700 },
  nav: { color: C.soft, textDecoration: 'none', fontSize: 14 },
  section: { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginBottom: 14 },
  sectionHead: { display: 'flex', justifyContent: 'space-between', fontSize: 12, letterSpacing: '.1em',
                 textTransform: 'uppercase', color: C.faint, marginBottom: 10, fontFamily: mono },
  nowGrid: { display: 'grid', gap: 8, marginBottom: 14 },
  card: { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 12px', display: 'block' },
  big: { fontSize: 19, fontWeight: 700, marginTop: 2 },
  mid: { fontSize: 15, fontWeight: 600, marginTop: 2 },
  faint: { color: C.faint, fontSize: 12 },
  crumbs: { fontSize: 13, color: C.faint, marginBottom: 6, lineHeight: 1.7 },
  dialMeta: { display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: C.faint, marginBottom: 8, fontFamily: mono },
  theta: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.faint, margin: '4px 0 12px' },
  cell: { width: '100%', display: 'flex', alignItems: 'center', background: C.panel2, color: C.ink, border: `1px solid ${C.line}`,
          borderRadius: 10, padding: '12px 12px', marginBottom: 6, fontSize: 15, fontFamily: sans, cursor: 'pointer' },
  item: { borderTop: `1px solid ${C.line}` },
  itemRow: { display: 'flex', alignItems: 'baseline', gap: 6, padding: '9px 2px', cursor: 'pointer' },
  due: { fontFamily: mono, fontSize: 12, color: C.faint, flex: 'none', textAlign: 'right' },
  detail: { margin: '0 0 4px 26px', fontSize: 14, color: C.ink },
  facts: { margin: '6px 0', paddingLeft: 18, color: C.soft, fontSize: 13 },
  raw: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: C.ground, border: `1px solid ${C.line}`, borderRadius: 8,
         padding: 10, fontSize: 12, color: C.soft, maxHeight: 360, overflow: 'auto', fontFamily: mono },
  link: { background: 'none', border: 0, color: C.signal, padding: 0, fontSize: 13, cursor: 'pointer', fontFamily: sans },
  summary: { cursor: 'pointer', color: C.signal, fontSize: 14, margin: '6px 0' },
  planRow: { display: 'flex', alignItems: 'baseline', gap: 8, padding: '6px 2px', borderTop: `1px solid ${C.line}`, fontSize: 14 },
  form: { display: 'grid', gap: 6, marginTop: 12 },
  input: { background: C.panel2, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: '9px 10px', fontSize: 15, fontFamily: sans },
  btn: { background: C.signal, color: C.ground, border: 0, borderRadius: 10, padding: '11px 14px', fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  btnSmall: { background: C.panel2, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: '7px 12px', fontSize: 14, cursor: 'pointer' },
};
