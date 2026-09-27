"""
The laptop, from the node's side: a client for tools/laptop_node over the tailnet.

server-2 reaches the laptop at LAPTOP_NODE_URL (its Tailscale address) with the bearer
token LAPTOP_NODE_TOKEN — both arrive from the KeePassXC vault with `keeper push`
(`python -m tools.keeper add-laptop` makes the entry). A sleeping or offline laptop is an
ordinary answer (LaptopOffline), not an error: the console says so and carries on.
"""

from __future__ import annotations

import os
from pathlib import PureWindowsPath
from typing import Mapping, Optional, Tuple

import httpx

MAX_ATTACH = 20 * 1024 * 1024


class LaptopOffline(Exception):
    pass


class LaptopRefused(Exception):
    """The laptop answered but refused (outside the served folders, a credential, missing)."""


def _env(env: Optional[Mapping[str, str]] = None) -> Mapping[str, str]:
    return env if env is not None else os.environ


def configured(env: Optional[Mapping[str, str]] = None) -> bool:
    e = _env(env)
    return bool(e.get("LAPTOP_NODE_URL") and e.get("LAPTOP_NODE_TOKEN"))


def _client(env, timeout: float) -> httpx.AsyncClient:
    e = _env(env)
    if not configured(e):
        raise LaptopOffline("the laptop isn't connected yet (python -m tools.keeper add-laptop, then push)")
    return httpx.AsyncClient(base_url=e["LAPTOP_NODE_URL"].rstrip("/"), timeout=timeout,
                             headers={"Authorization": f"Bearer {e['LAPTOP_NODE_TOKEN']}"})


async def _get(path: str, params: dict, timeout: float = 30, env=None) -> httpx.Response:
    try:
        async with _client(env, timeout) as c:
            r = await c.get(path, params=params)
    except httpx.HTTPError as e:
        raise LaptopOffline(f"the laptop isn't answering ({type(e).__name__}) — asleep, or off the tailnet")
    if r.status_code in (403, 404, 400, 413):
        raise LaptopRefused(r.json().get("detail", r.text) if r.headers.get("content-type", "").startswith(
            "application/json") else r.text)
    if r.status_code == 401:
        raise LaptopRefused("the laptop rejected the token — vault and laptop disagree (re-run add-laptop)")
    r.raise_for_status()
    return r


async def health(env=None) -> dict:
    return (await _get("/health", {}, timeout=8, env=env)).json()


async def search(q: str, k: int = 15, content: bool = True, under: str = "", env=None) -> list:
    r = await _get("/search", {"q": q, "k": k, "content": content, "under": under}, env=env)
    return r.json()["results"]


async def listing(path: str = "", env=None) -> dict:
    return (await _get("/list", {"path": path}, env=env)).json()


async def read(path: str, env=None) -> dict:
    return (await _get("/read", {"path": path}, timeout=90, env=env)).json()


async def fetch(path: str, limit: int = MAX_ATTACH, env=None) -> Tuple[bytes, str, str]:
    """(bytes, content type, file name) — for attachments and for opening on the phone."""
    r = await _get("/file", {"path": path}, timeout=120, env=env)
    if len(r.content) > limit:
        raise LaptopRefused(f"{name_of(path)} is larger than {limit // 1024 // 1024} MB")
    return r.content, r.headers.get("content-type", "application/octet-stream"), name_of(path)


def name_of(path: str) -> str:
    return PureWindowsPath(path).name


def pretty(path: str) -> str:
    """C:\\Users\\kunda\\Documents\\x\\y.pdf -> Documents\\x\\y.pdf (for lists on a phone)."""
    p = PureWindowsPath(path)
    parts = p.parts
    for anchor in ("Documents", "Desktop", "Downloads", "OneDrive"):
        if anchor in parts:
            return str(PureWindowsPath(*parts[parts.index(anchor):]))
    return str(p)
