// The metro viewer: draws the selected run and keeps it live.

import { layout, lineInfo, type Layout, type LineInfo, type Station } from "./layout.js";
import type { Snapshot, Task, Value } from "./types.js";

const SVG = "http://www.w3.org/2000/svg";

type Attrs = Record<string, string | number | boolean | undefined>;
type Child = Node | string | null | undefined | false;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === "class") e.className = String(v);
    else e.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) e.append(c);
  return e;
}

/** Replace an element's children, skipping the empty slots of conditional content. */
function fill(parent: Element, ...children: Child[]) {
  parent.replaceChildren(...children.filter((c): c is Node | string => c !== null && c !== undefined && c !== false));
}

function s(tag: string, attrs: Attrs = {}, parent?: Element): SVGElement {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== false) e.setAttribute(k, String(v));
  parent?.appendChild(e);
  return e;
}

const $ = <T extends Element>(sel: string) => document.querySelector(sel) as T;

let runs: any[] = [];
let current: string | null = null;
let snap: Snapshot | null = null;
let selected: string | null = null;
let focusLine: string | null = null;
let source: EventSource | null = null;
let refreshTimer: number | undefined;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json" } });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      msg = JSON.parse(text).error ?? text;
    } catch {
      // plain text
    }
    throw new Error(msg);
  }
  return (text ? JSON.parse(text) : null) as T;
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

function dur(secs: number): string {
  if (secs < 60) return `${secs.toFixed(0)}s`;
  if (secs < 3600) return `${(secs / 60).toFixed(1)}m`;
  return `${(secs / 3600).toFixed(1)}h`;
}

function pretty(data: unknown, max = 1500): string {
  const t = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return t.length > max ? t.slice(0, max) + "\n…" : t;
}

// ---- runs ---------------------------------------------------------------

async function loadRuns(preferred?: string) {
  const r = await api<{ runs: any[] }>("/api/runs");
  runs = r.runs;
  const sel = $<HTMLSelectElement>("#run");
  sel.replaceChildren(
    ...runs.map((x) =>
      h("option", { value: x.run, selected: x.run === (preferred ?? current) }, `${x.label ? `${x.label} — ` : ""}${x.run}${x.live ? " ●" : ""}`),
    ),
  );
  if (!runs.length) {
    sel.append(h("option", { value: "" }, "no runs yet"));
    renderEmpty();
    return;
  }
  const want = preferred ?? current ?? decodeURIComponent(location.hash.slice(1)) ?? "";
  await openRun(runs.some((x) => x.run === want) ? want : runs[0].run);
}

async function openRun(id: string) {
  if (current !== id) {
    selected = null;
    focusLine = null;
  }
  current = id;
  if (location.hash.slice(1) !== id) history.replaceState(null, "", `#${encodeURIComponent(id)}`);
  $<HTMLSelectElement>("#run").value = id;
  source?.close();
  source = null;
  await refresh();
  if (snap?.live) {
    source = new EventSource(`/api/runs/${encodeURIComponent(id)}/events`);
    source.addEventListener("act", () => scheduleRefresh());
    source.onerror = () => scheduleRefresh(1500);
  }
}

function scheduleRefresh(delay = 200) {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => void refresh(), delay);
}

async function refresh() {
  if (!current) return;
  try {
    snap = await api<Snapshot>(`/api/runs/${encodeURIComponent(current)}`);
    render();
  } catch (e) {
    $("#status").textContent = `cannot load ${current}: ${(e as Error).message}`;
  }
}

// ---- rendering ----------------------------------------------------------

function renderEmpty() {
  $("#status").textContent = "No runs yet. Start one with “New run”, from a plan file (harare run plan.toml), or over the API.";
  fill($("#map"));
  fill($("#legend"));
}

function render() {
  if (!snap) return;
  const L = layout(snap);
  renderStatus();
  renderLegend(L.lines);
  renderMap(L);
  renderDetail(L);
  renderCapacity();
  renderQueue();
  renderRaise();
}

