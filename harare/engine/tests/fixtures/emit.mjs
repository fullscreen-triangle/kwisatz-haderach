// Test module: emits what its chunk body says, raises what it says, and can
// exit non-zero. Speaks the raw protocol, without the SDK.
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });
const out = (m) => process.stdout.write(JSON.stringify(m) + "\n");

rl.once("line", (line) => {
  const task = JSON.parse(line);
  const body = task.body ?? {};
  if (body.emit) out({ type: "emit", kind: body.emit, data: body.data ?? null });
  for (const r of body.raise ?? []) out({ type: "raise", ...r });
  if (body.say) console.log(body.say); // not a protocol line: becomes progress
  if (body.exit) {
    process.stderr.write("boom from emit.mjs\n");
    process.exit(body.exit);
  }
  process.exit(0);
});
