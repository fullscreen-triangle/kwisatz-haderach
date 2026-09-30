// Writing a harare module in TypeScript.
//
//   import { runModule } from "@harare/sdk";
//   runModule(async (task) => {
//     task.progress("searching");
//     task.emit("passages", { hits: [] });
//   });
//
// When the handler returns, the module exits 0. If it throws, the error goes
// to stderr and the module exits 1; the engine turns that into an `error`
// value on the node and the run carries on.

import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import {
  PROTOCOL_VERSION,
  type Address,
  type FromModule,
  type Grant,
  type RaiseOptions,
  type TaskMessage,
  type ToModule,
  type Value,
} from "./protocol.js";

export interface Task {
  readonly run: string;
  readonly task: number;
  readonly module: string;
  readonly tau: Address;
  readonly body: any;
  readonly config: any;
  readonly reading: Value[];
  readonly node: Value[];
  /** Aborted when the engine asks the task to stop. */
  readonly signal: AbortSignal;
  /** Current share of each rate resource this task demanded. */
  grant(): Grant;
  onGrant(listener: (grant: Grant) => void): void;
  /** Append a value. Defaults: this task's node; read = the values it was started to read. */
  emit(kind: string, data?: unknown, opts?: { tau?: Address; read?: number[] }): void;
  /** Attach a chunk for `module` at `tau` — a subtask of this one. */
  raise(tau: Address, module: string, body?: unknown, opts?: RaiseOptions): void;
  progress(note: string, fraction?: number): void;
  /** The values currently on a node. */
  read(tau: Address): Promise<Value[]>;
}

export interface ModuleIO {
  input?: Readable;
  output?: Writable;
  errors?: Writable;
  exit?: (code: number) => void;
}

export async function runModule(handler: (task: Task) => unknown | Promise<unknown>, io: ModuleIO = {}): Promise<void> {
  const input = io.input ?? process.stdin;
  const output = io.output ?? process.stdout;
  const errors = io.errors ?? process.stderr;
  const exit = io.exit ?? ((code: number) => process.exit(code));

  const lines = createInterface({ input, crlfDelay: Infinity });
  const iter = lines[Symbol.asyncIterator]();
  const first = await iter.next();
  if (first.done) {
    errors.write("harare module: no task on stdin\n");
    exit(2);
    return;
  }
  const msg = JSON.parse(String(first.value)) as ToModule;
  if (msg.type !== "task") {
    errors.write("harare module: first line is not a task\n");
    exit(2);
    return;
  }
  if (msg.harare > PROTOCOL_VERSION) {
    errors.write(`harare module: engine speaks protocol ${msg.harare}, this SDK knows ${PROTOCOL_VERSION}\n`);
    exit(2);
    return;
  }

  const t: TaskMessage = msg;
  let grant: Grant = t.grant ?? {};
  const grantListeners: Array<(g: Grant) => void> = [];
  const waiting = new Map<Address, Array<(v: Value[]) => void>>();
  const abort = new AbortController();

  // Keep listening for grants, read answers and cancellation.
  const listening = (async () => {
    for (;;) {
      const next = await iter.next();
      if (next.done) break;
      let m: ToModule;
      try {
        m = JSON.parse(String(next.value)) as ToModule;
      } catch {
        continue;
      }
      if (m.type === "grant") {
        grant = m.grant;
        for (const l of grantListeners) l(grant);
      } else if (m.type === "values") {
        const q = waiting.get(m.tau);
        const resolve = q?.shift();
        if (q && q.length === 0) waiting.delete(m.tau);
        resolve?.(m.values);
      } else if (m.type === "cancel") {
        abort.abort(new Error("cancelled by harare"));
      }
    }
  })();

  let last: Promise<void> = Promise.resolve();
  const send = (m: FromModule) => {
    const line = JSON.stringify(m) + "\n";
    last = new Promise((resolve, reject) => output.write(line, (e) => (e ? reject(e) : resolve())));
  };

  const task: Task = {
    run: t.run,
    task: t.task,
    module: t.module,
    tau: t.tau,
    body: t.body,
    config: t.config,
    reading: t.reading ?? [],
    node: t.node ?? [],
    signal: abort.signal,
    grant: () => ({ ...grant }),
    onGrant: (l) => grantListeners.push(l),
    emit: (kind, data, opts = {}) => send({ type: "emit", kind, data: data ?? null, ...opts }),
    raise: (tau, module, body, opts = {}) => send({ type: "raise", tau, module, body: body ?? null, ...opts }),
    progress: (note, fraction) => send(fraction === undefined ? { type: "progress", note } : { type: "progress", note, fraction }),
    read: (tau) =>
      new Promise<Value[]>((resolve) => {
        const q = waiting.get(tau) ?? [];
        q.push(resolve);
        waiting.set(tau, q);
        send({ type: "read", tau });
      }),
  };

  let code = 0;
  try {
    await handler(task);
  } catch (e) {
    code = 1;
    errors.write(`${e instanceof Error ? e.stack ?? e.message : String(e)}\n`);
  }
  try {
    await last;
  } catch {
    // the engine closed our stdout; nothing more can be said
  }
  lines.close();
  void listening;
  exit(code);
}