function renderStatus() {
  const x = snap!;
  const running = x.tasks.filter((t) => t.state === "running").length;
  const state = x.quiescent ? h("span", { class: "badge quiet" }, "quiescent") : h("span", { class: "badge active" }, x.live ? "running" : "open");
  fill($("#status"), 
    state,
    h("span", {}, `m ${x.m}`),
    h("span", {}, `${x.nodes.length} stations`),
    h("span", {}, `${x.values.length} values`),
    h("span", {}, `${running} running`),
    h("span", {}, `${x.pending.length} waiting`),
    x.deferred.length ? h("span", {}, `${x.deferred.length} deferred`) : null,
    h("span", { class: "muted", title: "protocol fingerprint: addresses, modules and chunk bodies — never values" }, `protocol ${x.fingerprint}`),
    x.last_t ? h("span", { class: "muted" }, `last act ${ago(x.last_t)}`) : null,
    h("a", { href: `/api/runs/${encodeURIComponent(x.run)}/report?format=text`, target: "_blank" }, "report"),
  );
}

function bullet(l: LineInfo): HTMLElement {
  return h("span", { class: "bullet", style: `--c:${l.color}` }, l.bullet);
}

function renderLegend(lines: LineInfo[]) {
  const used = lines.filter((l) => l.row >= 0 || snap!.tasks.some((t) => t.module === l.module));
  const shown = used.length ? used : lines;
  fill($("#legend"), 
    ...shown.map((l) => {
      const b = h("button", { class: `legend-line${focusLine === l.module ? " on" : ""}`, type: "button", title: l.description ?? "" }, bullet(l), h("span", {}, l.module));
      b.addEventListener("click", () => {
        focusLine = focusLine === l.module ? null : l.module;
        render();
      });
      return b;
    }),
  );
}

function renderMap(L: Layout) {
  const svg = $<SVGSVGElement>("#map");
  svg.replaceChildren();
  svg.setAttribute("viewBox", `0 0 ${L.width} ${L.height}`);
  svg.setAttribute("width", String(L.width));
  svg.setAttribute("height", String(L.height));
  const byModule = new Map(L.lines.map((l) => [l.module, l]));
  const dim = (m: string) => (focusLine && focusLine !== m ? 0.12 : 1);

  // Row bullets at the left edge.
  for (const l of L.lines) {
    if (l.row < 0) continue;
    const y = L.stations.find((st) => st.row === l.row)?.y;
    if (y === undefined) continue;
    const g = s("g", { class: "rowbullet", opacity: dim(l.module) }, svg);
    s("rect", { x: 14, y: y - 12, width: 44, height: 24, rx: 6, fill: l.color }, g);
    const t = s("text", { x: 36, y: y + 5, "text-anchor": "middle" }, g);
    t.textContent = l.bullet;
  }

  const tracks = s("g", {}, svg);
  for (const t of L.tracks) {
    s(
      "path",
      {
        d: t.d,
        class: `track ${t.kind}`,
        stroke: t.color,
        "stroke-width": t.kind === "read" ? 7 + Math.min(t.weight - 1, 3) : 2.5,
        "stroke-dasharray": t.kind === "raise" ? "7 6" : undefined,
        opacity: dim(t.module),
      },
      tracks,
    ).appendChild(title(`${t.kind === "read" ? "read" : "raised"} by ${t.module}: ${t.from} → ${t.to}${t.weight > 1 ? ` (${t.weight}×)` : ""}`));
  }

  const runningAt = new Map<string, Task[]>();
  for (const t of snap!.tasks) if (t.state === "running") runningAt.set(t.tau, [...(runningAt.get(t.tau) ?? []), t]);

  const stations = s("g", {}, svg);
  for (const st of L.stations) {
    const g = s("g", { class: `stn${selected === st.tau ? " sel" : ""}`, tabindex: 0, role: "button", "aria-label": st.tau, opacity: focusLine && !st.lines.includes(focusLine) ? 0.25 : 1 }, stations);
    g.addEventListener("click", () => select(st.tau));
    g.addEventListener("keydown", (e) => {
      const k = (e as KeyboardEvent).key;
      if (k === "Enter" || k === " ") select(st.tau);
    });
    if (st.waiting) s("circle", { cx: st.x, cy: st.y, r: 19, class: "waitring" }, g);
    if (st.interchange) {
      // A capsule, longer the more lines call here.
      const hgt = 12 + st.lines.length * 12;
      s("rect", { class: "halo", x: st.x - 17, y: st.y - hgt / 2 - 6, width: 34, height: hgt + 12, rx: 14 }, g);
      s("rect", { class: "stop", x: st.x - 11, y: st.y - hgt / 2, width: 22, height: hgt, rx: 11 }, g);
    } else {
      s("circle", { class: "halo", cx: st.x, cy: st.y, r: 16 }, g);
      s("circle", { class: "stop", cx: st.x, cy: st.y, r: 9, ...(st.chunks === 0 && st.values === 0 ? { "stroke-dasharray": "3 2.5" } : {}) }, g);
    }
    if (st.values) s("circle", { class: "fill", cx: st.x, cy: st.y, r: 3.8 }, g);
    if (st.hasError) s("circle", { class: "err", cx: st.x + 11, cy: st.y - 11, r: 5 }, g).appendChild(title("an error value is on this node"));
    const trains = runningAt.get(st.tau) ?? [];
    trains.slice(0, 4).forEach((t, i) => {
      const c = byModule.get(t.module)?.color ?? "#888";
      const tr = s("g", { class: "train" }, g);
      s("rect", { x: st.x - 16 + i * 9, y: st.y - 34, width: 22, height: 11, rx: 4, fill: c }, tr);
      tr.appendChild(title(`task ${t.id}: ${t.module} on ${t.runner}${t.progress ? ` — ${t.progress.note}` : ""}`));
    });
    const labelBelow = st.col % 2 === 0;
    const ly = labelBelow ? st.y + 30 : st.y - (trains.length ? 44 : 28);
    const lbl = s("text", { class: "lbl", x: st.x, y: ly, "text-anchor": "middle" }, g);
    if (st.prefix) {
      const p = s("tspan", { class: "prefix", x: st.x, dy: labelBelow ? 0 : -14 }, lbl);
      p.textContent = st.prefix + "/";
    }
    const leaf = s("tspan", { x: st.x, dy: st.prefix ? 14 : 0 }, lbl);
    leaf.textContent = st.leaf;
  }
  if (!L.stations.length) {
    const t = s("text", { x: 40, y: 60, class: "lbl" }, svg);
    t.textContent = "This run has no nodes yet. Raise a chunk to start it.";
  }
}

