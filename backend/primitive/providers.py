"""
The chat APIs the desk holds keys for, behind one `chat(model, system, user)`.

A model id is `<provider>/<model>`. OpenAI, Gemini (its OpenAI-compatible endpoint), the
Hugging Face router and Ollama speak the OpenAI chat API; Anthropic speaks Messages. Keys
come from the environment the keeper pushes (names from backend/keeper/apikeys.py).

A provider takes part only if its key is on the node and the keeper does not report it
rejected. Each provider's live catalog is read (cached) so a pool model it no longer serves
is skipped, as primitive does with `with_live`.

The pool is chosen, not derived: the catalogs hold hundreds of ids (audio, image, dated
snapshots), and the strongest-for-the-job order is a judgement. It lives in CURATED and can
be replaced per specialty by <state>/primitive/pool.json ({"code": [...], ...}).
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from dataclasses import dataclass
from typing import Dict, List, Mapping, Optional, Set, Tuple

import httpx

from backend.keeper import apikeys
from backend.primitive.route import ChatError, Pool, provider_of
from backend.primitive.trie import clip

CALL_TIMEOUT = 300.0          # reasoning models can think for minutes
CATALOG_TTL = 30 * 60
REFUSED_TTL = 60 * 60         # a refused account (no credit) sits out this long, across tasks
OLLAMA_CTX = 8192             # tokens; one model fits the node's 7.6 GB at this size (deploy notes)


@dataclass(frozen=True)
class Provider:
    id: str
    label: str
    base: str
    keeper_id: Optional[str]          # the keeper row whose state gates it (None: no key)
    style: str = "openai"             # "openai" | "anthropic"

    def key(self, env: Mapping[str, str]) -> Optional[str]:
        return apikeys.BY_ID[self.keeper_id].key(env) if self.keeper_id else None


def _ollama_base(env: Mapping[str, str]) -> str:
    return (env.get("OLLAMA_URL") or "http://127.0.0.1:11434").rstrip("/") + "/v1"


PROVIDERS: Dict[str, Provider] = {p.id: p for p in [
    Provider("anthropic", "Claude", "https://api.anthropic.com/v1", "anthropic", "anthropic"),
    Provider("openai", "OpenAI", "https://api.openai.com/v1", "openai"),
    Provider("gemini", "Gemini", "https://generativelanguage.googleapis.com/v1beta/openai", "gemini"),
    Provider("deepseek", "DeepSeek", "https://api.deepseek.com", "deepseek"),
    Provider("hf", "Hugging Face", "https://router.huggingface.co/v1", "huggingface"),
    Provider("ollama", "Ollama (this node)", "", None),
]}

# Strongest for the job first; families mixed in `verify` so a check can always leave the
# producer's family. Accounts with credit lead (2026-11-02: OpenAI paid, DeepSeek with a
# balance, Gemini Flash free tier); an account that refuses for lack of credit is switched
# off for an hour on its first refusal, so its entries cost one call.
CURATED = Pool(
    code=["openai/gpt-5.5", "deepseek/deepseek-v4-pro", "anthropic/claude-sonnet-5-5",
          "hf/deepseek-ai/DeepSeek-V4-Flash", "hf/Qwen/Qwen2.5-Coder-32B-Instruct", "gemini/gemini-3.5-flash"],
    reasoning=["openai/gpt-5.5", "deepseek/deepseek-v4-pro", "anthropic/claude-opus-5-5",
               "gemini/gemini-3.1-pro-preview", "hf/deepseek-ai/DeepSeek-R1-0528", "gemini/gemini-3.5-flash"],
    general=["openai/gpt-5.5", "deepseek/deepseek-flash", "anthropic/claude-sonnet-5-5", "gemini/gemini-3.5-flash",
             "hf/Qwen/Qwen3-235B-A22B-Instruct-2507"],
    verify=["deepseek/deepseek-flash", "gemini/gemini-3.5-flash", "openai/gpt-5.4-mini", "anthropic/claude-haiku-5-5",
            "hf/Qwen/Qwen3-235B-A22B-Instruct-2507", "hf/meta-llama/Llama-3.3-70B-Instruct",
            "hf/google/gemma-4-31B-it", "hf/zai-org/GLM-5.3-Flash"],
)


def _error(resp: httpx.Response) -> ChatError:
    if resp.status_code in (401, 403):
        # Never the provider's text here: OpenAI echoes part of the key in its 401 body.
        return ChatError(f"HTTP {resp.status_code}: the provider refused the key")
    return ChatError(f"HTTP {resp.status_code}: {clip(resp.text, 300)}")


class Providers:
    """The Backend the routed proposer calls, plus catalogs and availability."""

    def __init__(self, env: Optional[Mapping[str, str]] = None, client: Optional[httpx.AsyncClient] = None,
                 keeper_states: Optional[Mapping[str, str]] = None):
        self.env = env if env is not None else os.environ
        self._client = client
        self._keeper_states = keeper_states
        self._catalogs: Dict[str, Tuple[float, Optional[Set[str]]]] = {}
        self._refused: Dict[str, Tuple[float, str]] = {}

    def refused(self) -> Dict[str, str]:
        """Providers whose account was refused within REFUSED_TTL (an empty balance looks like
        a working key to the keeper's free check; only a real call shows it)."""
        now = time.time()
        return {p: why for p, (at, why) in self._refused.items() if now - at < REFUSED_TTL}

    def remember_refusals(self, blocked: Mapping[str, str]) -> None:
        for p, why in blocked.items():
            if p not in self.refused():
                self._refused[p] = (time.time(), why)

    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=CALL_TIMEOUT)
        return self._client

    def keeper_state(self, p: Provider) -> Optional[str]:
        if not p.keeper_id:
            return None
        if self._keeper_states is not None:
            return self._keeper_states.get(p.keeper_id)
        try:
            from backend.keeper.service import KEEPER
            row = KEEPER.rows.get(p.keeper_id)
            return row.state if row else None
        except Exception:
            return None

    def available(self, p: Provider) -> Tuple[bool, str]:
        if p.keeper_id and not p.key(self.env):
            return False, "no key on the node"
        state = self.keeper_state(p)
        if state in ("dead", "missing", "expired"):
            return False, f"keeper: {state}"
        why = self.refused().get(p.id)
        if why:
            return False, why
        return True, ""

    # ----------------------------------------------------------------- chat

    async def chat(self, model: str, system: str, user: str) -> str:
        pid, _, name = model.partition("/")
        p = PROVIDERS.get(pid)
        if p is None or not name:
            raise ChatError(f"HTTP 404: unknown provider in {model!r}")
        try:
            if p.style == "anthropic":
                return await self._anthropic(p, name, system, user)
            return await self._openai(p, name, system, user)
        except httpx.HTTPError as e:
            raise ChatError(f"unreachable: {type(e).__name__}") from e

    async def chat_tools(self, model: str, messages: List[dict], tools: List[dict]) -> dict:
        """One turn of a tool-calling conversation (OpenAI function-calling format): the
        assistant message, with `tool_calls` when it wants tools run. OpenAI-style providers
        only — the Anthropic account has no credit and the node's model calls tools unreliably."""
        pid, _, name = model.partition("/")
        p = PROVIDERS.get(pid)
        if p is None or p.style != "openai" or pid == "ollama":
            raise ChatError(f"HTTP 400: {model} cannot drive the task agent")
        try:
            resp = await self.client().post(f"{p.base}/chat/completions", headers={"Authorization": f"Bearer {p.key(self.env)}"},
                                            json={"model": name, "messages": messages, "tools": tools, "tool_choice": "auto"})
        except httpx.HTTPError as e:
            raise ChatError(f"unreachable: {type(e).__name__}") from e
        if resp.status_code != 200:
            raise _error(resp)
        try:
            return resp.json()["choices"][0]["message"]
        except (ValueError, KeyError, IndexError):
            raise ChatError("HTTP 200: no message in the reply")

    async def _ollama(self, name: str, system: str, user: str) -> str:
        """Ollama's own API, so the context window can be set: its OpenAI endpoint keeps the
        server default and cuts a long prompt without saying so."""
        resp = await self.client().post(_ollama_base(self.env)[:-3] + "/api/chat", json={
            "model": name, "stream": False, "options": {"num_ctx": OLLAMA_CTX},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}, timeout=900)
        if resp.status_code != 200:
            raise _error(resp)
        return (resp.json().get("message") or {}).get("content") or ""

    async def _openai(self, p: Provider, name: str, system: str, user: str) -> str:
        if p.id == "ollama":
            return await self._ollama(name, system, user)
        base = p.base
        headers = {"Authorization": f"Bearer {p.key(self.env)}"}
        resp = await self.client().post(f"{base}/chat/completions", headers=headers, json={
            "model": name, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]})
        if resp.status_code != 200:
            raise _error(resp)
        try:
            msg = resp.json()["choices"][0]["message"]
        except (ValueError, KeyError, IndexError):
            raise ChatError("HTTP 200: no message in the reply")
        return msg.get("content") or ""

    async def _anthropic(self, p: Provider, name: str, system: str, user: str) -> str:
        resp = await self.client().post(f"{p.base}/messages", headers={
            "x-api-key": p.key(self.env) or "", "anthropic-version": "2023-06-01"}, json={
            "model": name, "max_tokens": 8192, "system": system,
            "messages": [{"role": "user", "content": user}]})
        if resp.status_code != 200:
            raise _error(resp)
        body = resp.json()
        if body.get("stop_reason") == "refusal":
            raise ChatError("HTTP 200: the model refused")       # a failure, not an answer
        return "".join(b.get("text", "") for b in body.get("content", []) if b.get("type") == "text")

    # ----------------------------------------------------------------- catalogs

    async def catalog(self, pid: str) -> Optional[Set[str]]:
        """Ids the provider serves now, as `<provider>/<id>`; None when it could not be asked."""
        at, ids = self._catalogs.get(pid, (0.0, None))
        if ids is not None and time.time() - at < CATALOG_TTL:
            return ids
        p = PROVIDERS[pid]
        try:
            if pid == "ollama":
                r = await self.client().get(_ollama_base(self.env)[:-3] + "/api/tags", timeout=10)
                names = [m["name"] for m in r.json().get("models", [])] if r.status_code == 200 else None
            else:
                headers = ({"x-api-key": p.key(self.env) or "", "anthropic-version": "2023-06-01"}
                           if p.style == "anthropic" else {"Authorization": f"Bearer {p.key(self.env)}"})
                r = await self.client().get(f"{p.base}/models", headers=headers,
                                            params={"limit": "100"} if p.style == "anthropic" else None, timeout=20)
                names = ([m["id"].removeprefix("models/") for m in r.json().get("data", [])]
                         if r.status_code == 200 else None)
        except (httpx.HTTPError, ValueError, KeyError):
            names = None
        got = None if names is None else {f"{pid}/{n}" for n in names}
        if got is not None:
            self._catalogs[pid] = (time.time(), got)
        return got

    async def status(self) -> Dict[str, dict]:
        """Per provider: whether it takes part, why not, and how many models it serves."""
        out = {}
        pids = list(PROVIDERS)
        cats = await asyncio.gather(*(self.catalog(pid) if self.available(PROVIDERS[pid])[0] else _none()
                                      for pid in pids))
        for pid, cat in zip(pids, cats):
            ok, why = self.available(PROVIDERS[pid])
            if ok and pid == "ollama" and cat is None:
                ok, why = False, "not reachable"
            out[pid] = {"label": PROVIDERS[pid].label, "available": ok, "why": why,
                        "served": None if cat is None else len(cat), "catalog": cat}
        return out

    async def pool(self, override: Optional[Pool] = None) -> Tuple[Pool, Optional[Set[str]], Dict[str, dict], Optional[str]]:
        """(pool, live ids or None, provider status, local fallback model or None)."""
        st = await self.status()
        pool = CURATED.overlay(override) if override else CURATED
        usable = {pid for pid, s in st.items() if s["available"]}
        pool = Pool(*([m for m in pool.list(s) if provider_of(m) in usable]
                      for s in ("code", "reasoning", "general", "verify")))
        known = [s["catalog"] for pid, s in st.items() if pid in usable and pid != "ollama"]
        live: Optional[Set[str]] = None
        if known and all(c is not None for c in known):
            live = set().union(*known)
        local = None
        if st["ollama"]["available"]:
            want = f"ollama/{self.env.get('OLLAMA_MODEL') or 'qwen2.5:7b'}"
            local = want if want in (st["ollama"]["catalog"] or set()) else None
        if local:
            # The node's own model is one more family a check can go to: slow on this CPU,
            # but free, and it keeps checks independent when only one cloud family answers.
            pool.verify = pool.verify + [local]
            if live is not None:
                live = live | {local}
        return pool, live, st, local


async def _none():
    return None


def load_override(path) -> Optional[Pool]:
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
        return Pool(*(list(d.get(s, [])) for s in ("code", "reasoning", "general", "verify")))
    except (OSError, ValueError, AttributeError):
        return None
