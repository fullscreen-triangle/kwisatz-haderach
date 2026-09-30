#!/usr/bin/env node
// laptop: gather the laptop's files for a query and hand them to spraypaint.
//
// Chunk body: { query, k? }   (k: how many hits to read, default 12)
//
// The laptop runs tools/laptop_node (kwisatz-haderach), reachable over the tailnet at
// $LAPTOP_NODE_URL with $LAPTOP_NODE_TOKEN. Its /search finds files by name and, through
// the Windows Search index, by content; /read returns their text (PDF and Word included).
// Credential files are refused by the node itself.
//
// Values on this node:
//   candidates   { query, hits: [{ n, path, name, where, file? }] }  — every hit, and which
//                corpus file holds its text (hits with no readable text have no `file`)
//   query        { query, repo, source: "laptop" }  — read by the spraypaint module
//   skipped      { query, reason }  — a credential-shaped query is not searched
// A laptop that is off or refuses makes this module throw: an `error` value here, and
// the run's other branches carry on.

import { runModule } from "@harare/sdk";
import { credentialShaped, freshCorpus, index, safe, shortHash, writeDoc } from "./corpus.js";
import { sceneOf } from "./names.js";

interface Hit {
  path: string;
  name?: string;
  where?: string;
  size?: number;
}

async function call(base: string, token: string, path: string, params: Record<string, string>): Promise<any> {
  const url = `${base.replace(/\/$/, "")}${path}?${new URLSearchParams(params)}`;
  let r: Response;
  try {
    r = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000) });
  } catch (e) {
    throw new Error(`laptop unreachable (${(e as Error).name}) — is it on and on the tailnet?`);
  }
  if (r.status === 401 || r.status === 403) throw new Error("laptop refused the token — run `python -m tools.keeper push`");
  if (!r.ok) throw new Error(`laptop answered HTTP ${r.status} on ${path}`);
  return r.json();
}

runModule(async (task) => {
  const body = (task.body ?? {}) as { query?: string; k?: number };
  const query = (body.query ?? "").trim();
  if (!query) throw new Error("laptop: the body has no query");
  if (credentialShaped(query)) {
    task.emit("skipped", { query, reason: "credential-shaped words are not searched on the laptop" });
    return;
  }
  const base = process.env["LAPTOP_NODE_URL"];
  const token = process.env["LAPTOP_NODE_TOKEN"];
  if (!base || !token) throw new Error("laptop: LAPTOP_NODE_URL / LAPTOP_NODE_TOKEN are not set on this node");

  task.progress("searching the laptop");
  const found = (await call(base, token, "/search", { q: query, k: "25" })).results as Hit[];
  const dir = freshCorpus(task.run, task.module, task.task);
  const want = Math.max(1, Math.min(body.k ?? 12, 25));
  const hits: Array<Hit & { n: number; file?: string; note?: string }> = found.map((h, i) => ({ ...h, n: i + 1 }));
  let read = 0;
  for (const h of hits) {
    if (read >= want || task.signal.aborted) break;
    task.progress(`reading ${h.name ?? h.path}`, read / want);
    let doc: any;
    try {
      doc = await call(base, token, "/read", { path: h.path });
    } catch (e) {
      h.note = (e as Error).message;
      continue;
    }
    const text = String(doc.text ?? "");
    if (!text.trim()) {
      h.note = doc.note || "no text";
      continue;
    }
    const name = `${String(h.n).padStart(2, "0")}-${safe(h.name ?? h.path, 50)}-${shortHash(h.path)}.md`;
    // no header: a path is a name, not content (spraypaint does not search paths);
    // the backend maps the file back to its path through `candidates`.
    h.file = writeDoc(dir, sceneOf(h.path), name, [], text);
    read++;
  }
  task.emit("candidates", { query, hits });
  if (read === 0) return;                      // nothing readable: no judgement to ask for
  task.progress("indexing what was read");
  index(dir);
  task.emit("query", { query, repo: dir, source: "laptop" });
});
