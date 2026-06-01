import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../layout/Layout';
import Footer from '../components/footer/Footer';
import s from '../styles/desk.module.css';

// ── helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLOR = { high: '#f87171', normal: 'var(--theme-color)', low: 'rgba(187,187,187,0.35)' };
const CATEGORY_LABEL = { general: 'gen', research: 'res', health: 'hlth', admin: 'adm' };

function fmtDuration(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtNum(n) { return n == null ? '—' : Number(n).toLocaleString(); }

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return '';
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PanelShell({ title, sub, children }) {
  return (
    <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontFamily: 'var(--heading-font)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--font-color)', opacity: 0.4 }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.22 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function StatPill({ label, value, unit, color, sub, pct }) {
  return (
    <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 7, padding: '12px 14px' }}>
      <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.3, marginBottom: 5 }}>{label}</div>
      <div style={{ fontFamily: 'var(--heading-font)', fontSize: 24, fontWeight: 700, color: color || 'var(--heading-color)', lineHeight: 1 }}>
        {value}<span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3, opacity: 0.5 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--font-color)', opacity: 0.35, marginTop: 3 }}>{sub}</div>}
      {pct != null && (
        <div style={{ height: 3, background: 'var(--assistant-color)', borderRadius: 2, overflow: 'hidden', marginTop: 7 }}>
          <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color || 'var(--theme-color)', borderRadius: 2, transition: 'width 0.6s ease' }} />
        </div>
      )}
    </div>
  );
}

// ── Weather widget ────────────────────────────────────────────────────────────

