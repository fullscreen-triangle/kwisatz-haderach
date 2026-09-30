"""
Search everywhere — one request, searched on the laptop, in the mail and on the web at
once, as a run of Harare (harare/, served on this node at $HARARE_URL).

The run has three branches under find/<slug>/:

  mail     a `spraypaint` chunk over the mail mirror, answered at mail/passages
  laptop   the `laptop` module gathers the laptop's files for the query into a corpus
           (tools/laptop_node over the tailnet) and emits a `query` value; spraypaint
           reads it and answers at laptop/passages
  web      the `web` module fetches result pages from the private SearXNG (server-3)
           into a corpus and does the same, answering at web/passages

Every branch is judged by the same spraypaint, so each carries one verdict — covered /
partial / declined — with evidence lines (graffiti/specifications.md). A branch that
fails (laptop asleep, search unreachable) is an `error` value on its node; the others
still answer. `shape` turns a run's report into what the phone shows: per source, the
verdict and the passages, each mapped back to what can be opened — the mail message,
the laptop file, the web page.
"""

from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional

import httpx

SOURCES = ("laptop", "mail", "web")


def base_url() -> str:
    return (os.getenv("HARARE_URL") or "http://127.0.0.1:7470").rstrip("/")


def slug(query: str) -> str:
    s = re.sub(r"[^\w]+", "-", query.lower(), flags=re.UNICODE).strip("-")[:40]
    return s or "query"


def chunks(query: str, mail_root: str) -> List[dict]:
    tau = f"find/{slug(query)}"
    return [
        {"tau": f"{tau}/mail", "module": "spraypaint", "body": {"query": query, "repo": mail_root}},
        {"tau": f"{tau}/laptop", "module": "laptop", "body": {"query": query}},
        {"tau": f"{tau}/web", "module": "web", "body": {"query": query}},
    ]


async def start(client: httpx.AsyncClient, query: str, mail_root: str) -> str:
    r = await client.post(f"{base_url()}/api/runs", json={"label": f"find: {query}", "chunks": chunks(query, mail_root)})
    r.raise_for_status()
    return r.json()["run"]


async def report(client: httpx.AsyncClient, run: str) -> dict:
    r = await client.get(f"{base_url()}/api/runs/{run}/report")
    r.raise_for_status()
    return r.json()


async def runs(client: httpx.AsyncClient) -> List[dict]:
    r = await client.get(f"{base_url()}/api/runs")
    r.raise_for_status()
    data = r.json()
    items = data.get("runs", data) if isinstance(data, dict) else data
    return [x for x in items if str(x.get("label") or "").startswith("find: ")]


# ------------------------------------------------------------------ shaping


def _mail_open(path: str) -> dict:
    """uni/2026-09/<stem>.md -> the message key the inbox opens (account:stem)."""
    acct = path.split("/", 1)[0]
    stem = path.rsplit("/", 1)[-1].removesuffix(".md")
    return {"kind": "mail", "ref": f"{acct}:{stem}"}


def _error_text(data: Any) -> str:
    """An engine `error` value holds the module's stderr (a Node error: message first,
    stack after) and a `problem`; a failed tool run holds its own stderr."""
    if isinstance(data, dict):
        for k in ("message", "error", "stderr"):
            lines = [l.strip() for l in str(data.get(k) or "").splitlines() if l.strip()]
            if lines:
                return re.sub(r"^Error:\s*", "", lines[0])[:300]
        if data.get("problem"):
            return str(data["problem"])[:300]
    return str(data)[:300]


