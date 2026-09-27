"""
The two brains.

local  — Ollama on this node (qwen2.5 7B by default). Private and free, ~tens of seconds
         per call on CPU. Model calls are serialised (one at a time) because the CPU is
         shared with mail extraction and other services.
claude — the Anthropic API, used only to escalate: when the local planner can't produce a
         valid plan, or the command starts with `deep:`. It uses the official SDK,
         adaptive thinking, structured output for plans, and server-side refusal fallbacks.
         What it receives: the command, the tool catalogue and — for synthesis — the
         evidence the agents gathered. Nothing else.
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Optional

import httpx

LOCAL_MODEL = os.getenv("AGENT_LOCAL_MODEL", "qwen2.5:7b-instruct-q4_K_M")
CLAUDE_MODEL = os.getenv("AGENT_CLAUDE_MODEL", "claude-opus-5")
_local_lock = asyncio.Lock()
_claude_client = None


class BrainError(Exception):
    pass


def _ollama_url() -> str:
    return (os.getenv("OLLAMA_URL") or "http://127.0.0.1:11434").rstrip("/")


async def local_json(system: str, user: str, schema: dict, timeout: float = 600) -> dict:
    async with _local_lock, httpx.AsyncClient(timeout=timeout) as c:
        try:
            r = await c.post(f"{_ollama_url()}/api/chat", json={
                "model": LOCAL_MODEL, "stream": False, "format": schema,
                "options": {"temperature": 0, "num_ctx": 8192},
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
        except httpx.HTTPError as e:
            raise BrainError(f"local model unreachable ({type(e).__name__})")
    if r.status_code != 200:
        raise BrainError(f"local model answered HTTP {r.status_code}")
    try:
        return json.loads(r.json()["message"]["content"])
    except (ValueError, KeyError):
        raise BrainError("local model returned invalid JSON")


async def local_text(system: str, user: str, timeout: float = 900) -> str:
    async with _local_lock, httpx.AsyncClient(timeout=timeout) as c:
        try:
            r = await c.post(f"{_ollama_url()}/api/chat", json={
                "model": LOCAL_MODEL, "stream": False,
                "options": {"temperature": 0.2, "num_ctx": 8192},
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
        except httpx.HTTPError as e:
            raise BrainError(f"local model unreachable ({type(e).__name__})")
    if r.status_code != 200:
        raise BrainError(f"local model answered HTTP {r.status_code}")
    return r.json()["message"]["content"].strip()


def claude_available() -> bool:
    if not os.getenv("ANTHROPIC_API_KEY"):
        return False
    try:                                   # the keeper knows whether the key is currently rejected
        from backend.keeper.service import KEEPER
        row = KEEPER.rows.get("anthropic")
        return row is None or row.state != "dead"
    except Exception:
        return True


def _client():
    global _claude_client
    if _claude_client is None:
        import anthropic
        _claude_client = anthropic.AsyncAnthropic()
    return _claude_client


async def _claude(system: str, user: str, schema: Optional[dict]) -> str:
    import anthropic
    output_config = {"effort": "medium"}
    if schema is not None:
        output_config["format"] = {"type": "json_schema", "schema": schema}
    try:
        resp = await _client().beta.messages.create(
            model=CLAUDE_MODEL,
            max_tokens=16000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",               # a declined request re-runs on Anthropic's recommended model
            thinking={"type": "adaptive"},
            output_config=output_config,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
    except anthropic.AuthenticationError:
        raise BrainError("Anthropic rejected the API key — put a fresh one in the vault and push")
    except anthropic.RateLimitError:
        raise BrainError("Anthropic rate limit — try again shortly")
    except anthropic.APIStatusError as e:
        raise BrainError(f"Anthropic API error {e.status_code}")
    except anthropic.APIConnectionError:
        raise BrainError("could not reach the Anthropic API")
    if resp.stop_reason == "refusal":
        raise BrainError("Claude declined this request")
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()


async def claude_json(system: str, user: str, schema: dict) -> dict:
    text = await _claude(system, user, schema)
    try:
        return json.loads(text)
    except ValueError:
        raise BrainError("Claude returned invalid JSON")


async def claude_text(system: str, user: str) -> str:
    return await _claude(system, user, None)
