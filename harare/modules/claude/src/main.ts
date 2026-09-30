#!/usr/bin/env node
// claude: one headless Claude Code session per task.
//
// Chunk body:
//   prompt           what to do (required unless this is a read task)
//   repo | cwd       where to work (default: config.cwd, then the engine's cwd)
//   worktree         true → work in a fresh git worktree on branch harare/<run>-t<task>
//   model, permission_mode, allowed_tools, add_dirs   passed to claude
//   open_vscode      true → open the working directory in VS Code as the session starts
//
// Module config (harare.toml):
//   claude_bin       path to claude (default $HARARE_CLAUDE_BIN, then `claude` on
//                    PATH, then the binary bundled with the VS Code extension)
//   code_bin         path to VS Code's `code` (default "code")
//   permission_mode  default permission mode (headless sessions cannot ask you)
//   allowed_tools    default tool allowlist
//   worktree_root    where worktrees go (default <repo>/../.harare-worktrees)
//   raise_modules    modules the session may propose subtasks for
//   read_prompt      prompt used when the module is started to read values
//
// Values it emits on its node:
//   claude.session   session id, working directory, how to resume and open it
//   claude.result    the final message, turns, duration, cost
//   claude.changes   for worktrees: branch, changed files, diff stat
// and it raises the subtasks the session proposed (see stream.ts).

import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { runModule, type Task } from "@harare/sdk";
import { interpret, proposedRaises, type ResultInfo } from "./stream.js";

interface Body {
  prompt?: string;
  repo?: string;
  cwd?: string;
  worktree?: boolean;
  model?: string;
  permission_mode?: string;
  allowed_tools?: string[];
  add_dirs?: string[];
  open_vscode?: boolean;
}

interface Cfg {
  claude_bin?: string;
  code_bin?: string;
  cwd?: string;
  permission_mode?: string;
  allowed_tools?: string[];
  worktree_root?: string;
  raise_modules?: string[];
  read_prompt?: string;
  model?: string;
}

/**
 * The claude binary: config, then $HARARE_CLAUDE_BIN, then `claude` on PATH,
 * then the newest binary bundled with the VS Code extension.
 */
export function findClaude(cfg: Cfg): string {
  if (cfg.claude_bin) return cfg.claude_bin;
  const env = process.env["HARARE_CLAUDE_BIN"];
  if (env) return env;
  if (spawnSync("claude", ["--version"], { windowsHide: true }).status === 0) return "claude";
  const exts = join(homedir(), ".vscode", "extensions");
  const exe = process.platform === "win32" ? "claude.exe" : "claude";
  const found = (existsSync(exts) ? readdirSync(exts) : [])
    .filter((d) => d.startsWith("anthropic.claude-code-"))
    .map((d) => ({ d, v: (d.match(/-(\d+)\.(\d+)\.(\d+)/) ?? []).slice(1).map(Number) }))
    .sort((a, b) => b.v[0]! - a.v[0]! || b.v[1]! - a.v[1]! || b.v[2]! - a.v[2]!)
    .map(({ d }) => join(exts, d, "resources", "native-binary", exe))
    .find((p) => existsSync(p));
  return found ?? "claude";
}

