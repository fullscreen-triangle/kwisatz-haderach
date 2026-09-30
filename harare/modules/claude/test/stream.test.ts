import { test } from "node:test";
import assert from "node:assert/strict";
import { interpret, proposedRaises } from "../src/stream.js";

test("init, assistant text, tool use and result events", () => {
  const init = interpret(JSON.stringify({ type: "system", subtype: "init", session_id: "s1", model: "claude-opus-5-5" }));
  assert.equal(init.session?.session_id, "s1");
  assert.match(init.notes[0]!, /claude-opus-5-5/);

  const step = interpret(
    JSON.stringify({
      type: "assistant",
      message: { content: [{ type: "text", text: "Reading   the\nREADME" }, { type: "tool_use", name: "Bash", input: { command: "cargo test" } }] },
    }),
  );
  assert.deepEqual(step.notes, ["Reading the README", "Bash: cargo test"]);

  const done = interpret(JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "All 44 tests pass.", num_turns: 6, total_cost_usd: 0.12 }));
  assert.equal(done.result?.result, "All 44 tests pass.");
  assert.equal(done.result?.num_turns, 6);
});

test("lines that are not events yield nothing", () => {
  assert.deepEqual(interpret("not json"), { notes: [] });
  assert.deepEqual(interpret(JSON.stringify({ type: "user", message: { content: [] } })), { notes: [] });
});

test("subtasks are read from harare blocks only", () => {
  const text = [
    "Done with the parser.",
    "```harare",
    '{"raise": [{"tau": "p/figures", "module": "claude", "body": {"prompt": "draw"}}, {"tau": "p/bad"}]}',
    "```",
    "```json",
    '{"raise": [{"tau": "ignored", "module": "claude"}]}',
    "```",
    "```harare",
    "not json",
    "```",
  ].join("\n");
  assert.deepEqual(proposedRaises(text), [{ tau: "p/figures", module: "claude", body: { prompt: "draw" } }]);
  assert.deepEqual(proposedRaises("no blocks"), []);
});