function title(text: string): SVGElement {
  const t = document.createElementNS(SVG, "title");
  t.textContent = text;
  return t as SVGElement;
}

function select(tau: string) {
  selected = selected === tau ? null : tau;
  render();
}

function renderDetail(L: Layout) {
  const panel = $("#detail");
  const x = snap!;
  if (!selected || !x.nodes.some((n) => n.tau === selected)) {
    fill(panel, 
      h("h2", {}, "Station"),
      h("p", { class: "muted" }, "Select a station to see what was raised there, what ran, and every value emitted on it."),
      tasksTable(x.tasks.filter((t) => t.state === "running"), "Running now"),
    );
    return;
  }
  const node = x.nodes.find((n) => n.tau === selected)!;
  const st: Station | undefined = L.stations.find((s2) => s2.tau === selected);
  const info = lineInfo(x.modules);
  const valueBySeq = new Map(x.values.map((v) => [v.seq, v]));
  const chunks = x.chunks.filter((c) => c.tau === selected);
  const tasks = x.tasks.filter((t) => t.tau === selected);

  fill(panel, 
    h("h2", {}, "Station"),
    h("h3", {}, selected),
    h("div", { class: "pills" }, ...(st?.lines ?? []).map((m) => (info.get(m) ? bullet(info.get(m)!) : h("span", {}, m)))),
    chunks.length ? h("h4", {}, `Chunks (${chunks.length})`) : null,
    ...chunks.map((c) =>
      h(
        "div",
        { class: "item" },
        h("div", { class: "row" }, h("b", {}, `#${c.id} ${c.module}`), h("span", { class: `tag ${c.dispatched ? "ok" : c.deferred ? "warn" : "wait"}` }, c.dispatched ? "ran" : c.deferred ? "deferred" : "waiting"), h("span", { class: "muted" }, `raised by ${c.by.module}${c.by.task ? ` (task ${c.by.task})` : ""}`)),
        c.body !== null && c.body !== undefined ? h("pre", {}, pretty(c.body, 800)) : null,
      ),
    ),
    tasks.length ? tasksTable(tasks, `Tasks (${tasks.length})`) : null,
    h("h4", {}, `Values (${node.values.length})`),
    ...node.values.map((seq) => valueItem(valueBySeq.get(seq)!, valueBySeq)),
  );
}

