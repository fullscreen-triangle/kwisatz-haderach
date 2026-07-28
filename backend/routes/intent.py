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
import json
import shutil
import asyncio
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal

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

TOOL_CHOICE_SYSTEM = """You route a user's request to exactly one code-search tool and write its query.

Tools:
- "purpose": locate a symbol, function, definition, or document section. Use for "where is X", "find the definition of X", "which file has X".
- "spraypaint": retrieve passages of prose/content. Use for "what does X say", "find passages about X", "explain X from the docs".

Reply with ONLY a JSON object, no prose:
{"tool": "purpose" | "spraypaint", "query": "<the search string to run>"}

The query should be the salient search terms, not a full sentence."""


class IntentRequest(BaseModel):
    text: str
    explain: Optional[bool] = False   # if true, add a one-line natural-language answer


class Choice(BaseModel):
    tool: Literal["purpose", "spraypaint"]
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
    if proc.returncode != 0:
        detail = err.decode("utf-8", "replace").strip() or f"{tool} exited {proc.returncode}"
        # Most likely: no index yet. Surface it usefully.
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
    """Compact the tool slice into a short context block for the explain call."""
    if slice_["kind"] == "purpose":
        return slice_["text"][:1500]
    lines = [
        f"{r['path']}:{r.get('start_line','?')} — {r.get('snippet','')}"
        for r in slice_.get("results", [])[:6]
    ]
    return "\n".join(lines)[:1500]


# ------------------------------------------------------------------------------- route

@router.post("/", response_model=IntentResponse)
async def intent(req: IntentRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Empty intent.")

    # 1. Orchestrator chooses a tool + drafts a query. If Ollama is unreachable or
    #    returns junk, degrade to `purpose` with the raw text — the round-trip must not
    #    depend on the model being up. Tool-choice is an optimisation, not a gate.
    try:
        raw = await _ollama_json(TOOL_CHOICE_SYSTEM, text)
        choice = Choice(tool=raw.get("tool", "purpose"), query=raw.get("query") or text)
    except (HTTPException, json.JSONDecodeError, ValueError, KeyError):
        choice = Choice(tool="purpose", query=text)

    # 2. Run the chosen organ — a fresh search, never a cached answer (Inv 3).
    slice_ = await _run_tool(choice.tool, choice.query)

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