function WeatherWidget() {
  const [w, setW] = useState(null);

  useEffect(() => {
    fetch('/api/desk/weather').then(r => r.json()).then(setW).catch(() => {});
  }, []);

  if (!w || w.error) return null;
  const c = w.current;

  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  return (
    <div style={{ textAlign: 'right' }}>
      {/* Current */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>
        <span style={{ fontFamily: 'var(--heading-font)', fontSize: 32, fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.temp}°</span>
        <span style={{ fontSize: 13, color: 'var(--font-color)', opacity: 0.5 }}>{c.label}</span>
      </div>
      <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.3, marginTop: 3, marginBottom: 10 }}>
        {w.city} · feels {c.feels_like}° · wind {c.wind} km/h · {c.humidity}% hum.
      </div>
      {/* Forecast strip */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {(w.forecast || []).slice(1, 5).map((day, i) => {
          const d = new Date(day.date);
          return (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: 'var(--font-color)', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{DAYS[d.getDay()]}</div>
              <div style={{ fontSize: 12, color: day.color, fontWeight: 600, marginTop: 2 }}>{day.max}°</div>
              <div style={{ fontSize: 10, color: 'var(--font-color)', opacity: 0.3 }}>{day.min}°</div>
              {day.precip > 20 && <div style={{ fontSize: 9, color: '#60a5fa', opacity: 0.7 }}>{day.precip}%</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Clock ─────────────────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDate(d.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <div style={{ fontFamily: 'var(--heading-font)', fontSize: 56, fontWeight: 700, color: 'var(--heading-color)', lineHeight: 1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {time}
      </div>
      <div style={{ fontSize: 13, color: 'var(--font-color)', opacity: 0.35, marginTop: 8 }}>{date}</div>
    </div>
  );
}

// ── Health panel ──────────────────────────────────────────────────────────────

function HealthPanel() {
  const [health, setHealth] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    fetch('/api/desk/health')
      .then(r => r.json())
      .then(d => { setHealth(d); setStatus(d.configured ? (d.error ? 'error' : 'ok') : 'unconfigured'); })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'loading') {
    return (
      <PanelShell title="Health · Garmin">
        <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.3 }}>Connecting to Garmin…</div>
      </PanelShell>
    );
  }

  if (status === 'unconfigured') {
    return (
      <PanelShell title="Health · Garmin">
        <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.4, lineHeight: 1.8 }}>
          Add to <code style={{ color: 'var(--theme-color)', fontSize: 11 }}>.env.local</code>:
          <br />
          <code style={{ color: 'var(--font-color)', opacity: 0.6, fontSize: 11 }}>GARMIN_EMAIL=you@example.com</code>
          <br />
          <code style={{ color: 'var(--font-color)', opacity: 0.6, fontSize: 11 }}>GARMIN_PASSWORD=yourpassword</code>
        </div>
      </PanelShell>
    );
  }

  if (status === 'error') {
    return <PanelShell title="Health · Garmin"><div style={{ fontSize: 12, color: '#f87171' }}>{health?.error || 'Garmin fetch failed'}</div></PanelShell>;
  }

  const d    = health?.data  || {};
  const slp  = d.sleep       || {};
  const hrv  = d.hrv         || {};
  const act  = d.activity    || {};
  const bb   = d.body_battery;
  const spo2 = d.spo2;

  const sleepColor = !slp.score ? 'var(--font-color)' : slp.score >= 80 ? '#4ade80' : slp.score >= 60 ? '#fbbf24' : '#f87171';
  const bbVal = Array.isArray(bb?.data) && bb.data.length ? bb.data[bb.data.length - 1]?.value : null;
  const bbColor = bbVal == null ? 'var(--font-color)' : bbVal >= 70 ? '#4ade80' : bbVal >= 40 ? '#fbbf24' : '#f87171';
  const stressColor = !act.avg_stress ? 'var(--font-color)' : act.avg_stress <= 25 ? '#4ade80' : act.avg_stress <= 50 ? '#fbbf24' : '#f87171';
  const stepPct = act.steps && act.step_goal ? Math.round((act.steps / act.step_goal) * 100) : null;

  return (
    <PanelShell title="Health · Garmin" sub={d.date}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <StatPill label="Sleep"        value={fmtDuration(slp.duration_seconds)} color={sleepColor}
          sub={slp.score ? `score ${slp.score}` : undefined}
          pct={slp.duration_seconds ? Math.min(100, Math.round(slp.duration_seconds / 288)) : null} />
        <StatPill label="HRV"          value={hrv.last_night ?? '—'} unit="ms" color="#a78bfa"
          sub={hrv.status?.toLowerCase()} />
        <StatPill label="Body Battery" value={bbVal ?? '—'} unit="/100" color={bbColor} pct={bbVal} />
        <StatPill label="Steps"        value={fmtNum(act.steps)} color="var(--theme-color)"
          sub={act.step_goal ? `goal ${fmtNum(act.step_goal)}` : undefined} pct={stepPct} />
        <StatPill label="Stress"       value={act.avg_stress ?? '—'} unit="/100" color={stressColor} sub="avg today" />
        <StatPill label="Resting HR"   value={act.resting_hr ?? '—'} unit="bpm" color="#60a5fa" />
      </div>

      {slp.duration_seconds && (
        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.25, marginBottom: 5 }}>Sleep stages</div>
          <div style={{ display: 'flex', gap: 3, height: 6, borderRadius: 3, overflow: 'hidden' }}>
            {[
              { sec: slp.deep_seconds,  color: '#60a5fa', label: 'Deep'  },
              { sec: slp.light_seconds, color: '#a78bfa', label: 'Light' },
              { sec: slp.rem_seconds,   color: '#fbbf24', label: 'REM'   },
              { sec: slp.awake_seconds, color: 'rgba(187,187,187,0.2)', label: 'Awake' },
            ].filter(x => x.sec).map(({ sec, color, label }) => (
              <div key={label} style={{ flex: sec, background: color }} title={`${label}: ${fmtDuration(sec)}`} />
            ))}
          </div>
        </div>
      )}

      {spo2 && <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.35 }}>SpO₂ avg {spo2.average}% · low {spo2.lowest}%</div>}
    </PanelShell>
  );
}

// ── Todos panel ───────────────────────────────────────────────────────────────