function valueItem(v: Value, bySeq: Map<number, Value>): HTMLElement {
  const reads = (v.read ?? []).map((r) => {
    const src = bySeq.get(r);
    const a = h("button", { class: "link", type: "button" }, `#${r}${src && src.tau !== v.tau ? ` @ ${src.tau}` : ""}`);
    if (src) a.addEventListener("click", () => select(src.tau));
    return a;
  });
  return h(
    "div",
    { class: `item${v.kind === "error" ? " error" : ""}` },
    h("div", { class: "row" }, h("b", {}, `#${v.seq} ${v.kind}`), h("span", { class: "muted" }, `by ${v.by.module}${v.by.task ? ` (task ${v.by.task})` : ""}`), reads.length ? h("span", { class: "muted" }, "read ", ...reads) : null),
    h("pre", {}, pretty(v.data)),
  );
}

function tasksTable(tasks: Task[], heading: string): HTMLElement | null {
  if (!tasks.length) return null;
  return h(
    "div",
    {},
    h("h4", {}, heading),
    ...tasks.map((t) => {
      const running = t.state === "running";
      const cancel = running ? h("button", { class: "small", type: "button" }, "cancel") : null;
      cancel?.addEventListener("click", async () => {
        cancel.setAttribute("disabled", "");
        try {
          await api(`/api/runs/${encodeURIComponent(current!)}/tasks/${t.id}/cancel`, { method: "POST" });
        } catch (e) {
          alert((e as Error).message);
        }
      });
      const end = t.end ? `${t.end.how}${t.end.code !== undefined && t.end.code !== null ? ` ${t.end.code}` : ""}` : "";
      const grant = t.grant && Object.keys(t.grant).length ? Object.entries(t.grant).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(", ") : "";
      return h(
        "div",
        { class: "item" },
        h(
          "div",
          { class: "row" },
          h("b", {}, `task ${t.id} ${t.module}`),
          h("span", { class: `tag ${running ? "run" : t.end?.how === "exited" && t.end.code === 0 ? "ok" : "warn"}` }, running ? "running" : end),
          h("span", { class: "muted" }, `${t.runner} · p ${t.priority}${t.reading?.length ? ` · read ${t.reading.length}` : ""}${grant ? ` · ${grant}` : ""}`),
          cancel,
        ),
        running && t.progress ? h("div", { class: "progress" }, t.progress.note) : null,
      );
    }),
  );
}

function renderCapacity() {
  const x = snap!;
  const runners = x.runners.map((r) => {
    const state = r.available === undefined ? "" : r.available ? "up" : "down";
    return h(
      "div",
      { class: `runner ${state}`, title: r.detail ?? "" },
      h("b", {}, r.name),
      h("span", { class: "muted" }, r.label ?? (r.remote ? "remote" : "this machine")),
      h("span", {}, r.busy !== undefined ? `${r.busy}/${r.slots} busy` : `${r.slots} slots`),
      r.available === false ? h("span", { class: "tag warn" }, r.probing ? "checking" : "unreachable") : null,
    );
  });
  const resources = x.resources.map((r) => {
    const used = r.in_use ?? 0;
    const pct = r.capacity > 0 ? Math.min(100, (used / r.capacity) * 100) : 0;
    const unit = r.unit ? ` ${r.unit}` : "";
    const note =
      r.kind === "rate"
        ? `${used.toFixed(1)} of ${r.capacity}${unit} granted${r.demand ? `, ${r.demand.toFixed(1)} asked` : ""}${r.level !== null && r.level !== undefined ? ` · fair share ${r.level.toFixed(2)} per unit priority` : ""}`
        : `${used} of ${r.capacity} held`;
    return h("div", { class: "resource" }, h("div", { class: "row" }, h("b", {}, r.name), h("span", { class: "muted" }, r.kind)), h("div", { class: "bar" }, h("i", { style: `width:${pct}%` })), h("div", { class: "muted" }, note));
  });
  fill($("#capacity"), h("h2", {}, "Capacity"), h("h4", {}, "Runners"), ...runners, resources.length ? h("h4", {}, "Resources") : null, ...resources);
}

