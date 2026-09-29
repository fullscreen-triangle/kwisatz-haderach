import { useMemo } from 'react';
import { scaleTime } from 'd3';

// The runtime network drawn as a transit map. Each line is a track; time runs left to right
// (the past compressed, the coming two weeks wide, undated stops queued at the far right).
// Track behind "now" is solid; ahead it is drawn as under construction. A vehicle sits on
// each line at "now". Interchanges are white passages drawn octilinearly (vertical + 45°).
// Plain SVG, no zoom behaviour: the parent scrolls natively, so phones keep vertical scroll.

export const MODES = {
  U: { label: 'U-Bahn', what: 'projects', badge: '#115D91', shape: 'square',
       colors: ['#E4501F', '#0065AE', '#F6A800', '#8A4F9E', '#4E9A47', '#00A4E4'] },
  S: { label: 'S-Bahn', what: 'plans', badge: '#408335', shape: 'circle',
       colors: ['#55A83E', '#E3007C', '#00A0DC', '#F39200', '#8B5A9F', '#C6D800', '#DC7B7B', '#6DB5B0'] },
  T: { label: 'Tram', what: 'repos', badge: '#BE1414', shape: 'round',
       colors: ['#D8232A', '#E97BA4', '#B37C3F', '#EC6608', '#A4343A', '#F28E96', '#C7A36A', '#E6433A'] },
  B: { label: 'Bus', what: 'mail', badge: '#95276E', shape: 'round',
       colors: ['#A05BB4', '#7C6FD0', '#C06CAE', '#6F7FD8', '#B58BD6', '#8F5DA8', '#D07AC8', '#9A8CE0'] },
};
export const MODE_ORDER = ['U', 'S', 'T', 'B'];

export const LANE_H = 78;                  // labels live in the top ~52 px of a lane
export const GROUP_H = 30;
const TRACK_Y = 60;
const AXIS_H = 34;
const DAY = 86400e3;

// Colours by position among ALL lines of a mode, so filtering never repaints a line.
export function lineColors(allLines) {
  const n = {}, out = {};
  for (const l of allLines) {
    const i = n[l.mode] = (n[l.mode] ?? -1) + 1;
    const pal = MODES[l.mode].colors;
    out[l.id] = pal[i % pal.length];
  }
  return out;
}

// Rows top to bottom: a group header per mode, then its lines.
export function layoutRows(lines, colors) {
  const rows = [];
  let y = AXIS_H;
  for (const m of MODE_ORDER) {
    const ls = lines.filter(l => l.mode === m);
    if (!ls.length) continue;
    rows.push({ kind: 'group', mode: m, y, h: GROUP_H, count: ls.length });
    y += GROUP_H;
    ls.forEach(l => { rows.push({ kind: 'line', line: l, color: colors[l.id], y, h: LANE_H }); y += LANE_H; });
  }
  return { rows, height: y + 16 };
}

export function makeScale(lines, now, width) {
  let lo = now - 60 * DAY, hi = now + 30 * DAY;
  for (const l of lines) for (const s of l.stations) {
    if (!s.at) continue;
    const t = Date.parse(s.at);
    lo = Math.min(lo, t); hi = Math.max(hi, t);
  }
  hi = Math.max(hi, now + 15 * DAY);
  const W = width;
  // piecewise: far past · last two weeks · next two weeks · far future · (queued after)
  return scaleTime()
    .domain([lo, now - 14 * DAY, now, now + 14 * DAY, hi].map(t => new Date(t)))
    .range([0.02 * W, 0.26 * W, 0.52 * W, 0.8 * W, 0.9 * W])
    .clamp(true);
}

function octilinear(xa, ya, xb, yb) {
  const dx = xb - xa, dy = yb - ya;
  if (Math.abs(dx) < 2) return `M${xa},${ya}V${yb}`;
  if (Math.abs(dx) <= Math.abs(dy)) return `M${xa},${ya}V${yb - Math.sign(dy) * Math.abs(dx)}L${xb},${yb}`;
  return `M${xa},${ya}L${xa + Math.sign(dx) * Math.abs(dy)},${yb}H${xb}`;
}

