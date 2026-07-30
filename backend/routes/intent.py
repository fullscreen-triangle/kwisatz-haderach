"""
Intent route — Agent Smith's minimum-sufficient loop.

A single read-only round-trip: an uttered intent arrives as text, the local model
(Ollama) chooses which search organ fits and drafts a query, the route shells out to
that Rust tool (search-not-fetch — a fresh walk, never a cached answer), and returns
the ranked slice.

This is the orchestrator step of the Agent Smith runtime: the local model is the
controller; `purpose` / `spraypaint` are its world-access tools. It honours the
blueprint invariants of docs/agents/split-attention-synchronised-agents.tex:
  - Inv 2 (never-resetting committed count): every committed intent increments a
    monotone counter `m`, persisted on disk, never decremented.
  - Inv 3 (search-not-fetch): the tool is re-run on every call; no answer is stored.
  - Inv 4 (exclusive phases): the route only commits (it never re-indexes), so
    construction and commitment never share an instant here.

Ollama must be running (`ollama serve`, model pulled). The search organs must be on
PATH or resolvable at ~/.cargo/bin (they are not on the non-interactive shell PATH).
"""

import os
import re
import json
import shutil
import asyncio
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal

from backend.routes import facts as facts_mod
from backend.routes import nav as nav_mod

router = APIRouter()
ROOT = Path(__file__).parent.parent.parent

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# The orchestrator's own committed count (distinct from each tool's internal count).
COUNT_DIR = ROOT / "backend" / ".agent_smith"
COUNT_FILE = COUNT_DIR / "count"

# Registry of world-access organs the orchestrator may choose. Each entry says how to
# resolve the binary and how to run a read-only search with it.
TOOLS = {
    "purpose": {
        "bin": "purpose",
        "desc": "locate a symbol / definition / section — answers WHERE something is",
        "json": False,   # plain text: `file:line [kind] name` + snippet
    },
    "spraypaint": {
        "bin": "spraypaint",
        "desc": "retrieve passages of content — answers WHAT a passage says about a topic",
        "json": True,    # structured JSON with results[], price, committed_count
    },
}

TOOL_CHOICE_SYSTEM = """You route a user's request to exactly one routine and write its query.

Routines:
- "purpose": locate a symbol, function, definition, or document section. Use for "where is X", "find the definition of X", "which file has X".
- "spraypaint": retrieve passages of prose/content. Use for "what does X say", "find passages about X", "explain X from the docs".
- "facts": answer a fact about the user's GitHub repositories from local structured data. Use for "how many repos", "list my Rust repos", "which repo is about X".
- "nav": browse the filesystem step by step and read a file. Use for "what folders are in my documents", "open FOLDER", "go up", "read FILE and summarise it".

Reply with ONLY a JSON object, no prose:
{"tool": "purpose" | "spraypaint" | "facts" | "nav", "query": "<the search string to run>"}

The query should be the salient search terms, not a full sentence."""

# Deterministic keyword rules, tried before Ollama. Each pattern maps an utterance shape to
# a routine so the router works with the model down (the common case on the node). First
# match wins; order matters.
#
# nav is the stateful filesystem browser (ls/open/up/home/read), matched relative to a
# persisted cursor. Its rules come FIRST so "open borgia" / "read the pdf" / "what folders
# are here" go to nav, not to facts (repos) or the old stateless readfile. facts stays for
# GitHub-repo questions; the two are disambiguated by the word "repo" vs "folder/file".
_ROUTE_RULES = [
    # repo/inventory facts — must mention repos, else "how many files" would steal it
    ("facts", re.compile(r"\b(how many|number of|list|show|which|what)\b.*\brepo", re.I)),
    ("facts", re.compile(r"\brepositor(y|ies)\b", re.I)),
    # filesystem navigation + read (stateful cursor)
    ("nav",   re.compile(r"\b(open|go (in)?to|enter|cd|navigate to|move to)\b", re.I)),
    ("nav",   re.compile(r"\b(go )?(up|back|parent)\b|\bone level up\b", re.I)),
    ("nav",   re.compile(r"\b(go )?home\b|\bstart over\b|\breset\b", re.I)),
    ("nav",   re.compile(r"\b(read|summari[sz]e|summary of|tldr|what'?s in)\b", re.I)),
    ("nav",   re.compile(r"\b(what|which|list|show)\b.*\b(folder|file|director|content)", re.I)),
    ("nav",   re.compile(r"\bwhere am i\b|\bwhat'?s here\b|\bfolders?\b|\bfiles?\b", re.I)),
    # code search
    ("purpose",  re.compile(r"\bwhere is\b|\bwhere'?s\b|\bfind the definition\b|\bwhich file has\b|\blocate\b|\bdefinition of\b", re.I)),
    ("spraypaint", re.compile(r"\bwhat does\b.*\bsay\b|\bpassages?\b|\bexplain\b", re.I)),
]

