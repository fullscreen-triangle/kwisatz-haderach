import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MetroMap, { MODES, MODE_ORDER, LANE_H, layoutRows, lineColors, makeScale } from '../../components/runtime/MetroMap';
import { C, CSS, Reader, post, sans, pill } from '../../components/console/Reader';

// Runtime — everything in motion as a city's transit network (backend/network.py):
// U-Bahn = projects, S-Bahn = plans, Tram = repos, Bus = mail commitments. Stations behind
// "now" are done, ahead are coming (at their date, or when the planner has booked the work);
// interchanges are real links between lines. Tap a line for its timetable, a station for its
// card, and "Open" for the thing itself.

const LABEL_W = 118;
const QUIET_DAYS = 21;
const ZOOMS = [0.7, 1, 1.5, 2.3, 3.5];
const STATE = {
  past: ['done', '#5CC98A'], next: ['next stop', '#FFFFFF'], future: ['coming', '#B4BECC'], late: ['late', '#EF6B6B'],
  due: ['due now', '#E0A93E'], blocked: ['blocked', '#9AA3B2'],
};

function Badge({ line, color }) {
  const m = MODES[line.mode];
  const r = m.shape === 'circle' ? 13 : m.shape === 'square' ? 3 : 7;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 30, height: 24,
                   padding: '0 6px', borderRadius: r, background: color || m.badge, color: '#fff', fontWeight: 800,
                   fontSize: 12, letterSpacing: '0.02em', boxShadow: `inset 0 0 0 2px ${m.badge}` }}>{line.code}</span>
  );
}

const fmt = iso => (iso ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short',
                                                                     hour: '2-digit', minute: '2-digit' }) : 'no date yet');