function TodosPanel() {
  const [todos,    setTodos]    = useState([]);
  const [input,    setInput]    = useState('');
  const [priority, setPriority] = useState('normal');
  const [category, setCategory] = useState('general');
  const [adding,   setAdding]   = useState(false);

  const load = useCallback(() => fetch('/api/desk/todos').then(r => r.json()).then(setTodos).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  async function addTodo(e) {
    e.preventDefault();
    if (!input.trim()) return;
    setAdding(true);
    await fetch('/api/desk/todos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input.trim(), priority, category }),
    });
    setInput(''); setAdding(false); load();
  }

  async function toggle(todo) {
    await fetch('/api/desk/todos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: todo.id, done: !todo.done }) });
    load();
  }

  async function del(id) {
    await fetch(`/api/desk/todos?id=${id}`, { method: 'DELETE' });
    load();
  }

  const open = (todos || []).filter(t => !t.done).sort((a, b) =>
    ['high', 'normal', 'low'].indexOf(a.priority) - ['high', 'normal', 'low'].indexOf(b.priority)
  );
  const done = (todos || []).filter(t => t.done).slice(0, 4);

  return (
    <PanelShell title="To-do" sub={open.length > 0 ? `${open.length} open` : 'clear'}>
      <form onSubmit={addTodo} style={{ display: 'flex', gap: 5 }}>
        <input className={s.urlInput} value={input} onChange={e => setInput(e.target.value)}
          placeholder="Add task…" style={{ flex: 1, fontSize: 12, padding: '5px 8px' }} />
        <select className={s.statusSelect} value={priority} onChange={e => setPriority(e.target.value)} style={{ fontSize: 10 }}>
          <option value="high">!</option>
          <option value="normal">·</option>
          <option value="low">↓</option>
        </select>
        <select className={s.statusSelect} value={category} onChange={e => setCategory(e.target.value)} style={{ fontSize: 10 }}>
          <option value="general">gen</option>
          <option value="research">res</option>
          <option value="health">hlth</option>
          <option value="admin">adm</option>
        </select>
        <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={adding || !input.trim()} style={{ fontSize: 11, padding: '5px 10px' }}>+</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {open.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div onClick={() => toggle(t)} style={{ width: 13, height: 13, border: `1.5px solid ${PRIORITY_COLOR[t.priority]}`, borderRadius: 3, cursor: 'pointer', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--font-color)', lineHeight: 1.4 }}>{t.text}</span>
            <span style={{ fontSize: 9, color: PRIORITY_COLOR[t.priority], opacity: 0.65, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{CATEGORY_LABEL[t.category] || t.category}</span>
            <button onClick={() => del(t.id)} style={{ background: 'none', border: 'none', color: 'var(--font-color)', opacity: 0.15, cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
          </div>
        ))}
        {done.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', opacity: 0.28, borderBottom: '1px solid var(--border-color)' }}>
            <div onClick={() => toggle(t)} style={{ width: 13, height: 13, background: 'rgba(187,187,187,0.4)', borderRadius: 3, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: 'var(--bg-color)' }}>✓</div>
            <span style={{ flex: 1, fontSize: 12, color: 'var(--font-color)', textDecoration: 'line-through' }}>{t.text}</span>
          </div>
        ))}
        {open.length === 0 && done.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.25, padding: '8px 0' }}>Nothing pending.</div>
        )}
      </div>
    </PanelShell>
  );
}

// ── Desk status ───────────────────────────────────────────────────────────────

function DeskStatusPanel() {
  const [docs, setDocs]   = useState(null);
  const [jobs, setJobs]   = useState(null);
  const [jrn,  setJrn]   = useState(null);

  useEffect(() => {
    fetch('/api/desk/documents').then(r => r.json()).then(setDocs).catch(() => {});
    fetch('/api/desk/jobs').then(r => r.json()).then(setJobs).catch(() => {});
    fetch('/api/desk/journals').then(r => r.json()).then(setJrn).catch(() => {});
  }, []);

  const urgent  = Object.values(docs || {}).filter(d => ['expired','overdue','urgent'].includes(d.urgency));
  const active  = (jobs || []).filter(j => !['rejected','withdrawn'].includes(j.status));
  const pending = (jrn  || []).filter(j => j.status === 'pending');

  const links = [
    { href: '/desk/documents', label: 'Documents', value: docs ? (urgent.length ? `${urgent.length} need action` : `${Object.keys(docs).length} tracked`) : '…', color: urgent.length ? '#f87171' : '#34d399', dot: urgent.length > 0 },
    { href: '/desk/jobs',      label: 'Jobs',       value: jobs ? `${active.length} active`  : '…',  color: '#60a5fa' },
    { href: '/desk/inbox',     label: 'Journals',   value: jrn  ? `${pending.length} pending` : '…', color: 'var(--theme-color)' },
    { href: '/desk/academic',  label: 'Academic',   value: '34 papers',     color: '#a78bfa' },
    { href: '/desk/repos',     label: 'Repos',      value: '63 repos',      color: '#fb923c' },
  ];

  return (
    <PanelShell title="Desk">
      {links.map(l => (
        <Link key={l.href} href={l.href} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ width: 3, height: 18, background: l.color, borderRadius: 2, flexShrink: 0, opacity: 0.8 }} />
          <span style={{ flex: 1, fontSize: 13, color: 'var(--font-color)' }}>{l.label}</span>
          <span style={{ fontSize: 12, color: l.dot ? '#f87171' : l.color, opacity: 0.75 }}>{l.value}</span>
          <span style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.18 }}>→</span>
        </Link>
      ))}
    </PanelShell>
  );
}

