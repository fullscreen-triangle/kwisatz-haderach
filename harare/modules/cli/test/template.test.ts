import { test } from "node:test";
import assert from "node:assert/strict";
import { expand, lookup, parseOutput, type Scope } from "../src/template.js";

const scope: Scope = {
  body: { query: "dentist Greifswald", paths: ["a", "b"], n: 3, opts: { deep: true } },
  reading: [{ seq: 1, kind: "declined", data: { query: "Zahnarzt" } }],
  node: [],
  tau: "greifswald/dentist",
  config: {},
  run: "r1",
  task: 7,
};

test("a whole-item placeholder is exactly one argument, however many spaces it holds", () => {
  assert.deepEqual(expand(["spraypaint", "ask", "{body.query}", "--json"], scope), ["spraypaint", "ask", "dentist Greifswald", "--json"]);
});

test("arrays of scalars spread into several arguments", () => {
  assert.deepEqual(expand(["okgg", "run", "{body.paths}"], scope), ["okgg", "run", "a", "b"]);
});

test("inline placeholders, objects, indices and escaped braces", () => {
  assert.deepEqual(expand(["--n={body.n}", "{body.opts}", "{reading.0.data.query}", "{{literal}}", "{tau}"], scope), [
    "--n=3",
    '{"deep":true}',
    "Zahnarzt",
    "{literal}",
    "greifswald/dentist",
  ]);
});

test("a missing value is an error, never an empty argument", () => {
  assert.throws(() => expand(["{body.nope}"], scope), /has no value/);
  assert.throws(() => expand(["--q={reading.5.data}"], scope), /has no value/);
  assert.equal(lookup(scope, "reading.x"), undefined);
});

test("alternatives take the first path that resolves", () => {
  assert.deepEqual(expand(["{body.missing|reading.0.data.query}"], scope), ["Zahnarzt"]);
  assert.deepEqual(expand(["{body.query|reading.0.data.query}"], scope), ["dentist Greifswald"]);
  assert.throws(() => expand(["{body.a|body.b}"], scope), /has no value/);
});

test("output parsing", () => {
  assert.deepEqual(parseOutput('{"a":1}'), { a: 1 });
  assert.deepEqual(parseOutput('{"a":1}\n{"a":2}\n'), [{ a: 1 }, { a: 2 }]);
  assert.equal(parseOutput("plain words"), "plain words");
  assert.deepEqual(parseOutput("x\ny\n", "lines"), ["x", "y"]);
  assert.throws(() => parseOutput("nope", "json"));
});
