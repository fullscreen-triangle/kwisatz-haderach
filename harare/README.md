# Harare

A runtime graph that runs work. You raise **chunks** (module + node address +
data) into a **run**; the engine dispatches each chunk exactly once, gives
modules the values they read, and records every act in an append-only log.
It never judges a value: a crash is an `error` value on its node and the run
goes on to quiescence. Track between nodes exists only where a module read a
value at one node and emitted at another — that is what the metro map draws.

```
engine/        Rust: graph, scheduler, runners, act log, HTTP API, CLI
sdk-ts/        write a module in TypeScript, or drive runs over HTTP
modules/note   put given values on the graph
modules/cli    wrap any command-line tool (argv template in harare.toml)
modules/claude one headless Claude Code session per task; can raise subtasks
metro/         the run as a transit map (served by `harare serve`)
harare.toml    what may run, where, and what the work shares
plans/         example plan files
```

## Build and test

```bash
npm install && npm run build && npm test          # TypeScript side
cd engine && cargo build --release && cargo test  # engine
```

## Use

```bash
harare check                      # validate harare.toml and print what it allows
harare run plans/smoke.toml       # run a plan to quiescence, print the report
harare serve                      # API + map at http://127.0.0.1:7470/
harare report <run-dir> [--json]
```

Over HTTP (`sdk-ts` has a client): `POST /api/runs` with `{label, chunks}`,
`POST /api/runs/{id}/raise`, `GET /api/runs/{id}` (snapshot),
`GET /api/runs/{id}/events` (server-sent acts), `GET /api/runs/{id}/report`,
`POST /api/runs/{id}/tasks/{task}/cancel`.

## What harare.toml decides

- **modules** — only declared modules ever start. A chunk carries data, never
  a command line. `wants` makes a module a reader of values by kind, origin or
  node prefix.
- **resources** — `slots` (whole units held while a task runs) and `rate`
  (bandwidth-like, water-filled among running tasks by priority).
- **runners** — `local` always exists; a remote runner wraps the module's
  command (e.g. over `ssh`) and is probed before work is sent to it. Work that
  may only run on an unreachable runner waits, visibly.
- **engine** — priority aging, reservation for long-waiting work, per-run task
  cap (beyond it work is recorded as deferred, not dropped).

Runs live under `.harare/` (gitignored). Don't `harare serve` on a non-loopback
address: the API starts processes on this machine.

## Writing a module

```ts
import { runModule } from "@harare/sdk";
runModule(async (task) => {
  task.progress("working");
  task.emit("answer", { n: 1 });                        // on task.tau
  task.raise(`${task.tau}/next`, "claude", { prompt: "…" });
});
```

The protocol is one JSON object per line on stdin/stdout
(`engine/src/protocol.rs`, mirrored in `sdk-ts/src/protocol.ts`).