const git = (cwd: string, args: string[]) => {
  const r = spawnSync("git", ["-C", cwd, ...args], { encoding: "utf8", windowsHide: true });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${(r.stderr || r.stdout).trim()}`);
  return r.stdout.trim();
};

function systemPrompt(task: Task, cfg: Cfg): string {
  const lines = [
    `You are running unattended as task ${task.task} of harare run ${task.run}, on node "${task.tau}".`,
    "Nobody can answer questions during this session; make reasonable choices and state them.",
    "Your final message is recorded as a value on your node, so make it a complete account of what you did and found.",
  ];
  if (cfg.raise_modules?.length) {
    lines.push(
      "If the work splits into subtasks better done separately, end your final message with a fenced block tagged harare:",
      '```harare\n{"raise": [{"tau": "<node address>", "module": "<module>", "body": {"prompt": "..."}}]}\n```',
      `Modules you may raise for: ${cfg.raise_modules.join(", ")}. Put subtask addresses under "${task.tau}/".`,
    );
  }
  return lines.join("\n");
}

function readPrompt(task: Task, cfg: Cfg): string {
  const intro = cfg.read_prompt ?? `New values arrived on node "${task.tau}". Read them and act on them.`;
  return `${intro}\n\n${JSON.stringify(task.reading.map((v) => ({ seq: v.seq, node: v.tau, kind: v.kind, by: v.by.module, data: v.data })), null, 2)}`;
}

runModule(async (task) => {
  const body = (task.body ?? {}) as Body;
  const cfg = (task.config ?? {}) as Cfg;
  const prompt = body.prompt ?? (task.reading.length > 0 ? readPrompt(task, cfg) : undefined);
  if (!prompt) throw new Error("claude: the chunk body has no prompt");

  let cwd = resolve(body.cwd ?? body.repo ?? cfg.cwd ?? process.cwd());
  let branch: string | undefined;
  let base: string | undefined;
  if (body.worktree) {
    const root = git(cwd, ["rev-parse", "--show-toplevel"]);
    const name = `${task.run}-t${task.task}`;
    const parent = cfg.worktree_root ? resolve(cfg.worktree_root) : join(dirname(root), ".harare-worktrees");
    mkdirSync(parent, { recursive: true });
    const path = join(parent, `${basename(root)}-${name}`);
    branch = `harare/${name}`;
    git(root, ["worktree", "add", "-b", branch, path]);
    base = git(path, ["rev-parse", "HEAD"]);
    cwd = path;
  }

  const sessionId = randomUUID();
  const bin = findClaude(cfg);
  task.emit("claude.session", {
    session_id: sessionId,
    cwd,
    ...(branch ? { branch } : {}),
    resume: `claude --resume ${sessionId}`,
    open: `code "${cwd}"`,
  });

  if (body.open_vscode) {
    const code = cfg.code_bin ?? "code";
    try {
      // `code` is a .cmd script on Windows, which only a shell can start.
      const win = process.platform === "win32";
      spawn(win ? `"${code}"` : code, [win ? `"${cwd}"` : cwd], { detached: true, stdio: "ignore", shell: win, windowsHide: true }).unref();
      task.progress(`opened VS Code on ${cwd}`);
    } catch (e) {
      task.progress(`could not open VS Code: ${e instanceof Error ? e.message : e}`);
    }
  }

  const args = ["-p", "--output-format", "stream-json", "--verbose", "--session-id", sessionId, "--append-system-prompt", systemPrompt(task, cfg)];
  const model = body.model ?? cfg.model;
  if (model) args.push("--model", model);
  const mode = body.permission_mode ?? cfg.permission_mode;
  if (mode) args.push("--permission-mode", mode);
  const tools = body.allowed_tools ?? cfg.allowed_tools;
  if (tools?.length) args.push("--allowedTools", ...tools);
  if (body.add_dirs?.length) args.push("--add-dir", ...body.add_dirs);

  const child = spawn(bin, args, { cwd, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  child.stdin.end(prompt);
  let stderr = "";
  child.stderr.on("data", (b: Buffer) => (stderr = (stderr + b.toString()).slice(-4000)));
  const onCancel = () => child.kill();
  task.signal.addEventListener("abort", onCancel);

  let result: ResultInfo | undefined;
  let turns = 0;
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  lines.on("line", (line) => {
    const ev = interpret(line);
    for (const note of ev.notes) task.progress(note);
    if (ev.notes.length) turns++;
    if (ev.result) result = ev.result;
  });

  const code: number | null = await new Promise((res, rej) => {
    child.on("error", rej);
    child.on("close", (c) => res(c));
  });
  task.signal.removeEventListener("abort", onCancel);

  if (result) {
    task.emit("claude.result", { ...result, session_id: result.session_id ?? sessionId, cwd, ...(branch ? { branch } : {}) });
    const allowed = new Set(cfg.raise_modules ?? []);
    for (const r of proposedRaises(result.result ?? "")) {
      if (allowed.has(r.module)) task.raise(r.tau, r.module, r.body ?? null, r.priority !== undefined ? { priority: r.priority } : {});
      else task.progress(`ignored a proposed subtask for module ${r.module} (not in raise_modules)`);
    }
  }

  if (branch && base) {
    try {
      task.emit("claude.changes", {
        branch,
        cwd,
        base,
        commits: git(cwd, ["log", "--oneline", `${base}..HEAD`]).split("\n").filter(Boolean),
        uncommitted: git(cwd, ["status", "--porcelain"]).split("\n").filter(Boolean),
        diff_stat: git(cwd, ["diff", "--stat", base]),
      });
    } catch (e) {
      task.progress(`could not summarise the worktree: ${e instanceof Error ? e.message : e}`);
    }
  }

  if (code !== 0 && !task.signal.aborted) {
    throw new Error(`claude exited with ${code} after ${turns} step(s)${stderr ? `:\n${stderr}` : ""}`);
  }
});
