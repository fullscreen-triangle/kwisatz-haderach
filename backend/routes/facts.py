"""
facts + readfile — Agent Smith's structured-data routines.

Two new intent routines that answer a *different class* of question than the search
organs (purpose/spraypaint). Where those locate text, these answer facts and read files:

  facts   — "how many repos do I have", "list my Rust repos", "which repo is about X".
            The answer already lives on disk in docs/data/desk-index.json (repo_count +
            63 repos with metadata, readme_excerpt, and 1024-dim embeddings). We read it
            directly — no Google, no browser, no GitHub round-trip on the hot path.
            After answering, if the cache is stale we fire a background refresh so
            tomorrow's answer is current (local-first + live refresh).

  readfile — "summarize the borgia readme", "read FILE". Locate a file under a whitelist
            of roots, read a byte-capped head, and (if asked + Ollama up) phrase a short
            answer. Falls back to the raw head when the model is down.

Both return a `slice` dict shaped like the search organs so the intent route and the
/command page can render them uniformly:  {"kind": "facts"|"readfile", ...}.

No answer is cached (Inv 3): desk-index.json is re-read on each call; the summary is
re-phrased each time. The monotone committed count `m` is incremented by the caller.
"""

import os
import re
import json
import math
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any

import httpx
from fastapi import HTTPException

ROOT = Path(__file__).parent.parent.parent
DESK_INDEX = ROOT / "docs" / "data" / "desk-index.json"
INVENTORY_JSON = ROOT / "tools" / "github_manager" / "output" / "inventory.json"
GITHUB_USER = os.getenv("GITHUB_USER", "fullscreen-triangle")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

# Refresh the repo cache in the background if it's older than this many days.
REFRESH_AFTER_DAYS = int(os.getenv("FACTS_REFRESH_DAYS", "7"))
# Roots a readfile request may resolve under. Anything outside is rejected (path-escape guard).
READ_ROOTS = [ROOT, Path.home() / "Documents"]
READ_CAP_BYTES = 60_000


# ============================================================================ facts

def _load_repos() -> Dict[str, Any]:
    """Load the repo index from disk. desk-index.json preferred (has embeddings);
    fall back to the github_manager inventory. Never hits the network."""
    if DESK_INDEX.exists():
        with DESK_INDEX.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return {
            "repos": data.get("repos", []),
            "repo_count": data.get("repo_count", len(data.get("repos", []))),
            "generated_at": data.get("generated_at"),
            "source": "desk-index.json",
        }
    if INVENTORY_JSON.exists():
        with INVENTORY_JSON.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return {"repos": data, "repo_count": len(data), "generated_at": None,
                "source": "inventory.json"}
    raise HTTPException(status_code=501,
                        detail="No repo index on this node. Run tools/github_manager first.")


def _is_stale(generated_at: Optional[str]) -> bool:
    if not generated_at:
        return True
    try:
        # generated_at like "2026-05-25T02:14:33.035Z"
        from datetime import datetime, timezone
        ts = datetime.fromisoformat(generated_at.replace("Z", "+00:00"))
        age_days = (datetime.now(timezone.utc) - ts).total_seconds() / 86400
        return age_days > REFRESH_AFTER_DAYS
    except (ValueError, TypeError):
        return True


def _spawn_refresh() -> None:
    """Fire-and-forget: rebuild the repo inventory in the background. Best-effort,
    never blocks or fails the request (the established `python -m tools.*` idiom)."""
    try:
        asyncio.create_task(_refresh_inventory())
    except RuntimeError:
        pass  # no running loop (shouldn't happen inside a route) — skip silently


async def _refresh_inventory() -> None:
    try:
        proc = await asyncio.create_subprocess_exec(
            "python", "-m", "tools.github_manager",
            "--user", GITHUB_USER, "--inventory-only",
            cwd=str(ROOT),
            stdout=asyncio.subprocess.DEVNULL,
            stderr=asyncio.subprocess.DEVNULL,
        )
        await asyncio.wait_for(proc.communicate(), timeout=120)
    except Exception:
        pass  # background refresh is opportunistic; the user already has their answer