function renderQueue() {
  const x = snap!;
  fill($("#queue"), 
    h("h2", {}, `Waiting (${x.pending.length})`),
    x.pending.length ? null : h("p", { class: "muted" }, x.live ? "Nothing is waiting." : "This run is not live; open work is not scheduled until it is resumed."),
    ...x.pending
      .slice()
      .sort((a, b) => b.effective_priority - a.effective_priority)
      .map((p) => {
        const row = h(
          "div",
          { class: `item${p.reserved ? " reserved" : ""}` },
          h("div", { class: "row" }, h("b", {}, p.chunk ? `chunk #${p.chunk} ${p.module}` : `${p.module} reads ${p.reading.length}`), h("span", { class: "muted" }, p.tau)),
          h("div", { class: "muted" }, `priority ${p.priority} → ${p.effective_priority.toFixed(2)} after ${dur(p.waited)} · ${p.runners.join(" > ")}`),
          h("div", {}, p.reason),
        );
        row.addEventListener("click", () => select(p.tau));
        return row;
      }),
    x.deferred.length ? h("h4", {}, `Deferred (${x.deferred.length})`) : null,
    ...x.deferred.map((d) => h("div", { class: "item" }, h("div", { class: "row" }, h("b", {}, d.chunk ? `chunk #${d.chunk} ${d.module}` : `${d.module} reads ${d.reading.length}`), h("span", { class: "muted" }, d.tau)), h("div", { class: "muted" }, d.reason))),
  );
}

function renderRaise() {
  const x = snap!;
  const panel = $<HTMLElement>("#raise");
  if (panel.dataset["run"] === x.run && panel.childElementCount) return; // keep what is being typed
  panel.dataset["run"] = x.run;
  const module = h("select", { name: "module" }, ...x.modules.map((m) => h("option", { value: m.name }, `${m.mode} ${m.name}`)));
  const tau = h("input", { name: "tau", placeholder: "node address, e.g. greifswald/dentist", value: selected ?? "" });
  const body = h("textarea", { name: "body", rows: 5, placeholder: '{"prompt": "…"}' });
  const priority = h("input", { name: "priority", type: "number", step: "0.5", min: "0.1", placeholder: "priority (module default)" });
  const out = h("p", { class: "muted" });
  const form = h("form", {}, h("label", {}, "Module", module), h("label", {}, "Node", tau), h("label", {}, "Body (JSON)", body), h("label", {}, "Priority", priority), h("button", { type: "submit" }, "Raise chunk"), out);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let parsed: unknown = null;
    try {
      parsed = body.value.trim() ? JSON.parse(body.value) : null;
    } catch {
      out.textContent = "The body is not valid JSON.";
      return;
    }
    const chunk: Record<string, unknown> = { tau: tau.value.trim(), module: module.value, body: parsed };
    if (priority.value) chunk["priority"] = Number(priority.value);
    try {
      const r = await api<{ chunks: number[] }>(`/api/runs/${encodeURIComponent(x.run)}/raise`, { method: "POST", body: JSON.stringify({ chunks: [chunk] }) });
      out.textContent = `Raised chunk #${r.chunks.join(", #")}.`;
      if (!x.live) await openRun(x.run);
    } catch (err) {
      out.textContent = (err as Error).message;
    }
  });
  fill(panel, h("h2", {}, "Raise"), form);
}

// ---- boot ---------------------------------------------------------------

$<HTMLSelectElement>("#run").addEventListener("change", (e) => void openRun((e.target as HTMLSelectElement).value));
$<HTMLButtonElement>("#newrun").addEventListener("click", async () => {
  const label = prompt("Label for the new run (optional)") ?? undefined;
  try {
    const r = await api<{ run: string }>("/api/runs", { method: "POST", body: JSON.stringify({ label: label || null, chunks: [] }) });
    await loadRuns(r.run);
  } catch (e) {
    alert((e as Error).message);
  }
});
window.setInterval(() => {
  if (snap?.live && !snap.quiescent) void refresh();
}, 3000);
void loadRuns();