const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function MetroMap({ data, lines, colors, width, selected, focusLine, onStation, onLine }) {
  const now = Date.parse(data.now);
  const { rows, height } = useMemo(() => layoutRows(lines, colors), [lines, colors]);
  const x = useMemo(() => makeScale(lines, now, width), [lines, now, width]);

  // station positions: dated -> time; queued -> after the line's last position; then spaced
  const pos = useMemo(() => {
    const out = {};
    for (const r of rows) {
      if (r.kind !== 'line') continue;
      let last = 0;
      const pts = [];
      for (const s of r.line.stations) {
        let px = s.at ? x(new Date(s.at)) : Math.max(last + 30, 0.92 * width);
        pts.push({ s, px });
        last = px;
      }
      for (let i = 1; i < pts.length; i++) pts[i].px = Math.max(pts[i].px, pts[i - 1].px + 13);
      for (const p of pts) out[p.s.id] = { x: p.px, y: r.y + TRACK_Y, row: r };
    }
    return out;
  }, [rows, x, width]);

  const nowX = x(new Date(now));
  const ticks = useMemo(() => {
    const out = [];
    const [a, b] = [x.domain()[0].getTime(), x.domain()[4].getTime()];
    const d = new Date(a); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));               // back to a Monday
    for (let t = d.getTime(); t <= b; t += 7 * DAY) {
      const px = x(new Date(t));
      if (!out.length || px - out[out.length - 1].px > 46) out.push({ t, px });
    }
    return out;
  }, [x]);

  const dim = id => (focusLine && focusLine !== id ? 0.18 : 1);
  const interchange = new Set(data.transfers.flatMap(t => [t.a, t.b]));

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <style>{`
          @keyframes pulse { 0% { r: 8; opacity: .9 } 100% { r: 17; opacity: 0 } }
          .pulse { animation: pulse 1.6s ease-out infinite; }
          .stn { cursor: pointer; }
        `}</style>
      </defs>
      <rect x={0} y={0} width={nowX} height={height} fill="#080A0E" />
      {ticks.map(t => (
        <g key={t.t}>
          <line x1={t.px} x2={t.px} y1={AXIS_H - 6} y2={height} stroke="#161B24" />
          <text x={t.px + 3} y={AXIS_H - 12} fill="#5F6B7C" fontSize={10}>
            {new Date(t.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </text>
        </g>
      ))}
      <text x={0.92 * width} y={AXIS_H - 12} fill="#5F6B7C" fontSize={10}>not yet scheduled →</text>

      {rows.filter(r => r.kind === 'group').map(r => (
        <line key={r.mode} x1={0} x2={width} y1={r.y + r.h - 4} y2={r.y + r.h - 4} stroke="#1E2430" />
      ))}

      {/* tracks */}
      {rows.filter(r => r.kind === 'line').map(r => {
        const ps = r.line.stations.map(s => pos[s.id]).filter(Boolean);
        if (!ps.length) return null;
        const y = r.y + TRACK_Y, x0 = ps[0].x, x1 = ps[ps.length - 1].x;
        const split = Math.min(Math.max(nowX, x0), x1);
        const onLine = x0 <= nowX && nowX <= x1 || r.line.stations.some(s => s.state !== 'past');
        return (
          <g key={r.line.id} opacity={dim(r.line.id)} onClick={() => onLine(r.line)} style={{ cursor: 'pointer' }}>
            <line x1={x0} x2={x1} y1={y} y2={y} stroke="transparent" strokeWidth={22} />
            {split > x0 && <line x1={x0} x2={split} y1={y} y2={y} stroke={r.color} strokeWidth={7} strokeLinecap="round" />}
            {x1 > split && <line x1={split} x2={x1} y1={y} y2={y} stroke={r.color} strokeWidth={7} strokeLinecap="round"
                                 strokeDasharray="10 6" opacity={0.7} />}
            {onLine && nowX >= x0 - 30 && (
              <g transform={`translate(${Math.min(Math.max(nowX, x0), x1 + 1)},${y})`}>
                <rect x={-11} y={-8} width={22} height={16} rx={5} fill="#0B0E13" stroke={r.color} strokeWidth={2.5} />
                <path d="M-4,-4 L4,0 L-4,4 Z" fill={r.color} />
              </g>
            )}
          </g>
        );
      })}

      {/* interchanges (under the stations, over the tracks) */}
      {data.transfers.map(t => {
        const a = pos[t.a], b = pos[t.b];
        if (!a || !b) return null;
        const d = octilinear(a.x, a.y, b.x, b.y);
        const op = focusLine && ![a.row.line.id, b.row.line.id].includes(focusLine) ? 0.15 : 1;
        return (
          <g key={`${t.a}|${t.b}`} opacity={op}>
            <path d={d} fill="none" stroke="#E6EBF2" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
            <path d={d} fill="none" stroke="#0B0E13" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            <title>{t.why}</title>
          </g>
        );
      })}

      {/* stations + labels */}
      {rows.filter(r => r.kind === 'line').map(r => {
        let lastLabel = -1e9;
        const lastPastId = [...r.line.stations].reverse().find(s => s.state === 'past')?.id;
        return (
          <g key={`s-${r.line.id}`} opacity={dim(r.line.id)}>
            {r.line.stations.map(s => {
              const p = pos[s.id];
              if (!p) return null;
              const isX = interchange.has(s.id), isSel = selected === s.id;
              const ahead = s.state !== 'past';
              // ahead: every stop that has room; behind: only the latest one (old labels would crowd the lanes)
              const latestPast = s.state === 'past' && s.id === lastPastId;
              const showLabel = isSel || ((ahead || latestPast) && p.x - lastLabel > 64);
              if (showLabel) lastLabel = p.x;
              const fill = { past: r.color, late: '#EF6B6B', due: '#E0A93E', blocked: '#4B5563' }[s.state] || '#0B0E13';
              const stroke = s.state === 'next' ? '#FFFFFF' : s.state === 'past' ? '#0B0E13' : '#E6EBF2';
              const rad = isX ? 7.5 : s.state === 'next' ? 7 : s.state === 'past' ? 4.5 : 5.5;
              return (
                <g key={s.id} className="stn" onClick={e => { e.stopPropagation(); onStation(s, r.line); }}>
                  <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
                  {s.state === 'next' && <circle className="pulse" cx={p.x} cy={p.y} r={8} fill="none" stroke={r.color} strokeWidth={2} />}
                  {isSel && <circle cx={p.x} cy={p.y} r={12} fill="none" stroke="#FFFFFF" strokeWidth={2} />}
                  <circle cx={p.x} cy={p.y} r={rad}
                          fill={isX ? '#FFFFFF' : fill} stroke={isX ? '#0B0E13' : stroke}
                          strokeWidth={isX ? 3 : 2} strokeDasharray={s.placed === 'queued' && !isX ? '2 2' : undefined} />
                  {s.state === 'blocked' && <path d={`M${p.x - 3},${p.y - 3}L${p.x + 3},${p.y + 3}M${p.x + 3},${p.y - 3}L${p.x - 3},${p.y + 3}`} stroke="#E6EBF2" strokeWidth={1.6} />}
                  {showLabel && (
                    <text transform={`translate(${p.x + 4},${p.y - 12}) rotate(-35)`} fontSize={11}
                          fill={s.state === 'next' ? '#FFFFFF' : ahead ? '#C9D1DC' : '#6B7686'}
                          fontWeight={s.state === 'next' || isSel ? 700 : 400}>
                      {short(s.title, ahead ? 24 : 18)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}

      <line x1={nowX} x2={nowX} y1={AXIS_H - 8} y2={height} stroke="#E0A93E" strokeWidth={1.5} strokeDasharray="4 4" />
      <rect x={nowX - 20} y={2} width={40} height={16} rx={8} fill="#E0A93E" />
      <text x={nowX} y={14} textAnchor="middle" fontSize={10} fontWeight={700} fill="#0B0E13">now</text>
    </svg>
  );
}
