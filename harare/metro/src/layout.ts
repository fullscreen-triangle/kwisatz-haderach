// Laying a run out as a transit map.
//
// - A station is a node. Its row is the line of the module that first put a
//   chunk (or, failing that, a value) there; rows appear in the order lines
//   join the run.
// - A station's column comes after every station that feeds it (by a read or
//   a raise) and after the previous station in its row, so the map reads left
//   to right in causal order.
// - Track exists only where something happened: a solid segment for each read
//   (u → v drawn by the reading module), a thin dashed one for each raise
//   (a task at u attached a chunk at v). Nothing is drawn from declared
//   structure, because the engine has none.
// - Segments run at 0°, 45° and 90°. Lines sharing a pair of stations run
//   side by side.

import type { ModuleInfo, Snapshot } from "./types.js";

export interface LineInfo {
  module: string;
  mode: string;
  bullet: string;
  color: string;
  description?: string | null;
  row: number;
}

export interface Station {
  tau: string;
  leaf: string;
  prefix: string;
  x: number;
  y: number;
  row: number;
  col: number;
  lines: string[];
  interchange: boolean;
  values: number;
  chunks: number;
  hasError: boolean;
  running: number;
  waiting: number;
}

export interface Track {
  key: string;
  from: string;
  to: string;
  module: string;
  kind: "read" | "raise";
  weight: number;
  color: string;
  d: string;
}

export interface Layout {
  lines: LineInfo[];
  stations: Station[];
  tracks: Track[];
  width: number;
  height: number;
}

export interface LayoutOptions {
  dx: number;
  dy: number;
  margin: number;
  bundleGap: number;
}

const DEFAULTS: LayoutOptions = { dx: 170, dy: 120, margin: 90, bundleGap: 8 };

export const PALETTE = ["#1f68b3", "#d2412a", "#4f9a2e", "#e3ae0c", "#7a4a9e", "#e3741a", "#0f8f8a", "#c23a78", "#8a5636", "#5b6770"];

/** Bullets are the mode letter and a number within the mode: U1, U2, RE1… */
export function lineInfo(modules: ModuleInfo[]): Map<string, LineInfo> {
  const perMode = new Map<string, number>();
  const out = new Map<string, LineInfo>();
  modules.forEach((m, i) => {
    const n = (perMode.get(m.mode) ?? 0) + 1;
    perMode.set(m.mode, n);
    out.set(m.name, { module: m.name, mode: m.mode, bullet: `${m.mode}${n}`, color: m.color || PALETTE[i % PALETTE.length]!, description: m.description, row: -1 });
  });
  return out;
}

const parentOf = (tau: string) => (tau.includes("/") ? tau.slice(0, tau.lastIndexOf("/")) : null);

/** Octilinear route between two points: straight, diagonal, straight. */
export function route(x1: number, y1: number, x2: number, y2: number): [number, number][] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax === 0 || ay === 0 || ax === ay) return [[x1, y1], [x2, y2]];
  if (ax > ay) {
    const h = (ax - ay) / 2;
    return [[x1, y1], [x1 + sx * h, y1], [x2 - sx * h, y2], [x2, y2]];
  }
  const v = (ay - ax) / 2;
  return [[x1, y1], [x1, y1 + sy * v], [x2, y2 - sy * v], [x2, y2]];
}