async def _embed(text: str) -> Optional[List[float]]:
    """Embed a query via Ollama's embeddings endpoint. None if the model is down."""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(f"{OLLAMA_URL}/api/embeddings",
                                     json={"model": OLLAMA_EMBED_MODEL, "prompt": text})
            resp.raise_for_status()
            return resp.json().get("embedding")
    except Exception:
        return None


def _cosine(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return -1.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else -1.0


def _repo_row(r: Dict[str, Any]) -> Dict[str, Any]:
    """A compact, embedding-free view of a repo for the response."""
    return {
        "name": r.get("name"),
        "language": r.get("language"),
        "description": r.get("description") or "",
        "topics": r.get("topics", []),
        "url": r.get("html_url"),
    }


# language aliases so "typescript"/"ts" both match the stored "TypeScript"
_LANG_ALIASES = {"ts": "typescript", "js": "javascript", "py": "python", "rs": "rust"}


def _match_language(text: str, repos: List[Dict[str, Any]]) -> Optional[str]:
    langs = {(r.get("language") or "").lower() for r in repos}
    for word in re.findall(r"[a-zA-Z+#]+", text.lower()):
        w = _LANG_ALIASES.get(word, word)
        if w in langs and w:
            return w
    return None


async def answer_facts(text: str) -> Dict[str, Any]:
    """Route a repo/inventory question to a concrete answer read from disk."""
    idx = _load_repos()
    repos: List[Dict[str, Any]] = idx["repos"]
    low = text.lower()

    # Kick a background refresh if the cache is old — never blocks this answer.
    if _is_stale(idx.get("generated_at")):
        _spawn_refresh()

    # --- count ---
    if re.search(r"\bhow many\b|\bnumber of\b|\bcount\b|\btotal\b", low):
        lang = _match_language(low, repos)
        if lang:
            rows = [r for r in repos if (r.get("language") or "").lower() == lang]
            return {"kind": "facts",
                    "answer": f"{len(rows)} {rows[0]['language'] if rows else lang} repositories.",
                    "rows": [_repo_row(r) for r in rows], "source": idx["source"]}
        return {"kind": "facts",
                "answer": f"{idx['repo_count']} repositories.",
                "rows": [], "source": idx["source"]}

    # --- filter/list by language ---
    lang = _match_language(low, repos)
    if lang and re.search(r"\blist\b|\bshow\b|\bwhich\b|\bwhat\b|\brepos?\b|\brepositor", low):
        rows = [r for r in repos if (r.get("language") or "").lower() == lang]
        disp = rows[0]["language"] if rows else lang
        return {"kind": "facts",
                "answer": f"{len(rows)} {disp} repositories: " +
                          ", ".join(r["name"] for r in rows[:20]) + ("…" if len(rows) > 20 else ""),
                "rows": [_repo_row(r) for r in rows], "source": idx["source"]}

    # --- semantic "which repo is about X" (embeddings if Ollama up, else keyword) ---
    m = re.search(r"about (.+)$", low) or re.search(r"repo(?:sitory)? (?:for|on|about) (.+)$", low)
    topic = (m.group(1).strip() if m else text.strip())
    ranked = await _rank_repos(topic, repos)
    if ranked:
        top = ranked[:5]
        return {"kind": "facts",
                "answer": f"Closest repos to “{topic}”: " + ", ".join(r["name"] for r in top),
                "rows": [_repo_row(r) for r in top], "source": idx["source"]}

    # --- fallback: just report the count ---
    return {"kind": "facts",
            "answer": f"{idx['repo_count']} repositories.",
            "rows": [_repo_row(r) for r in repos[:10]], "source": idx["source"]}


async def _rank_repos(topic: str, repos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Rank repos by relevance to `topic`. Cosine over stored embeddings when Ollama can
    embed the query; keyword overlap over name/description/readme_excerpt otherwise."""
    have_emb = repos and repos[0].get("embedding")
    if have_emb:
        qv = await _embed(topic)
        if qv:
            scored = [(_cosine(qv, r.get("embedding") or []), r) for r in repos]
            scored.sort(key=lambda x: x[0], reverse=True)
            return [r for s, r in scored if s > 0]
    # keyword fallback
    terms = set(re.findall(r"[a-z0-9]+", topic.lower()))
    if not terms:
        return []
    def score(r):
        hay = " ".join([r.get("name", ""), r.get("description") or "",
                        r.get("readme_excerpt") or "", " ".join(r.get("topics", []))]).lower()
        return sum(1 for t in terms if t in hay)
    scored = [(score(r), r) for r in repos]
    scored = [(s, r) for s, r in scored if s > 0]
    scored.sort(key=lambda x: x[0], reverse=True)
    return [r for s, r in scored]


# ========================================================================= readfile

def _resolve_path(hint: str) -> Path:
    """Turn a spoken file hint into a concrete path under an allowed root.
    Tries a direct path first, then a filename glob across the whitelist roots.
    Raises 404 if nothing matches, 403 if a match escapes the whitelist."""
    hint = hint.strip().strip('"').strip("'")

    # 1. direct path (absolute or repo-relative)
    for base in READ_ROOTS:
        cand = (base / hint).resolve()
        if cand.is_file() and _within_roots(cand):
            return cand
    direct = Path(hint).expanduser()
    if direct.is_file():
        r = direct.resolve()
        if _within_roots(r):
            return r
        raise HTTPException(status_code=403, detail=f"{hint} is outside the allowed roots.")

    # 2. glob by the salient tokens (e.g. "borgia readme" -> **/*borgia*README*)
    tokens = [t for t in re.findall(r"[A-Za-z0-9_.-]+", hint) if len(t) > 1]
    if not tokens:
        raise HTTPException(status_code=404, detail=f"No file matched “{hint}”.")
    # readme is a common ask; normalise it
    pattern = "*" + "*".join(tokens) + "*"
    best: Optional[Path] = None
    for base in READ_ROOTS:
        if not base.exists():
            continue
        for p in base.rglob("*"):
            if not p.is_file():
                continue
            name = p.name.lower()
            if all(t.lower() in str(p).lower() for t in tokens) or \
               (("readme" in hint.lower() and "readme" in name)
                and any(t.lower() in str(p.parent).lower() for t in tokens if t.lower() != "readme")):
                if _within_roots(p.resolve()):
                    best = p.resolve()
                    break
        if best:
            break
    if best:
        return best
    raise HTTPException(status_code=404, detail=f"No file matched “{hint}”.")


def _within_roots(p: Path) -> bool:
    for base in READ_ROOTS:
        try:
            p.relative_to(base.resolve())
            return True
        except ValueError:
            continue
    return False


async def answer_readfile(text: str, want_summary: bool) -> Dict[str, Any]:
    """Locate a file from the utterance, read a capped head, optionally summarize it."""
    # strip the verb so the hint is just the file reference
    hint = re.sub(r"^\s*(please\s+)?(summari[sz]e|read|open|show me|what'?s in|tldr( of)?)\s+",
                  "", text, flags=re.I).strip()
    hint = re.sub(r"\bfor me\b|\bplease\b", "", hint, flags=re.I).strip()
    path = _resolve_path(hint or text)

    raw = path.read_bytes()[:READ_CAP_BYTES]
    content = raw.decode("utf-8", "replace")
    truncated = path.stat().st_size > READ_CAP_BYTES
    rel = str(path.relative_to(ROOT)) if _within_roots(path) and str(path).startswith(str(ROOT)) else str(path)

    answer = None
    if want_summary:
        answer = await _summarize(text, content)

    return {"kind": "readfile", "path": rel,
            "answer": answer,
            "excerpt": content[:2000],
            "truncated": truncated,
            "bytes": path.stat().st_size}


async def _summarize(request: str, content: str) -> Optional[str]:
    """Phrase a 2-line answer from the file using Ollama. None if the model is down —
    the caller then shows the raw excerpt with a note."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content":
                "Summarize the file content for the user's request in 2-3 sentences. "
                "Be concrete; name what the file is and what it contains. If it doesn't "
                "answer the request, say so plainly."},
            {"role": "user", "content": f"Request: {request}\n\nFile content:\n{content[:8000]}"},
        ],
        "stream": False,
    }
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
            resp.raise_for_status()
            return resp.json()["message"]["content"].strip()
    except Exception:
        return None
