// Test module: reads the values it was handed and emits one "seen" value on
// <task.tau>/<config.out>, which records what it read (and so draws an edge).
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin });
const out = (m) => process.stdout.write(JSON.stringify(m) + "\n");

rl.once("line", (line) => {
  const task = JSON.parse(line);
  const suffix = task.config?.out ?? "seen";
  out({ type: "progress", note: `reading ${task.reading.length}`, fraction: 0.5 });
  out({
    type: "emit",
    kind: "seen",
    tau: `${task.tau}/${suffix}`,
    data: { count: task.reading.length, kinds: task.reading.map((v) => v.kind) },
  });
  process.exit(0);
});
