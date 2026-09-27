import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import s from '../../styles/desk.module.css';

// The plan: every minute from now to the horizon is a block (backend/planner). Drag a block
// to move it — it becomes a pin the re-plan works around; everything unpinned re-flows.
// Live over SSE: new mail, a pin, a "done" all re-plan within seconds.

const KIND = {
  fixed:  { color: '#ef4444', label: 'appointment' },
  task:   { color: '#f59e0b', label: 'task' },
  work:   { color: '#3b82f6', label: 'work' },
  pool:   { color: '#10b981', label: 'focus' },
  meal:   { color: '#a78bfa', label: 'meal' },
  break:  { color: '#64748b', label: 'break' },
  sleep:  { color: '#1e293b', label: 'sleep' },
  buffer: { color: '#374151', label: 'transition' },
};
const PX_PER_MIN = 1.1;
const SNAP = 5;

const dayKey = d => d.toLocaleDateString('en-CA');                 // YYYY-MM-DD, local
const hm = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const muted = { fontSize: 12, color: 'var(--font-color)', opacity: 0.5 };

function NowStrip({ snap, now }) {
  const cur = snap?.now;
  const next = snap?.next;
  if (!cur && !next) return null;
  const pct = cur ? Math.min(100, Math.max(0, (now - new Date(cur.start)) / (new Date(cur.end) - new Date(cur.start)) * 100)) : 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
      {cur && (
        <div style={{ background: 'var(--assistant-color,#101010)', borderRadius: 10, padding: 18, borderLeft: `4px solid ${KIND[cur.kind]?.color}` }}>
          <div style={muted}>now · until {hm(new Date(cur.end))}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--heading-color)', margin: '4px 0 10px' }}>{cur.title}</div>
          <div className={s.progress}><div className={`${s.progressBar} ${s.progressOk}`} style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      {next && (
        <div style={{ background: 'var(--assistant-color,#101010)', borderRadius: 10, padding: 18 }}>
          <div style={muted}>next · {hm(new Date(next.start))}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--heading-color)', marginTop: 4 }}>{next.title}</div>
        </div>
      )}
    </div>
  );
}