function StationCard({ station, line, color, data, lineOf, onOpen, onSelect, onTimetable }) {
  const [label, col] = STATE[station.state] || [station.state, C.soft];
  const links = data.transfers.filter(t => t.a === station.id || t.b === station.id).map(t => {
    const other = t.a === station.id ? t.b : t.a;
    const l = lineOf[other];
    return l && { other, line: l.line, st: l.station, why: t.why };
  }).filter(Boolean);
  const placed = { scheduled: 'when the planner has booked it', queued: 'queued — no date and not scheduled yet' }[station.placed];
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <Badge line={line} color={color} />
        <button onClick={onTimetable} style={{ ...linkish, color: C.soft }}>{line.name} ›</button>
      </div>
      <div style={{ color: C.ink, fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>{station.title}</div>
      <div style={{ marginTop: 6, fontSize: 13, color: C.soft }}>
        <span style={{ color: col, fontWeight: 700 }}>{label}</span> · {fmt(station.at)}
        {placed && <span style={{ color: C.faint }}> · {placed}</span>}
      </div>
      {station.blocked && <div style={{ marginTop: 6, fontSize: 13, color: C.warn }}>⛔ {station.blocked}</div>}
      {station.note && <div style={{ marginTop: 6, fontSize: 13, color: C.faint }}>{station.note}</div>}
      {!!links.length && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Change here</div>
          {links.map(k => (
            <div key={k.other} onClick={() => onSelect(k.st, k.line)} style={{ display: 'flex', gap: 8, alignItems: 'center',
                 padding: '8px 0', borderBottom: `1px solid ${C.line}`, cursor: 'pointer' }}>
              <Badge line={k.line} color={lineOf[k.other].color} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.ink, fontSize: 14 }}>{k.st.title}</div>
                <div style={{ color: C.faint, fontSize: 12 }}>{k.why}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {station.ref && (
        <div style={{ marginTop: 14 }}><button style={{ ...pill, background: C.signal, color: C.ground, border: 'none', fontWeight: 700 }}
                onClick={() => onOpen(station.ref)}>Open</button></div>
      )}
    </div>
  );
}

function Timetable({ line, color, onSelect, selected, onOpen }) {
  const [done, total] = line.progress;
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <Badge line={line} color={color} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: C.ink, fontSize: 17, fontWeight: 600 }}>{line.name}</div>
          <div style={{ color: C.faint, fontSize: 12 }}>{MODES[line.mode].label} · {MODES[line.mode].what}{line.sub ? ` · ${line.sub}` : ''}</div>
        </div>
      </div>
      <div style={{ height: 6, background: C.panel2, borderRadius: 3, margin: '12px 0 4px', overflow: 'hidden' }}>
        <div style={{ width: `${total ? (100 * done) / total : 0}%`, height: '100%', background: color }} />
      </div>
      <div style={{ color: C.faint, fontSize: 12, marginBottom: 8 }}>{done} of {total} stations passed
        {line.ref && <button style={{ ...linkish, marginLeft: 10 }} onClick={() => onOpen(line.ref)}>open {line.ref.kind} ›</button>}
      </div>
      <div style={{ position: 'relative', paddingLeft: 22 }}>
        <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 5, background: color, borderRadius: 3, opacity: 0.8 }} />
        {line.stations.map(s => {
          const [label, col] = STATE[s.state] || [s.state, C.soft];
          return (
            <div key={s.id} onClick={() => onSelect(s, line)} style={{ position: 'relative', padding: '7px 0', cursor: 'pointer',
                 background: selected === s.id ? C.panel2 : 'transparent', borderRadius: 6 }}>
              <span style={{ position: 'absolute', left: -19, top: 11, width: 11, height: 11, borderRadius: 6,
                             background: s.state === 'past' ? color : C.ground, border: `2px solid ${s.state === 'past' ? C.ground : col}` }} />
              <div style={{ color: s.state === 'past' ? C.faint : C.ink, fontSize: 14, fontWeight: s.state === 'next' ? 700 : 400 }}>{s.title}</div>
              <div style={{ color: C.faint, fontSize: 12 }}><span style={{ color: col }}>{label}</span> · {fmt(s.at)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const linkish = { background: 'none', border: 'none', color: C.signal, cursor: 'pointer', padding: 0, fontSize: 13 };

export default function Runtime() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [modes, setModes] = useState({ U: true, S: true, T: true, B: true });
  const [quiet, setQuiet] = useState(false);
  const [zi, setZi] = useState(1);
  const [focus, setFocus] = useState(null);          // line id highlighted
  const [sel, setSel] = useState(null);              // {station, line} or {line}
  const [doc, setDoc] = useState(null);
  const [toast, setToast] = useState('');
  const scroller = useRef(null);
  const [viewW, setViewW] = useState(390);

  const load = useCallback(() => fetch('/api/desk/console/network').then(r => r.json())
    .then(d => { if (d.lines) { setData(d); setErr(''); } else setErr(d.error || d.detail || 'could not load the network'); })
    .catch(() => setErr('offline')), []);

  useEffect(() => {
    load();
    let t = null;
    const es = new EventSource('/api/desk/console/feed/stream');    // anything moved -> redraw
    es.addEventListener('feed', () => { clearTimeout(t); t = setTimeout(load, 1500); });
    const tick = setInterval(load, 5 * 60e3);                        // "now" moves on its own
    const measure = () => setViewW(scroller.current?.clientWidth || window.innerWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => { es.close(); clearInterval(tick); clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [load]);

  const colors = useMemo(() => (data ? lineColors(data.lines) : {}), [data]);
  const cutoff = data ? Date.parse(data.now) - QUIET_DAYS * 86400e3 : 0;
  const isQuiet = l => l.stations.every(s => s.state === 'past') && Date.parse(l.stations[l.stations.length - 1]?.at || 0) < cutoff;
  const visible = useMemo(() => (data ? data.lines.filter(l => modes[l.mode] && (quiet || !isQuiet(l))) : []),
                          [data, modes, quiet]); // eslint-disable-line react-hooks/exhaustive-deps
  const quietCount = data ? data.lines.filter(l => modes[l.mode] && isQuiet(l)).length : 0;
  const width = Math.round(Math.max(900, viewW * 1.6) * ZOOMS[zi]);
  const { rows, height } = useMemo(() => layoutRows(visible, colors), [visible, colors]);

  const lineOf = useMemo(() => {
    const out = {};
    for (const l of data?.lines || []) for (const s of l.stations) out[s.id] = { line: l, station: s, color: colors[l.id] };
    return out;
  }, [data, colors]);

  // keep "now" in view: on first load and whenever the zoom changes
  const nowRef = useRef(null);
  useEffect(() => {
    if (!data || !scroller.current) return;
    const nx = makeScale(visible, Date.parse(data.now), width)(new Date(data.now));
    if (nowRef.current === `${zi}`) return;
    nowRef.current = `${zi}`;
    scroller.current.scrollLeft = Math.max(0, nx + LABEL_W - scroller.current.clientWidth * 0.45);
  }, [data, zi, width, visible]);

  const read = useCallback(async ({ kind, ref }) => {
    const path = ['read', kind, ...String(ref).split('/')].map(encodeURIComponent).join('/');
    const d = await fetch(`/api/desk/console/${path}`).then(r => r.json()).catch(() => null);
    if (d && !d.error && !d.detail) setDoc(d);
  }, []);
  const readKR = useCallback((kind, ref) => read({ kind, ref }), [read]);
  const run = useCallback(async (text, tool, args) => {
    const r = await post('/api/desk/agents/runs', tool ? { text, tool, args } : { text }).catch(() => null);
    setDoc(null);
    setToast(r?.id ? 'Started — see it on the console' : 'Could not start that');
    setTimeout(() => setToast(''), 3500);
  }, []);

  const selectStation = (station, line) => { setSel({ station, line }); setFocus(null); };
  const selectLine = line => { setSel({ line }); setFocus(f => (f === line.id ? null : line.id)); };

  const chip = on => ({ ...pill, padding: '6px 11px', fontSize: 12, opacity: on ? 1 : 0.45 });

  return (
    <div style={{ minHeight: '100vh', background: C.ground, color: C.ink, fontFamily: sans }}>
      <Head>
        <title>Runtime · Agent Smith</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={C.ground} />
        <link rel="icon" href="/img/favicon.ico" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ padding: '14px 16px 10px', maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <div style={{ fontWeight: 700 }}>Runtime <span style={{ color: C.faint, fontWeight: 400, fontSize: 13 }}>· the network</span></div>
          <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
            {[['console', '/desk/console'], ['brief', '/desk/brief'], ['plan', '/desk/plan']].map(([l, h]) => (
              <Link key={h} href={h} style={{ color: C.faint, textDecoration: 'none' }}>{l}</Link>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {MODE_ORDER.map(m => {
            const n = data?.lines.filter(l => l.mode === m).length || 0;
            return (
              <button key={m} onClick={() => setModes(v => ({ ...v, [m]: !v[m] }))} style={chip(modes[m])}>
                <span style={{ display: 'inline-block', width: 9, height: 9, marginRight: 6, background: MODES[m].badge,
                               borderRadius: MODES[m].shape === 'circle' ? 5 : 2 }} />
                {MODES[m].label} <span style={{ color: C.faint }}>{MODES[m].what} {n}</span>
              </button>
            );
          })}
          {quietCount > 0 && <button onClick={() => setQuiet(q => !q)} style={chip(quiet)}>{quiet ? 'hide' : 'show'} {quietCount} quiet</button>}
          <span style={{ flex: 1 }} />
          <button onClick={() => setZi(z => Math.max(0, z - 1))} style={chip(zi > 0)}>−</button>
          <button onClick={() => setZi(z => Math.min(ZOOMS.length - 1, z + 1))} style={chip(zi < ZOOMS.length - 1)}>+</button>
        </div>
      </div>

      {err && <div style={{ color: C.bad, padding: '0 16px' }}>{err}</div>}
      {!data && !err && <div style={{ color: C.faint, padding: '0 16px' }}>drawing the network…</div>}
      {data?.errors?.length > 0 && <div style={{ color: C.warn, fontSize: 12, padding: '0 16px' }}>partly drawn: {data.errors.join('; ')}</div>}

      {data && (
        <div ref={scroller} style={{ overflow: 'auto', WebkitOverflowScrolling: 'touch', borderTop: `1px solid ${C.line}`,
                                     paddingBottom: sel ? '46vh' : 20 }}>
          <div style={{ display: 'flex', width: LABEL_W + width, position: 'relative' }}>
            <div style={{ position: 'sticky', left: 0, zIndex: 3, width: LABEL_W, flexShrink: 0, height,
                          background: `linear-gradient(90deg, ${C.ground} 85%, rgba(11,14,19,0))` }}>
              {rows.map(r => (r.kind === 'group' ? (
                <div key={r.mode} style={{ position: 'absolute', top: r.y + 6, left: 12, fontSize: 10, color: C.faint,
                                           textTransform: 'uppercase', letterSpacing: '0.1em' }}>{MODES[r.mode].label}</div>
              ) : (
                <div key={r.line.id} onClick={() => selectLine(r.line)}
                     style={{ position: 'absolute', top: r.y + 26, left: 10, width: LABEL_W - 16, cursor: 'pointer',
                              opacity: focus && focus !== r.line.id ? 0.3 : 1 }}>
                  <div style={{ fontSize: 11, color: C.soft, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.line.name}</div>
                  <Badge line={r.line} color={r.color} />
                </div>
              )))}
            </div>
            <MetroMap data={data} lines={visible} colors={colors} width={width} selected={sel?.station?.id}
                      focusLine={focus} onStation={selectStation} onLine={selectLine} />
          </div>
        </div>
      )}

      {data && !data.lines.some(l => l.mode === 'S') && (
        <div style={{ color: C.faint, fontSize: 12, padding: '10px 16px' }}>
          No S-Bahn yet: plans appear here once they're in the plan store (brief → Lists → Import).
        </div>
      )}

      {sel && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '44vh', overflowY: 'auto', zIndex: 20,
                      background: C.panel, borderTop: `1px solid ${C.line}`, boxShadow: '0 -12px 30px rgba(0,0,0,0.5)',
                      padding: '14px 18px 28px' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
            <button onClick={() => { setSel(null); setFocus(null); }}
                    style={{ ...linkish, position: 'absolute', right: 0, top: -4, fontSize: 22, color: C.soft }}>×</button>
            {sel.station
              ? <StationCard station={sel.station} line={sel.line} color={colors[sel.line.id]} data={data} lineOf={lineOf}
                             onOpen={read} onSelect={selectStation} onTimetable={() => selectLine(sel.line)} />
              : <Timetable line={sel.line} color={colors[sel.line.id]} onSelect={selectStation} selected={null} onOpen={read} />}
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 24, zIndex: 60,
                              background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 16px',
                              fontSize: 13 }}>{toast} <Link href="/desk/console" style={{ color: C.signal }}>open</Link></div>}

      <Reader doc={doc} onClose={() => setDoc(null)} onRead={readKR} onRun={run} />
    </div>
  );
}

Runtime.bare = true;   // no portfolio chrome over the map (see pages/_app.js)