// ── Feed panel ────────────────────────────────────────────────────────────────

function FeedPanel() {
  const [items,  setItems]  = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetch('/api/desk/feed')
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]));
  }, []);

  const sources = items ? [...new Set(items.filter(i => i.source).map(i => i.source))] : [];
  const shown   = (items || []).filter(i => filter === 'all' || i.source === filter).slice(0, 24);

  return (
    <PanelShell title="Research feed" sub={items ? `${items.length} items` : '…'}>
      {sources.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setFilter('all')} className={`${s.btn} ${filter === 'all' ? s.btnPrimary : ''}`} style={{ fontSize: 10, padding: '3px 9px' }}>all</button>
          {sources.map(src => (
            <button key={src} onClick={() => setFilter(src)} className={`${s.btn} ${filter === src ? s.btnPrimary : ''}`} style={{ fontSize: 10, padding: '3px 9px' }}>
              {src.split('·')[0].trim().toLowerCase()}
            </button>
          ))}
        </div>
      )}
      {!items && <div style={{ fontSize: 12, opacity: 0.25 }}>Fetching research feeds…</div>}
      <div style={{ columns: 2, gap: 24 }}>
        {shown.map((item, i) => !item.error && (
          <div key={i} style={{ breakInside: 'avoid', padding: '9px 0', borderBottom: '1px solid var(--border-color)' }}>
            <a href={item.link} target="_blank" rel="noreferrer"
              style={{ fontSize: 13, color: 'var(--heading-color)', textDecoration: 'none', lineHeight: 1.4, display: 'block', marginBottom: 3 }}
              onMouseEnter={e => e.currentTarget.style.color = item.color || 'var(--theme-color)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--heading-color)'}
            >
              {item.title}
            </a>
            <div style={{ fontSize: 10, color: item.color || 'var(--theme-color)', opacity: 0.6 }}>
              {item.source}
              {item.published && <span style={{ color: 'var(--font-color)', opacity: 0.3, marginLeft: 8 }}>{timeAgo(item.published)}</span>}
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Mission Control</title>
        <meta name="robots" content="noindex" />
      </Head>

      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border-color)', padding: '52px 0 44px' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
          <Clock />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 }}>
            <WeatherWidget />
            <div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.28em', color: 'var(--font-color)', opacity: 0.18, marginBottom: 5 }}>Mission Control</div>
              <div style={{ display: 'flex', gap: 14 }}>
                <Link href="/desk" style={{ fontSize: 12, color: 'var(--theme-color)', textDecoration: 'none', opacity: 0.6 }}>Desk →</Link>
                <Link href="/desk/travel" style={{ fontSize: 12, color: '#60a5fa', textDecoration: 'none', opacity: 0.6 }}>Travel →</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Health + Todos + Desk */}
      <section className="container section-margin">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr 1fr', gap: 20, alignItems: 'start' }}>
          <HealthPanel />
          <TodosPanel />
          <DeskStatusPanel />
        </div>
      </section>

      {/* Row 2: Feed */}
      <section className="container section-margin">
        <FeedPanel />
      </section>

      <Footer className="background-section" />
    </Layout>
  );
}
