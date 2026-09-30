#!/usr/bin/env node
// note: emit the values a chunk body lists.
//
//   { "kind": "known", "data": { "location": "Greifswald" } }
//   { "values": [ { "kind": "known", "data": ..., "tau": "facts/insurance" }, ... ] }

import { runModule } from "@harare/sdk";

interface Entry {
  kind?: string;
  data?: unknown;
  tau?: string;
}

runModule((task) => {
  const body = (task.body ?? {}) as Entry & { values?: Entry[] };
  const entries: Entry[] = Array.isArray(body.values) ? body.values : [body];
  let n = 0;
  for (const e of entries) {
    if (!e.kind) continue;
    task.emit(e.kind, e.data ?? null, e.tau ? { tau: e.tau } : {});
    n++;
  }
  if (n === 0) throw new Error('note: the body lists no value with a "kind"');
});