function WeekStrip({ days, selected, setSelected, blocksByDay }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 18, overflowX: 'auto' }}>
      {days.map(d => {
        const k = dayKey(d);
        const bl = blocksByDay[k] || [];
        const total = bl.reduce((n, b) => n + b.minutes, 0) || 1;
        return (
          <div key={k} onClick={() => setSelected(k)} style={{
            cursor: 'pointer', minWidth: 96, padding: '8px 10px', borderRadius: 8,
            border: `1px solid ${selected === k ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <div style={{ fontSize: 12, color: 'var(--heading-color)' }}>{d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</div>
            <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
              {Object.entries(bl.reduce((acc, b) => ({ ...acc, [b.kind]: (acc[b.kind] || 0) + b.minutes }), {}))
                .map(([kind, m]) => <div key={kind} style={{ width: `${m / total * 100}%`, background: KIND[kind]?.color }} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Timeline({ day, blocks, now, onSelect, onMove }) {
  const dayStart = useMemo(() => { const d = new Date(`${day}T00:00:00`); return d; }, [day]);
  const [drag, setDrag] = useState(null);         // {id, dy, origStart}
  const ref = useRef(null);
  const top = t => ((t - dayStart) / 60000) * PX_PER_MIN;

  const dragRef = useRef(null);
  useEffect(() => { dragRef.current = drag; }, [drag]);
  useEffect(() => {
    if (!drag) return;
    const move = e => setDrag(d => (d ? { ...d, dy: e.clientY - d.y0 } : d));
    const up = () => {
      const d = dragRef.current;
      setDrag(null);
      if (!d) return;
      if (Math.abs(d.dy) > 3) {
        const mins = Math.round(d.dy / PX_PER_MIN / SNAP) * SNAP;
        if (mins) onMove(d.block, mins);
      } else onSelect(d.block);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  }, [drag !== null, onMove, onSelect]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {   // open scrolled to "now" (or the morning)
    const target = dayKey(now) === day ? top(now) - 120 : top(new Date(`${day}T07:00:00`));
    ref.current?.scrollTo({ top: Math.max(0, target) });
  }, [day]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={ref} style={{ position: 'relative', height: 640, overflowY: 'auto', borderRadius: 10,
                            background: 'var(--assistant-color,#0c0c0c)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ position: 'relative', height: 1440 * PX_PER_MIN }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} style={{ position: 'absolute', top: h * 60 * PX_PER_MIN, left: 0, right: 0,
                                borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 10, opacity: 0.35, paddingLeft: 6 }}>
            {String(h).padStart(2, '0')}:00
          </div>
        ))}
        {blocks.map(b => {
          const st = new Date(b.start), en = new Date(b.end);
          const clipTop = Math.max(0, top(st)), clipBottom = Math.min(1440 * PX_PER_MIN, top(en));
          if (clipBottom <= clipTop) return null;
          const dragging = drag?.block.id === b.id;
          const k = KIND[b.kind] || KIND.buffer;
          const movable = b.source?.type !== 'gcal';
          return (
            <div key={b.id}
                 onPointerDown={e => { if (!movable) { onSelect(b); return; } e.preventDefault(); setDrag({ block: b, y0: e.clientY, dy: 0 }); }}
                 title={`${hm(st)}–${hm(en)} ${b.title}`}
                 style={{
                   position: 'absolute', left: 52, right: 8, top: clipTop + (dragging ? drag.dy : 0),
                   height: Math.max(clipBottom - clipTop - 1, 3), background: k.color,
                   opacity: b.done ? 0.35 : b.kind === 'sleep' ? 0.55 : 0.92, borderRadius: 5, padding: '2px 8px',
                   fontSize: 12, color: '#fff', overflow: 'hidden', cursor: movable ? 'grab' : 'pointer',
                   border: b.tentative ? '1px dashed #fff' : b.pinned ? '1px solid #fff' : 'none',
                   zIndex: dragging ? 5 : 1, touchAction: 'none', userSelect: 'none',
                 }}>
              {clipBottom - clipTop >= 16 && (
                <span>{b.done ? '✓ ' : ''}{b.pinned ? '📌 ' : ''}<b>{hm(st)}</b> {b.title}</span>
              )}
            </div>
          );
        })}
        {dayKey(now) === day && (
          <div style={{ position: 'absolute', left: 40, right: 0, top: top(now), borderTop: '2px solid #f87171', zIndex: 6 }} />
        )}
      </div>
    </div>
  );
}

function BlockPanel({ b, onClose, act }) {
  if (!b) return null;
  const st = new Date(b.start), en = new Date(b.end);
  const shift = mins => act('move', b, mins);
  return (
    <div style={{ background: 'var(--assistant-color,#101010)', borderRadius: 10, padding: 20, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={muted}>{KIND[b.kind]?.label}{b.tentative ? ' · tentative' : ''}{b.pinned ? ' · pinned' : ''}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--heading-color)', margin: '6px 0' }}>{b.title}</div>
      <div style={{ fontSize: 13 }}>{st.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })} · {hm(st)}–{hm(en)} · {b.minutes} min</div>
      {b.source?.type === 'mail' && (
        <div style={{ ...muted, marginTop: 8 }}>from mail ({b.source.account}): <Link href="/desk/inbox">{b.source.subject}</Link></div>
      )}
      {b.source?.type === 'gcal' && <div style={{ ...muted, marginTop: 8 }}>from your Google Calendar ({b.source.calendar})</div>}
      {b.source?.location && <div style={{ ...muted }}>at {b.source.location}</div>}
      <div className={s.btnGroup} style={{ marginTop: 14, flexWrap: 'wrap' }}>
        {b.source?.type !== 'gcal' && <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => act('done', b, !b.done)}>{b.done ? 'Not done' : 'Done'}</button>}
        {b.source?.type !== 'gcal' && <button className={s.btn} onClick={() => shift(-15)}>−15 min</button>}
        {b.source?.type !== 'gcal' && <button className={s.btn} onClick={() => shift(15)}>+15 min</button>}
        {b.source?.type !== 'gcal' && !b.pinned && <button className={s.btn} onClick={() => shift(0)}>Pin here</button>}
        {b.pinned && <button className={s.btn} onClick={() => act('unpin', b)}>Unpin</button>}
        <button className={s.btn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function Settings({ onSaved }) {
  const [cfg, setCfg] = useState(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { fetch('/api/desk/plan/settings').then(r => r.json()).then(setCfg); }, []);
  if (!cfg) return <div style={muted}>loading settings…</div>;
  const setPool = (i, k, v) => setCfg(c => ({ ...c, pools: c.pools.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
  async function save() {
    const r = await fetch('/api/desk/plan/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
    const d = await r.json();
    setMsg(r.ok ? 'saved — re-planning' : d.detail || d.error);
    if (r.ok) { setCfg(d); onSaved?.(); }
  }
  const input = { background: 'var(--bg-color)', border: '1px solid var(--border-color, #333)', color: 'var(--font-color)', padding: '4px 8px', borderRadius: 4, fontSize: 13, width: 80 };
  return (
    <div style={{ background: 'var(--assistant-color,#101010)', borderRadius: 10, padding: 20, marginTop: 24 }}>
      <div style={{ fontWeight: 700, color: 'var(--heading-color)', marginBottom: 6 }}>What fills free time</div>
      <div style={{ ...muted, marginBottom: 12 }}>
        Free minutes are split by water-filling: each pool returns w·log(1 + t/τ) — weight w is how much it matters,
        τ how quickly its returns flatten. Because those returns are concave, the split is optimal; one shadow price
        per day is shown below the timeline.
      </div>
      {cfg.pools.map((p, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <input style={{ ...input, width: 200 }} value={p.title} onChange={e => setPool(i, 'title', e.target.value)} />
          <span style={muted}>w</span><input style={input} type="number" step="0.5" value={p.weight} onChange={e => setPool(i, 'weight', Number(e.target.value))} />
          <span style={muted}>τ</span><input style={input} type="number" step="5" value={p.tau} onChange={e => setPool(i, 'tau', Number(e.target.value))} />
          <button className={s.btn} onClick={() => setCfg(c => ({ ...c, pools: c.pools.filter((_, j) => j !== i) }))}>remove</button>
        </div>
      ))}
      <button className={s.btn} onClick={() => setCfg(c => ({ ...c, pools: [...c.pools, { id: `pool${Date.now() % 100000}`, title: 'New pool', weight: 1, tau: 30 }] }))}>add pool</button>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16, fontSize: 13 }}>
        <label>workday <input style={input} value={cfg.workday.start} onChange={e => setCfg(c => ({ ...c, workday: { ...c.workday, start: e.target.value } }))} />–
          <input style={input} value={cfg.workday.end} onChange={e => setCfg(c => ({ ...c, workday: { ...c.workday, end: e.target.value } }))} /></label>
        <label>sleep (if no Garmin) <input style={input} value={cfg.sleep.start} onChange={e => setCfg(c => ({ ...c, sleep: { ...c.sleep, start: e.target.value } }))} />–
          <input style={input} value={cfg.sleep.end} onChange={e => setCfg(c => ({ ...c, sleep: { ...c.sleep, end: e.target.value } }))} /></label>
      </div>
      <div className={s.btnGroup} style={{ marginTop: 16 }}>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={save}>Save</button>
        {msg && <span style={muted}>{msg}</span>}
      </div>
    </div>
  );
}

export default function PlanPage() {
  const router = useRouter();
  const [snap, setSnap] = useState(null);
  const [live, setLive] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => dayKey(new Date()));
  const [selected, setSelected] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  useEffect(() => { if (router.query.at) setSelectedDay(dayKey(new Date(router.query.at))); }, [router.query.at]);

  useEffect(() => {
    fetch('/api/desk/plan/now').then(r => r.json()).then(d => !d.error && setSnap(d)).catch(() => {});
    const es = new EventSource('/api/desk/plan/stream');
    es.addEventListener('plan', e => setSnap(JSON.parse(e.data)));
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  const blocksByDay = useMemo(() => {
    const out = {};
    for (const b of snap?.blocks || []) {
      // a block belongs to every day it touches (sleep crosses midnight)
      const st = new Date(b.start), en = new Date(b.end);
      for (let d = new Date(st.getFullYear(), st.getMonth(), st.getDate()); d < en; d.setDate(d.getDate() + 1)) {
        (out[dayKey(d)] = out[dayKey(d)] || []).push(b);
      }
    }
    return out;
  }, [snap]);

  const days = useMemo(() => {
    const base = new Date(); base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + i));
  }, []);

  const post = (path, body) => fetch(`/api/desk/plan/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  const act = useCallback(async (what, b, arg) => {
    if (what === 'done') await post('done', { block_id: b.id, done: arg });
    if (what === 'unpin') await post('unpin', { pin_id: b.id });
    if (what === 'move') {
      const ms = arg * 60000;
      await post('pin', { block_id: b.id, start: new Date(new Date(b.start).getTime() + ms).toISOString(),
                          end: new Date(new Date(b.end).getTime() + ms).toISOString() });
    }
    setSelected(null);
  }, []);

  const onMove = useCallback((b, mins) => act('move', b, mins), [act]);
  const dayReport = (snap?.days || []).find(d => d.date === selectedDay);

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Plan — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Desk · Plan</span>
        </p>
        <h1 className="title text-uppercase">Plan</h1>
        <p style={{ fontSize: 13, marginTop: 12, opacity: 0.6 }}>
          <span style={{ color: live ? '#34d399' : '#fbbf24' }}>●</span> {live ? 'live' : 'reconnecting…'}
          {snap?.inputs && ` · ${snap.inputs.tasks} tasks · ${snap.inputs.mail_events} from mail · ${snap.inputs.calendar_events} from calendar · ${snap.inputs.pins} pinned`}
          {' · '}<Link href="/desk/inbox">inbox</Link>
        </p>
      </HeaderNormal>

      <section className="container section-margin" data-dsn-title="Plan">
        {snap?.error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{snap.error}</div>}
        <NowStrip snap={snap} now={now} />

        {!!snap?.at_risk?.length && (
          <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 18, background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', fontSize: 13 }}>
            {snap.at_risk.map(r => (
              <div key={r.task}>⚠ {r.title} — {r.late ? 'can only finish after' : 'not enough time before'} {r.due ? new Date(r.due).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'its deadline'}{r.unplaced_minutes ? ` (${r.unplaced_minutes} min unplaced)` : ''}</div>
            ))}
          </div>
        )}

        <WeekStrip days={days} selected={selectedDay} setSelected={setSelectedDay} blocksByDay={blocksByDay} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: 20 }}>
          <Timeline day={selectedDay} blocks={blocksByDay[selectedDay] || []} now={now} onSelect={setSelected} onMove={onMove} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <BlockPanel b={selected} onClose={() => setSelected(null)} act={act} />
            {dayReport && (
              <div style={{ background: 'var(--assistant-color,#101010)', borderRadius: 10, padding: 18, fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: 'var(--heading-color)', marginBottom: 8 }}>Free time this day</div>
                <div style={muted}>{dayReport.free_minutes} min · price {dayReport.price ? dayReport.price.toFixed(4) : '—'}</div>
                {Object.entries(dayReport.allocation || {}).filter(([, m]) => m > 0).map(([pool, m]) => (
                  <div key={pool} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{pool}</span><span>{m} min</span></div>
                ))}
              </div>
            )}
            <div style={{ ...muted }}>
              Google Calendar (read-only, avoids appointments made there): {snap?.gcal?.enabled ? `${snap.gcal.busy_events ?? 0} busy events` : snap?.gcal?.detail || 'off'}
              {snap?.gcal?.read_error && <div style={{ color: '#fca5a5' }}>{snap.gcal.read_error}</div>}
            </div>
            <div className={s.btnGroup}>
              <button className={s.btn} onClick={() => post('replan', {})}>Re-plan now</button>
              <button className={s.btn} onClick={() => setShowSettings(v => !v)}>{showSettings ? 'Hide settings' : 'Settings'}</button>
            </div>
            <div style={muted}>
              {Object.entries(KIND).map(([k, v]) => <span key={k} style={{ marginRight: 10 }}><span style={{ color: v.color }}>■</span> {v.label}</span>)}
            </div>
          </div>
        </div>
        {showSettings && <Settings onSaved={() => post('replan', {})} />}
      </section>

      <Footer className="background-section" />
    </Layout>
  );
}