def _source(nodes: Dict[str, List[dict]], prefix: str, src: str, quiescent: bool,
            subject: Optional[callable] = None) -> dict:
    own = nodes.get(prefix, [])
    judged = nodes.get(f"{prefix}/passages", [])
    out: Dict[str, Any] = {"source": src, "state": "pending", "verdict": None, "reason": "", "passages": []}

    by_file: Dict[str, dict] = {}
    for v in own:
        if v["kind"] == "candidates":
            out["candidates"] = [{k: h.get(k) for k in ("n", "path", "name", "where", "file", "note")}
                                 for h in v["data"].get("hits", [])]
            by_file.update({h["file"]: {"kind": "laptop", "ref": h["path"], "title": h.get("name") or h["path"]}
                            for h in v["data"].get("hits", []) if h.get("file")})
        elif v["kind"] == "results":
            out["results"] = [{k: r.get(k) for k in ("n", "url", "title", "snippet", "file", "note")}
                              for r in v["data"].get("results", [])]
            out["refused"] = v["data"].get("refused") or []
            by_file.update({r["file"]: {"kind": "web", "ref": r["url"], "title": r.get("title") or r["url"]}
                            for r in v["data"].get("results", []) if r.get("file")})
        elif v["kind"] == "skipped":
            out.update(state="skipped", reason=v["data"].get("reason", ""))

    errors = [_error_text(v["data"]) for v in own + judged if v["kind"] == "error"]
    for v in judged:
        if v["kind"] != "passages":
            continue
        ans = v["data"].get("output")
        if not isinstance(ans, dict):
            errors.append(_error_text(v["data"]) or "spraypaint returned no JSON")
            continue
        cov = ans.get("coverage") or {}
        out.update(state="done", verdict=cov.get("verdict"), reason=cov.get("reason", ""),
                   weight_share=cov.get("weight_share"), fingerprint=ans.get("identity_fingerprint"))
        for r in ans.get("results", []):
            path = r.get("path", "")
            opener = _mail_open(path) if src == "mail" else by_file.get(path, {"kind": src, "ref": path})
            title = (subject(opener["ref"]) if src == "mail" and subject else None) or opener.get("title") or path
            # matched_terms come from the index and describe the whole 40-line passage; the
            # snippet is only its evidence lines, long ones cut. So a matched term need not be
            # in the snippet: say which are, rather than let the card imply all of them are.
            snippet = r.get("snippet", "")
            matched = r.get("matched_terms") or []
            out["passages"].append({
                "title": title, "path": path, "scene": r.get("scene"),
                "lines": [r.get("evidence_start_line") or r.get("start_line"), r.get("evidence_end_line") or r.get("end_line")],
                "snippet": snippet, "matched": matched, "score": r.get("score"),
                "in_evidence": [t for t in matched if t.lower() in snippet.lower()],
                "open": {"kind": opener["kind"], "ref": opener["ref"]},
            })
    # spraypaint orders passages by its per-scene allocation; the card leads with the ones that
    # carry the most of the query, so a "covered" source shows the passage that earned it first
    out["passages"].sort(key=lambda p: (-len(p["matched"]), -len(p["in_evidence"]), -(p["score"] or 0)))
    if errors:
        out["error"] = errors[0]
        if out["state"] != "done":
            out["state"] = "error"
    elif out["state"] == "pending" and quiescent:
        # the run finished and nothing was judged: say whether the search found nothing,
        # or found things none of which could be read
        out["state"] = "empty"
        if src == "web" and not out.get("results"):
            refused = out.get("refused") or []
            out["reason"] = "the web search returned no results" + (
                f" (engines that did not answer: {'; '.join(refused)})" if refused else "")
        elif src == "web":
            out["reason"] = "none of the result pages could be read"
        elif src == "laptop" and not out.get("candidates"):
            out["reason"] = "the laptop's search found no file matching these words"
        elif src == "laptop":
            out["reason"] = "none of the files found could be read"
        else:
            out["reason"] = "no answer"
    return out


def shape(rep: dict, subject: Optional[callable] = None) -> dict:
    """A run's report -> {query, quiescent, sources: {laptop, mail, web}}."""
    nodes: Dict[str, List[dict]] = {}
    for n in rep.get("nodes", []):
        nodes[n["tau"]] = n.get("values", [])
    # every address in a search run is find/<slug>/...
    prefix = next(("/".join(t.split("/")[:2]) for t in nodes if t.startswith("find/")), "find/query")
    quiescent = bool(rep.get("quiescent"))
    label = str(rep.get("label") or "")
    return {
        "run": rep.get("run"), "query": label.removeprefix("find: "), "quiescent": quiescent,
        "tasks": rep.get("tasks"),
        "sources": {s: _source(nodes, f"{prefix}/{s}", s, quiescent, subject) for s in SOURCES},
    }
