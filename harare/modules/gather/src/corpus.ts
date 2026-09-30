// A small corpus that spraypaint can judge: one directory per task, one scene per
// top-level folder, pinned as spraypaint's root by an empty `.spraypaint/`.
//
// The gathering modules (laptop, web) write the documents they found here, index them,
// and emit a `query` value { query, repo }. The `spraypaint` module wants `query`
// values, so the engine hands it that one; it answers on <τ>/passages, and that read is
// the track from the gathering node to its passages on the map.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** Words that must not be sent through an ask on a tree that may hold secrets
 *  (spraypaint's disclosure rule, graffiti/specifications.md). */
const CREDENTIAL = /\b(token|tokens|secret|secrets|password|passwords|passwort|api[\s_-]?keys?|private[\s_-]?keys?)\b/i;

export function credentialShaped(query: string): boolean {
  return CREDENTIAL.test(query);
}

export function corpusRoot(): string {
  return resolve(process.env["HARARE_CORPORA"] ?? join(".harare", "corpora"));
}

/** A fresh, empty corpus for this task. */
export function freshCorpus(run: string, module: string, task: number): string {
  const dir = join(corpusRoot(), safe(run), `${module}-t${task}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, ".spraypaint"), { recursive: true });
  return dir;
}

/** A path segment that is safe on every filesystem and never empty. */
export function safe(s: string, max = 60): string {
  const t = s.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "").slice(0, max);
  return t || "x";
}

export function shortHash(s: string): string {
  return createHash("sha1").update(s).digest("hex").slice(0, 8);
}

/** Write one document under `scene/` and return its corpus-relative path. */
export function writeDoc(dir: string, scene: string, name: string, header: string[], text: string): string {
  const rel = `${safe(scene, 40)}/${name}`;
  mkdirSync(join(dir, safe(scene, 40)), { recursive: true });
  writeFileSync(join(dir, rel), `${header.length ? `${header.join("\n")}\n\n` : ""}${text}\n`, "utf8");
  return rel;
}

/** `spraypaint index` in the corpus. Throws with spraypaint's own message on failure. */
export function index(dir: string, bin = process.env["SPRAYPAINT_BIN"] ?? "spraypaint"): void {
  const r = spawnSync(bin, ["index"], { cwd: dir, encoding: "utf8", windowsHide: true, timeout: 300_000 });
  if (r.error) throw new Error(`spraypaint could not start: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`spraypaint index failed: ${(r.stderr || r.stdout).trim().slice(-400)}`);
}