VALID_TOOLS = ("purpose", "spraypaint", "facts", "nav")


class IntentRequest(BaseModel):
    text: str
    explain: Optional[bool] = False   # if true, add a one-line natural-language answer


class Choice(BaseModel):
    tool: Literal["purpose", "spraypaint", "facts", "nav"]
    query: str


class IntentResponse(BaseModel):
    tool: str
    query: str
    slice: dict          # {"kind": "purpose"|"spraypaint", ...tool-shaped payload}
    answer: Optional[str] = None
    m: int               # orchestrator committed count after this act
    model: str


# ----------------------------------------------------------------------------- count

def _read_count() -> int:
    try:
        return int(COUNT_FILE.read_text().strip() or "0")
    except (FileNotFoundError, ValueError):
        return 0


def _commit() -> int:
    """Increment the monotone committed count and persist it. Never decrements."""
    COUNT_DIR.mkdir(parents=True, exist_ok=True)
    n = _read_count() + 1
    COUNT_FILE.write_text(str(n))
    return n


# ------------------------------------------------------------------------ ollama call

async def _ollama_json(system: str, user: str) -> dict:
    """Call Ollama forcing JSON output. Raises HTTPException on transport failure."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
        "format": "json",   # constrain the model to emit valid JSON
    }
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
            resp.raise_for_status()
            content = resp.json()["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama not running. Start it with: ollama serve")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e}")
    return json.loads(content)


async def _ollama_text(system: str, user: str) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "stream": False,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        resp.raise_for_status()
        return resp.json()["message"]["content"]


# -------------------------------------------------------------------------- tool shell

def _resolve_bin(name: str) -> str:
    """Find a tool binary: PATH first, then ~/.cargo/bin (not on non-interactive PATH)."""
    found = shutil.which(name)
    if found:
        return found
    cargo = Path.home() / ".cargo" / "bin" / name
    for candidate in (cargo, cargo.with_suffix(".exe")):
        if candidate.exists():
            return str(candidate)
    raise HTTPException(status_code=501, detail=f"Search organ '{name}' is not installed.")


async def _run_tool(tool: str, query: str) -> dict:
    """Run a read-only search with the chosen organ. Fresh walk every call (Inv 3)."""
    spec = TOOLS[tool]
    binary = _resolve_bin(spec["bin"])
    args = [binary, "ask", query]
    if spec["json"]:
        args.append("--json")

    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            cwd=str(ROOT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, err = await asyncio.wait_for(proc.communicate(), timeout=30)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail=f"{tool} timed out")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"{tool} failed to start: {e}")

    text = out.decode("utf-8", "replace").strip()
    stderr = err.decode("utf-8", "replace").strip()
    if proc.returncode != 0:
        # Surface the tool's own stderr so the phone shows WHY (e.g. "no index — run
        # `spraypaint index`") instead of a silent 502. Most common cause: no index yet.
        detail = stderr or f"{tool} exited {proc.returncode} with no error output"
        raise HTTPException(status_code=502, detail=f"{tool}: {detail}")

    if spec["json"]:
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            raise HTTPException(status_code=502, detail=f"{tool} returned non-JSON output")
        return {
            "kind": "spraypaint",
            "results": data.get("results", []),
            "price": data.get("price"),
            "tool_committed_count": data.get("committed_count"),
            "identity_fingerprint": data.get("identity_fingerprint"),
        }
    # purpose: return raw ranked text; the frontend/model reads it directly
    return {"kind": "purpose", "text": text}


def _slice_for_answer(slice_: dict) -> str:
    """Compact the routine slice into a short context block for the explain call."""
    kind = slice_.get("kind")
    if kind == "purpose":
        return slice_.get("text", "")[:1500]
    if kind in ("facts", "readfile", "nav"):
        # These already carry a phrased answer; hand it (plus any excerpt) to the explainer.
        parts = [slice_.get("answer") or ""]
        if slice_.get("excerpt"):
            parts.append(slice_["excerpt"])
        return "\n".join(p for p in parts if p)[:1500]
    lines = [
        f"{r['path']}:{r.get('start_line','?')} — {r.get('snippet','')}"
        for r in slice_.get("results", [])[:6]
    ]
    return "\n".join(lines)[:1500]


# ------------------------------------------------------------------------------- routing

def _keyword_route(text: str) -> Optional[str]:
    """Deterministic first pass: which routine does this utterance shape ask for?
    Returns a routine name, or None if no rule matches (then Ollama may refine)."""
    for tool, pattern in _ROUTE_RULES:
        if pattern.search(text):
            return tool
    return None


async def _route(text: str) -> Choice:
    """Pick a routine + query. Keyword rules decide first (work with Ollama down); only
    if no rule matches do we ask the model to disambiguate. The model is a tiebreaker,
    never a gate — a downed model still routes deterministically."""
    kw = _keyword_route(text)
    if kw:
        # facts/readfile take the whole utterance as their query (they parse it themselves);
        # the search organs want just the salient terms, but the raw text is a fine default.
        return Choice(tool=kw, query=text)

    # No deterministic hit — let Ollama choose among all four routines if it's up.
    try:
        raw = await _ollama_json(TOOL_CHOICE_SYSTEM, text)
        tool = raw.get("tool", "purpose")
        if tool not in VALID_TOOLS:
            tool = "purpose"
        return Choice(tool=tool, query=raw.get("query") or text)
    except (HTTPException, json.JSONDecodeError, ValueError, KeyError):
        # Model down / junk: default to purpose (always available, no index-less failure
        # mode as loud as spraypaint's) with the raw text.
        return Choice(tool="purpose", query=text)


async def _dispatch(choice: Choice, want_summary: bool) -> dict:
    """Run the chosen routine and return its slice. facts/nav are in-process Python;
    purpose/spraypaint shell out to the Rust organs. A fresh answer every call (Inv 3)."""
    if choice.tool == "facts":
        return await facts_mod.answer_facts(choice.query)
    if choice.tool == "nav":
        # nav decides ls/open/up/read itself; summary only when the utterance asked to read.
        return await nav_mod.answer_nav(choice.query, want_summary=want_summary)
    return await _run_tool(choice.tool, choice.query)


# ------------------------------------------------------------------------------- route

@router.post("/", response_model=IntentResponse)
async def intent(req: IntentRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty intent.")

    # 1. Route: deterministic keyword rules first, Ollama refines only when up.
    choice = await _route(text)

    # 2. Run the chosen routine — a fresh answer, never cached (Inv 3). readfile summarizes
    #    when the utterance asked to (or explain was set) and the model is up.
    want_summary = bool(req.explain) or bool(
        re.search(r"\bsummari[sz]e|summary|tldr\b", text, re.I))
    slice_ = await _dispatch(choice, want_summary=want_summary)

    # 3. Optional: phrase a one-line natural answer from the slice.
    answer = None
    if req.explain:
        try:
            answer = await _ollama_text(
                "Answer the user's request in one or two sentences using ONLY the search "
                "results below. Cite file:line. If the results don't answer it, say so.",
                f"Request: {text}\n\nResults:\n{_slice_for_answer(slice_)}",
            )
        except Exception:
            answer = None  # explain is best-effort; the slice is the real payload

    # 4. Commit: increment the monotone count (Inv 2). This is an act; it never resets.
    m = _commit()

    return IntentResponse(
        tool=choice.tool,
        query=choice.query,
        slice=slice_,
        answer=answer,
        m=m,
        model=OLLAMA_MODEL,
    )


@router.get("/count")
def count():
    """The orchestrator's committed count (read-only; does not increment)."""
    return {"m": _read_count()}
