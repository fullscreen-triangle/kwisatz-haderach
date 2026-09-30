// Test module: holds its slot for body.ms milliseconds, tracking its grant,
// and emits the grant it holds halfway through. Stops early on cancel.
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });
const out = (m) => process.stdout.write(JSON.stringify(m) + "\n");
let task = null;
let grant = {};

rl.on("line", (line) => {
  const msg = JSON.parse(line);
  if (msg.type === "task") {
    task = msg;
    grant = msg.grant;
    const ms = task.body.ms ?? 300;
    out({ type: "emit", kind: "started", data: { name: task.body.name ?? null } });
    // Report the grant midway, while every task started with this one is
    // still running; near the end a sibling may already have finished and
    // left its share behind.
    setTimeout(() => out({ type: "emit", kind: "granted", data: grant }), ms / 2);
    setTimeout(() => process.exit(0), ms);
  } else if (msg.type === "grant") {
    grant = msg.grant;
  } else if (msg.type === "cancel") {
    process.exit(0);
  }
});
