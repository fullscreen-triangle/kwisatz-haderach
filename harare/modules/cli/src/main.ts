#!/usr/bin/env node
// cli: run one configured command-line tool per task.
//
// In harare.toml:
//
//   [modules.spraypaint]
//   command = ["node", "./modules/cli/dist/src/main.js"]
//   [modules.spraypaint.config]
//   argv    = ["spraypaint", "ask", "{body.query|reading.0.data.query}", "--json"]
//   cwd     = "{body.repo|reading.0.data.repo}"
//   kind    = "passages"
//   emit_at = "{tau}/passages"
//
// A chunk runs the tool once. A read task runs it once per value it was
// handed, each run seeing that one value as `reading.0`, and each emitted
// value records the value it came from.
//
// Every run emits one value (default kind "<module>.output") with the argv,
// exit code and parsed output. A non-zero exit also makes this module exit
// non-zero, so the engine adds an error value: the tool's output and the fact
// that it failed both stay on the graph.

import { spawn } from "node:child_process";
import { runModule, type Task, type Value } from "@harare/sdk";
import { expand, parseOutput, type Scope } from "./template.js";

interface CliConfig {
  argv?: string[];
  kind?: string;
  parse?: "auto" | "json" | "lines" | "text";
  timeout_s?: number;
  cwd?: string;
  emit_at?: string;
  max_output?: number;
}

const tail = (s: string, n: number) => (s.length > n ? "…" + s.slice(s.length - n) : s);

async function once(task: Task, cfg: CliConfig, reading: Value[]): Promise<number | null> {
  const scope: Scope = { body: task.body, reading, node: task.node, tau: task.tau, config: task.config, run: task.run, task: task.task };
  const argv = expand(cfg.argv!, scope);
  const cwd = cfg.cwd ? expand([cfg.cwd], scope)[0] : undefined;
  const at = cfg.emit_at ? expand([cfg.emit_at], scope)[0] : undefined;
  const [prog, ...args] = argv as [string, ...string[]];
  const max = cfg.max_output ?? 200_000;
  task.progress(`running ${prog}${reading.length ? ` for value #${reading[0]!.seq}` : ""}`);

  const child = spawn(prog, args, { cwd, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (b: Buffer) => {
    if (stdout.length <= max) stdout += b.toString();
  });
  child.stderr.on("data", (b: Buffer) => (stderr = tail(stderr + b.toString(), 4000)));
  const onCancel = () => child.kill();
  task.signal.addEventListener("abort", onCancel);
  const timer = cfg.timeout_s ? setTimeout(() => child.kill(), cfg.timeout_s * 1000) : null;
  const code: number | null = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (c) => resolve(c));
  });
  if (timer) clearTimeout(timer);
  task.signal.removeEventListener("abort", onCancel);

  const clipped = stdout.length > max;
  const output = parseOutput(clipped ? stdout.slice(0, max) : stdout, clipped ? "text" : cfg.parse ?? "auto");
  task.emit(
    cfg.kind ?? `${task.module}.output`,
    { argv, ...(cwd ? { cwd } : {}), exit_code: code, output, ...(clipped ? { clipped_at: max } : {}), ...(code !== 0 && stderr ? { stderr } : {}) },
    { ...(at ? { tau: at } : {}), read: reading.map((v) => v.seq) },
  );
  if (code !== 0) process.stderr.write(`${prog} exited with ${code}\n${stderr}\n`);
  return code;
}

runModule(async (task) => {
  const cfg = (task.config ?? {}) as CliConfig;
  if (!Array.isArray(cfg.argv) || cfg.argv.length === 0) {
    throw new Error(`cli: module ${task.module} has no config.argv in harare.toml`);
  }
  const batches = task.reading.length ? task.reading.map((v) => [v]) : [[]];
  const failed: string[] = [];
  for (const reading of batches) {
    if (task.signal.aborted) break;
    const code = await once(task, cfg, reading);
    if (code !== 0) failed.push(reading.length ? `value #${reading[0]!.seq}: exit ${code}` : `exit ${code}`);
  }
  if (failed.length && !task.signal.aborted) throw new Error(`${cfg.argv[0]} failed (${failed.join("; ")})`);
});