export function layout(snap: Snapshot, options: Partial<LayoutOptions> = {}): Layout {
  const o = { ...DEFAULTS, ...options };
  const info = lineInfo(snap.modules);
  const valueBySeq = new Map(snap.values.map((v) => [v.seq, v]));
  const chunkById = new Map(snap.chunks.map((c) => [c.id, c]));
  const nodes = [...snap.nodes].sort((a, b) => a.first_m - b.first_m || a.tau.localeCompare(b.tau));

  // Home line of each node.
  const home = new Map<string, string>();
  for (const n of nodes) {
    const byChunk = n.chunks.map((id) => chunkById.get(id)?.module).find((m) => m && info.has(m));
    const byValue = n.values.map((s) => valueBySeq.get(s)?.by.module).find((m) => m && info.has(m));
    const parent = parentOf(n.tau);
    home.set(n.tau, byChunk ?? byValue ?? (parent && home.get(parent)) ?? "");
  }

  // Rows in order of first use.
  const rowOf = new Map<string, number>();
  for (const n of nodes) {
    const h = home.get(n.tau)!;
    if (!rowOf.has(h)) rowOf.set(h, rowOf.size);
  }
  for (const [name, l] of info) l.row = rowOf.get(name) ?? -1;

  // Links into each node, from reads and raises.
  const incoming = new Map<string, string[]>();
  const link = (from: string, to: string) => {
    if (from === to) return;
    const list = incoming.get(to) ?? [];
    list.push(from);
    incoming.set(to, list);
  };
  for (const e of snap.edges) link(e.from, e.to);
  for (const r of snap.raises) link(r.from, r.to);

  // Columns.
  const colOf = new Map<string, number>();
  const lastInRow = new Map<number, number>();
  for (const n of nodes) {
    const row = rowOf.get(home.get(n.tau)!)!;
    let col = (lastInRow.get(row) ?? -1) + 1;
    for (const from of incoming.get(n.tau) ?? []) {
      const c = colOf.get(from);
      if (c !== undefined) col = Math.max(col, c + 1);
    }
    colOf.set(n.tau, col);
    lastInRow.set(row, col);
  }

  // Which lines serve each station.
  const serves = new Map<string, Set<string>>();
  const serve = (tau: string, module: string) => {
    if (!info.has(module)) return;
    const s = serves.get(tau) ?? new Set<string>();
    s.add(module);
    serves.set(tau, s);
  };
  for (const c of snap.chunks) serve(c.tau, c.module);
  for (const v of snap.values) serve(v.tau, v.by.module);
  for (const e of snap.edges) {
    serve(e.from, e.by);
    serve(e.to, e.by);
  }
  for (const r of snap.raises) serve(r.from, r.by);

  const running = new Map<string, number>();
  for (const t of snap.tasks) if (t.state === "running") running.set(t.tau, (running.get(t.tau) ?? 0) + 1);
  const waiting = new Map<string, number>();
  for (const p of snap.pending) waiting.set(p.tau, (waiting.get(p.tau) ?? 0) + 1);

  const stations: Station[] = nodes.map((n) => {
    const row = rowOf.get(home.get(n.tau)!)!;
    const col = colOf.get(n.tau)!;
    const lines = [...(serves.get(n.tau) ?? [])].sort((a, b) => (info.get(a)!.row - info.get(b)!.row) || a.localeCompare(b));
    const cut = n.tau.lastIndexOf("/");
    return {
      tau: n.tau,
      leaf: cut >= 0 ? n.tau.slice(cut + 1) : n.tau,
      prefix: cut >= 0 ? n.tau.slice(0, cut) : "",
      x: o.margin + col * o.dx,
      y: o.margin + row * o.dy,
      row,
      col,
      lines,
      interchange: lines.length > 1,
      values: n.values.length,
      chunks: n.chunks.length,
      hasError: n.values.some((s) => valueBySeq.get(s)?.kind === "error"),
      running: running.get(n.tau) ?? 0,
      waiting: waiting.get(n.tau) ?? 0,
    };
  });
  const at = new Map(stations.map((s) => [s.tau, s]));

  // Track, bundled per station pair.
  type Seg = Omit<Track, "d">;
  const segs = new Map<string, Seg>();
  for (const e of snap.edges) {
    if (e.from === e.to || !at.has(e.from) || !at.has(e.to)) continue;
    const key = `read:${e.from}>${e.to}@${e.by}`;
    segs.set(key, { key, from: e.from, to: e.to, module: e.by, kind: "read", weight: e.reads, color: info.get(e.by)?.color ?? "#888" });
  }
  for (const r of snap.raises) {
    if (r.from === r.to || !at.has(r.from) || !at.has(r.to)) continue;
    const key = `raise:${r.from}>${r.to}@${r.by}`;
    const prev = segs.get(key);
    if (prev) prev.weight++;
    else segs.set(key, { key, from: r.from, to: r.to, module: r.by, kind: "raise", weight: 1, color: info.get(r.by)?.color ?? "#888" });
  }
  const bundles = new Map<string, Seg[]>();
  for (const s of segs.values()) {
    const pair = [s.from, s.to].sort().join("|");
    const b = bundles.get(pair) ?? [];
    b.push(s);
    bundles.set(pair, b);
  }
  const tracks: Track[] = [];
  for (const bundle of bundles.values()) {
    bundle.sort((a, b) => (a.kind === b.kind ? (info.get(a.module)?.row ?? 99) - (info.get(b.module)?.row ?? 99) : a.kind === "read" ? -1 : 1));
    bundle.forEach((s, i) => {
      const a = at.get(s.from)!;
      const b = at.get(s.to)!;
      const offset = (i - (bundle.length - 1) / 2) * o.bundleGap;
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const px = (-(b.y - a.y) / len) * offset;
      const py = ((b.x - a.x) / len) * offset;
      const pts = route(a.x, a.y, b.x, b.y).map(([x, y]) => `${(x + px).toFixed(1)},${(y + py).toFixed(1)}`);
      tracks.push({ ...s, d: `M${pts.join(" L")}` });
    });
  }

  const maxCol = Math.max(0, ...stations.map((s) => s.col));
  const rows = Math.max(1, rowOf.size);
  return {
    lines: [...info.values()],
    stations,
    tracks,
    width: o.margin * 2 + maxCol * o.dx + 120,
    height: o.margin * 2 + (rows - 1) * o.dy + 40,
  };
}
