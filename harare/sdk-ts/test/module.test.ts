import { test } from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { runModule, type Task } from "../src/index.js";

function harness() {
  const input = new PassThrough();
  const output = new PassThrough();
  const errors = new PassThrough();
  const written: any[] = [];
  let errText = "";
  output.on("data", (b: Buffer) => {
    for (const l of b.toString().split("\n")) if (l.trim()) written.push(JSON.parse(l));
  });
  errors.on("data", (b: Buffer) => (errText += b.toString()));
  let code: number | null = null;
  return {
    input,
    io: { input, output, errors, exit: (c: number) => (code = c) },
    written,
    get code() {
      return code;
    },
    get stderr() {
      return errText;
    },
  };
}

const task = (extra: object = {}) =>
  JSON.stringify({
    type: "task",
    harare: 1,
    run: "r",
    task: 4,
    module: "m",
    tau: "a/b",
    body: { q: "x" },
    config: { k: 1 },
    reading: [{ seq: 1, tau: "a", kind: "query", data: "x", by: { module: "api" } }],
    node: [],
    grant: { net: 5 },
    ...extra,
  }) + "\n";

test("a module emits, raises, reads, sees grants and cancellation, and exits 0", async () => {
  const h = harness();
  h.input.write(task());
  let seen: Task | null = null;
  const done = runModule(async (t) => {
    seen = t;
    assert.equal(t.tau, "a/b");
    assert.equal(t.body.q, "x");
    assert.equal(t.config.k, 1);
    assert.equal(t.grant()["net"], 5);
    t.progress("working", 0.5);
    t.emit("answer", { n: 1 });
    t.emit("elsewhere", null, { tau: "c", read: [1] });
    t.raise("a/b/sub", "other", { go: true }, { priority: 2 });
    const values = t.read("a");
    h.input.write(JSON.stringify({ type: "grant", grant: { net: 9 } }) + "\n");
    h.input.write(JSON.stringify({ type: "values", tau: "a", values: [{ seq: 1 }] }) + "\n");
    assert.equal((await values).length, 1);
    assert.equal(t.grant()["net"], 9);
    h.input.write(JSON.stringify({ type: "cancel" }) + "\n");
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(t.signal.aborted, true);
  }, h.io);
  await done;
  assert.ok(seen);
  assert.equal(h.code, 0);
  const types = h.written.map((m) => m.type);
  assert.deepEqual(types, ["progress", "emit", "emit", "raise", "read"]);
  assert.deepEqual(h.written[2], { type: "emit", kind: "elsewhere", data: null, tau: "c", read: [1] });
  assert.equal(h.written[3].priority, 2);
});

test("a throwing module exits 1 with the error on stderr", async () => {
  const h = harness();
  h.input.write(task());
  await runModule(() => {
    throw new Error("the index is missing");
  }, h.io);
  assert.equal(h.code, 1);
  assert.match(h.stderr, /the index is missing/);
});

test("a newer protocol is refused", async () => {
  const h = harness();
  h.input.write(task({ harare: 99 }));
  await runModule(() => assert.fail("must not run"), h.io);
  assert.equal(h.code, 2);
});
