import { test } from "node:test";
import assert from "node:assert/strict";
import { layout, lineInfo, route } from "../src/layout.js";
import type { Snapshot } from "../src/types.js";

const mod = (name: string, mode = "U") => ({ name, mode, reads: false, priority: 1, runners: ["local"] });

function snapshot(): Snapshot {
  return {
    run: "r",
    m: 10,
    quiescent: true,
    live: false,
    opened_t: 0,
    last_t: 0,
    fingerprint: "0",
    modules: [mod("note"), mod("spraypaint"), mod("claude", "RE")],
    nodes: [
      { tau: "q", first_m: 2, chunks: [1], values: [1] },
      { tau: "q/answer", first_m: 5, chunks: [], values: [2] },
      { tau: "q/deep", first_m: 7, chunks: [2], values: [3] },
    ],
    chunks: [
      { id: 1, tau: "q", module: "note", body: {}, by: { module: "api" }, dispatched: true, deferred: false },
      { id: 2, tau: "q/deep", module: "claude", body: {}, by: { module: "spraypaint", task: 2 }, dispatched: true, deferred: false },
    ],
    values: [
      { seq: 1, tau: "q", kind: "query", data: null, by: { module: "note", task: 1 } },
      { seq: 2, tau: "q/answer", kind: "declined", data: null, by: { module: "spraypaint", task: 2 }, read: [1] },
      { seq: 3, tau: "q/deep", kind: "error", data: null, by: { module: "harare" } },
    ],
    edges: [{ from: "q", to: "q/answer", by: "spraypaint", reads: 1 }],
    raises: [{ from: "q", to: "q/deep", by: "spraypaint", chunk: 2, task: 2 }],
    tasks: [],
    deferred: [],
    runners: [],
    resources: [],
    pending: [{ key: "k", module: "claude", tau: "q/deep", reading: [], priority: 1, effective_priority: 1, waited: 3, runners: ["vingi"], reserved: false, reason: "no reachable runner (vingi)" }],
  };
}

test("bullets number lines within their mode", () => {
  const info = lineInfo([mod("a"), mod("b"), mod("c", "RE")]);
  assert.deepEqual([...info.values()].map((l) => l.bullet), ["U1", "U2", "RE1"]);
});

test("routes are octilinear", () => {
  for (const [x1, y1, x2, y2] of [
    [0, 0, 300, 120],
    [0, 0, 100, 400],
    [50, 50, 50, 300],
    [0, 0, -200, 80],
  ] as const) {
    const pts = route(x1, y1, x2, y2);
    assert.deepEqual(pts[0], [x1, y1]);
    assert.deepEqual(pts.at(-1), [x2, y2]);
    for (let i = 1; i < pts.length; i++) {
      const dx = Math.abs(pts[i]![0] - pts[i - 1]![0]);
      const dy = Math.abs(pts[i]![1] - pts[i - 1]![1]);
      assert.ok(dx === 0 || dy === 0 || Math.abs(dx - dy) < 1e-9, `segment ${i} of ${JSON.stringify(pts)} is not at 0/45/90°`);
    }
  }
});

test("stations follow what fed them; track only where a read or raise happened", () => {
  const L = layout(snapshot());
  const at = new Map(L.stations.map((s) => [s.tau, s]));
  // Rows in order of first use: note (q), spraypaint (q/answer), claude (q/deep).
  assert.equal(at.get("q")!.row, 0);
  assert.equal(at.get("q/answer")!.row, 1);
  assert.equal(at.get("q/deep")!.row, 2);
  // Both q/answer and q/deep come after q.
  assert.ok(at.get("q/answer")!.col > at.get("q")!.col);
  assert.ok(at.get("q/deep")!.col > at.get("q")!.col);
  // One read track, one raise track, nothing else.
  assert.deepEqual(L.tracks.map((t) => `${t.kind} ${t.from}>${t.to} ${t.module}`).sort(), ["raise q>q/deep spraypaint", "read q>q/answer spraypaint"]);
  // q is served by note and spraypaint: an interchange.
  assert.ok(at.get("q")!.interchange);
  assert.equal(at.get("q/deep")!.hasError, true);
  assert.equal(at.get("q/deep")!.waiting, 1);
});

test("parallel lines between the same stations do not overlap", () => {
  const snap = snapshot();
  snap.edges.push({ from: "q", to: "q/answer", by: "claude", reads: 2 });
  const L = layout(snap);
  const pair = L.tracks.filter((t) => t.from === "q" && t.to === "q/answer");
  assert.equal(pair.length, 2);
  assert.notEqual(pair[0]!.d, pair[1]!.d);
});
