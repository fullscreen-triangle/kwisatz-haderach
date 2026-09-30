#!/usr/bin/env node
// web: search the internet for a query and hand the pages to spraypaint.
//
// Chunk body: { query, k? }   (k: how many results to fetch, default 8)
//
// Search is a private SearXNG (server-3, reached through a tunnel at $SEARXNG_URL). Each
// result page is fetched (10 s, at most 1 MB, HTML or plain text only), reduced to text
// and written into the corpus under its domain, so each site is one scene and one busy
// site cannot crowd the others out of spraypaint's allocation.
//
// Values on this node:
//   results   { query, results: [{ n, url, title, snippet, engines, file?, note? }], refused }
//             — every search result, fetched or not; the snippet is SearXNG's. `refused` lists
//             the engines that did not answer ("bing: CAPTCHA"), so an empty result list says why
//   query     { query, repo, source: "web" }  — read by the spraypaint module

import { runModule } from "@harare/sdk";
import { freshCorpus, index, shortHash, writeDoc } from "./corpus.js";
import { decodePage, htmlToText, titleOf } from "./html.js";
import { domainOf } from "./names.js";

const MAX_BYTES = 1_000_000;

interface Result {
  n: number;
  url: string;
  title: string;
  snippet: string;
  engines: string[];
  file?: string;
  note?: string;
}

async function fetchText(url: string): Promise<{ title: string; text: string }> {
  const r = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
    headers: { "User-Agent": "Mozilla/5.0 (Agent Smith; personal search)", Accept: "text/html,text/plain;q=0.9" },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const type = r.headers.get("content-type") ?? "";
  if (!/text\/html|text\/plain|application\/xhtml/.test(type)) throw new Error(`not a page (${type.split(";")[0] || "unknown type"})`);
  const reader = r.body?.getReader();
  if (!reader) throw new Error("empty body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => {});
  const raw = decodePage(Buffer.concat(chunks), type);
  return /html/.test(type) ? { title: titleOf(raw), text: htmlToText(raw) } : { title: "", text: raw };
}

runModule(async (task) => {
  const body = (task.body ?? {}) as { query?: string; k?: number };
  const query = (body.query ?? "").trim();
  if (!query) throw new Error("web: the body has no query");
  const base = process.env["SEARXNG_URL"];
  if (!base) throw new Error("web: SEARXNG_URL is not set on this node");

  task.progress("searching the web");
  let data: any;
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/search?${new URLSearchParams({ q: query, format: "json" })}`,
                          { signal: AbortSignal.timeout(30_000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    data = await r.json();
  } catch (e) {
    throw new Error(`web search unreachable (${(e as Error).message}) — is the SearXNG tunnel up?`);
  }
  const want = Math.max(1, Math.min(body.k ?? 8, 15));
  const results: Result[] = (data.results ?? []).slice(0, want).map((x: any, i: number) => ({
    n: i + 1, url: String(x.url ?? ""), title: String(x.title ?? ""), snippet: String(x.content ?? ""),
    engines: Array.isArray(x.engines) ? x.engines : [],
  }));

  const refused: string[] = (data.unresponsive_engines ?? []).map((u: any) => (Array.isArray(u) ? u.join(": ") : String(u)));

  const dir = freshCorpus(task.run, task.module, task.task);
  let done = 0;
  await Promise.all(results.map(async (res) => {
    if (task.signal.aborted) return;
    try {
      const page = await fetchText(res.url);
      if (!page.text.trim()) throw new Error("no text on the page");
      const name = `${String(res.n).padStart(2, "0")}-${shortHash(res.url)}.md`;
      // the title is the page's own text; the URL is a name and stays out (mapped back via `results`)
      res.file = writeDoc(dir, domainOf(res.url), name, page.title ? [`# ${page.title}`] : [], page.text);
    } catch (e) {
      res.note = (e as Error).message;
    }
    task.progress(`read ${++done} of ${results.length} pages`, done / Math.max(1, results.length));
  }));

  task.emit("results", { query, results, refused });
  if (!results.some((r) => r.file)) return;           // nothing readable to judge
  task.progress("indexing the pages");
  index(dir);
  task.emit("query", { query, repo: dir, source: "web" });
});

