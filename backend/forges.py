"""
Your repositories on every forge you use: GitHub, GitLab (gitlab.com, Bitspark's), and the
university's Gitea — as tracker's `profile repos` lists them, here on the node.

Accounts come from FORGE_<ID>_{KIND,URL,USER,TOKEN}, which `python -m tools.keeper push`
reads from the Git group of the KeePassXC vault (tools/keeper/forges.py). `probe_for(id)`
checks one token for the keeper (and reads GitLab's own expiry date); `listing()` asks
every account for its repositories and groups copies of one repository across forges.
Nothing is written to any forge.
"""

from __future__ import annotations

import asyncio
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Mapping, Optional

import httpx

_KIND = re.compile(r"^FORGE_([A-Z0-9_]+)_KIND$")
PAGES = 10
TTL = 30 * 60
RENEW = {"github": "https://github.com/settings/tokens",
         "gitlab": "https://{host}/-/user_settings/personal_access_tokens",
         "gitea": "https://{host}/user/settings/applications"}


@dataclass(frozen=True)
class Account:
    id: str
    kind: str
    host: str
    user: str
    token: str

    @property
    def api(self) -> str:
        return {"github": "https://api.github.com", "gitlab": f"https://{self.host}/api/v4",
                "gitea": f"https://{self.host}/api/v1"}[self.kind]

    @property
    def headers(self) -> dict:
        return {"PRIVATE-TOKEN": self.token} if self.kind == "gitlab" else {"Authorization": f"token {self.token}"}

    @property
    def renew_url(self) -> str:
        return RENEW.get(self.kind, "").format(host=self.host)


def discover(env: Mapping[str, str]) -> List[Account]:
    out = []
    for key in sorted(env):
        m = _KIND.match(key)
        if not m:
            continue
        up, kind = m.group(1), env[key].strip().lower()
        url, token = env.get(f"FORGE_{up}_URL", ""), env.get(f"FORGE_{up}_TOKEN", "")
        host = re.sub(r"^https?://", "", url).strip("/").lower()
        if kind in RENEW and host and token:
            out.append(Account(up.lower(), kind, host, env.get(f"FORGE_{up}_USER", ""), token))
    return out


def _gh_expiry(raw: Optional[str]) -> Optional[datetime]:
    if not raw:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S %Z", "%Y-%m-%d %H:%M:%S %z"):
        try:
            t = datetime.strptime(raw.strip(), fmt)
            return t if t.tzinfo else t.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def probe_for(account_id: str):
    """A keeper probe for one forge account (see backend/keeper/registry.py)."""
    from backend.keeper.probes import ProbeResult, _missing, _transient

    async def probe(ctx) -> "ProbeResult":
        a = next((x for x in discover(ctx.env) if x.id == account_id), None)
        if a is None:
            return _missing(f"forge account {account_id} not on the node — set it with tracker, then push")
        path = {"github": "/user", "gitlab": "/personal_access_tokens/self", "gitea": "/user"}[a.kind]
        try:
            r = await ctx.client.get(a.api + path, headers=a.headers, timeout=20)
        except httpx.HTTPError as e:
            return ProbeResult(ok=None, detail=f"{a.host} could not be reached ({type(e).__name__}); will retry")
        if r.status_code in (401, 403):
            return ProbeResult(ok=False, detail=f"{a.host} rejected the token — renew it with tracker "
                                                f"(tracker tokens set {a.id}), then python -m tools.keeper push")
        if r.status_code != 200:
            return _transient(r, a.host)
        exp, detail = None, f"token works for {a.user or 'you'} on {a.host}"
        if a.kind == "github":
            exp = _gh_expiry(r.headers.get("github-authentication-token-expiration"))
        elif a.kind == "gitlab":
            body = r.json()
            if body.get("expires_at"):
                exp = datetime.fromisoformat(body["expires_at"]).replace(tzinfo=timezone.utc)
            detail += " · GitLab rotates it: tracker tokens refresh, then push"
        return ProbeResult(ok=True, detail=detail, expires_at=exp)
    return probe


# --------------------------------------------------------------------------- listing

def _row(a: Account, r: dict) -> dict:
    if a.kind == "gitlab":
        return {"account": a.id, "kind": a.kind, "host": a.host, "name": r.get("path", ""),
                "full_name": r.get("path_with_namespace", ""), "private": r.get("visibility") != "public",
                "url": r.get("web_url", ""), "updated": r.get("last_activity_at"), "description": r.get("description") or ""}
    return {"account": a.id, "kind": a.kind, "host": a.host, "name": r.get("name", ""),
            "full_name": r.get("full_name", ""), "private": bool(r.get("private")),
            "url": r.get("html_url", ""), "updated": r.get("pushed_at") or r.get("updated_at"),
            "description": r.get("description") or ""}


async def repos_of(client: httpx.AsyncClient, a: Account) -> List[dict]:
    path, params = {
        "github": ("/user/repos", {"per_page": 100, "affiliation": "owner,collaborator,organization_member"}),
        "gitlab": ("/projects", {"membership": "true", "simple": "true", "per_page": 100}),
        "gitea": ("/user/repos", {"limit": 50}),
    }[a.kind]
    out = []
    for page in range(1, PAGES + 1):
        r = await client.get(a.api + path, headers=a.headers, params={**params, "page": page}, timeout=30)
        r.raise_for_status()
        batch = r.json()
        out += [_row(a, x) for x in batch]
        if len(batch) < int(params.get("per_page") or params.get("limit")):
            break
    return out


_cache: Dict[str, object] = {"at": 0.0, "data": None}


async def listing(env: Mapping[str, str], refresh: bool = False, client: Optional[httpx.AsyncClient] = None) -> dict:
    if not refresh and _cache["data"] and time.time() - _cache["at"] < TTL:
        return _cache["data"]
    accts = discover(env)
    own = client is None
    client = client or httpx.AsyncClient()
    try:
        results = await asyncio.gather(*(repos_of(client, a) for a in accts), return_exceptions=True)
    finally:
        if own:
            await client.aclose()
    accounts, repos = [], []
    for a, res in zip(accts, results):
        if isinstance(res, Exception):
            code = getattr(getattr(res, "response", None), "status_code", None)
            accounts.append({"id": a.id, "kind": a.kind, "host": a.host, "user": a.user, "count": 0,
                             "error": f"HTTP {code}" if code else type(res).__name__})
        else:
            accounts.append({"id": a.id, "kind": a.kind, "host": a.host, "user": a.user, "count": len(res), "error": ""})
            repos += res
    groups: Dict[str, List[dict]] = {}
    for r in repos:
        groups.setdefault(r["name"].lower(), []).append(r)
    data = {"at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "accounts": accounts,
            "groups": sorted(({"name": k, "copies": v, "updated": max((c["updated"] or "") for c in v)}
                              for k, v in groups.items()), key=lambda g: g["updated"], reverse=True),
            "count": len(repos)}
    _cache.update(at=time.time(), data=data)
    return data
