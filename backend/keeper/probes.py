"""
Live probes — one per credential. Each asks the real provider whether the credential
works right now and, where the provider allows it, renews the derived leaf token.

A probe returns a ProbeResult and never raises for provider answers; the service turns
unexpected exceptions into a transient failure. `ok` is three-valued on purpose:
  True  — the provider accepted it
  False — the provider REJECTED it (dead: a human has to act)
  None  — we couldn't tell (network, 5xx, rate limit): keep the last known state
Collapsing None into False would page Kundai every time Google has a bad minute.

`expires_at` is the expiry a HUMAN must act on (a refresh token that dies, a static key
with a known end date). `auto_expires_at` is the leaf the node renews by itself — shown
on the dashboard as reassurance, never as a warning.
"""

from __future__ import annotations

import asyncio
import base64
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Mapping, Optional

import httpx

from backend import google_oauth
from backend.keeper import github_app

@dataclass
class ProbeContext:
    client: httpx.AsyncClient
    env: Mapping[str, str]
    state_dir: Path


@dataclass
class ProbeResult:
    ok: Optional[bool]
    detail: str = ""
    missing: bool = False
    verified: bool = True            # False = presence-only, the provider was not asked
    mode: str = ""                   # e.g. "app" / "pat" for GitHub
    expires_at: Optional[datetime] = None
    auto_expires_at: Optional[datetime] = None
    renewed: bool = False
    extra: dict = field(default_factory=dict)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _missing(detail: str) -> ProbeResult:
    return ProbeResult(ok=None, missing=True, detail=detail)


def _transient(resp: httpx.Response, who: str) -> ProbeResult:
    return ProbeResult(ok=None, detail=f"{who} answered HTTP {resp.status_code}; will retry")


def _jwt_exp(token: Optional[str]) -> Optional[datetime]:
    """Read `exp` from an unverified JWT payload — display only, never trusted for auth."""
    try:
        payload = str(token).split(".")[1]
        payload += "=" * (-len(payload) % 4)
        exp = float(json.loads(base64.urlsafe_b64decode(payload))["exp"])
        return datetime.fromtimestamp(exp, timezone.utc)
    except Exception:
        return None


# --------------------------------------------------------------------------- Gmail

async def probe_gmail(ctx: ProbeContext) -> ProbeResult:
    """Refresh the access token from the refresh token (backend/google_oauth.py writes it
    where web/lib/gmail.js and the mail poller read it). Using the refresh token is the only
    real liveness test — it also stops Google's six-months-unused invalidation from firing."""
    try:
        r = await google_oauth.refresh(ctx.client, ctx.env)
    except google_oauth.GoogleAuthError as e:
        if e.kind == "missing":
            return _missing(e.detail)
        return ProbeResult(ok=False if e.kind == "rejected" else None, detail=e.detail)

    detail = "access token refreshed"
    # Google only sends refresh_token_expires_in for time-limited refresh tokens — in
    # practice, a consent screen still in "Testing". Its presence is the diagnosis.
    if r["root_expires_at"]:
        detail += (" · consent screen is in Testing, so the refresh token itself expires — "
                   "set it to 'In production' to make it permanent")
    if google_oauth.CALENDAR_SCOPE not in google_oauth.granted_scopes(ctx.env):
        detail += " · no Calendar permission yet: re-consent with node web/scripts/gmail_auth.js"
    return ProbeResult(ok=True, renewed=True, detail=detail, expires_at=r["root_expires_at"],
                       auto_expires_at=r["expires_at"])


# --------------------------------------------------------------------------- Garmin

def _garmin_sync(env: Mapping[str, str], state_dir: Path) -> ProbeResult:
    email, password = env.get("GARMIN_EMAIL"), env.get("GARMIN_PASSWORD")
    if not email or not password:
        return _missing("GARMIN_EMAIL / GARMIN_PASSWORD not on the node")
    try:
        from garminconnect import (Garmin, GarminConnectAuthenticationError,
                                   GarminConnectConnectionError,
                                   GarminConnectTooManyRequestsError)
    except ImportError:
        return ProbeResult(ok=None, detail="garminconnect not installed on the node")

    store = Path(env.get("GARMINTOKENS") or state_dir / "garmin")
    token_file = store / "garmin_tokens.json"
    before = token_file.stat().st_mtime if token_file.exists() else None
    try:
        # login(tokenstore) resumes the stored session, refreshes it if it is about to
        # lapse, and only falls back to a password login when the session is rejected —
        # then saves the new session. That is the whole renewal strategy.
        g = Garmin(email, password)
        needs_mfa, _ = g.login(str(store))
    except GarminConnectAuthenticationError:
        return ProbeResult(ok=False, detail="Garmin rejected the email/password — update the vault entry and push")
    except GarminConnectTooManyRequestsError:
        return ProbeResult(ok=None, detail="Garmin is rate-limiting logins; will retry later")
    except GarminConnectConnectionError as e:
        return ProbeResult(ok=None, detail=f"could not reach Garmin ({type(e).__name__})")
    if needs_mfa:
        return ProbeResult(ok=False, detail="Garmin wants an MFA code — log in once interactively on the node")

    after = token_file.stat().st_mtime if token_file.exists() else None
    leaf = getattr(g.client, "di_token", None) or getattr(g.client, "jwt_web", None)
    return ProbeResult(ok=True, renewed=(after is not None and after != before),
                       detail="session valid" if after == before else "session renewed",
                       auto_expires_at=_jwt_exp(leaf))


async def probe_garmin(ctx: ProbeContext) -> ProbeResult:
    # garminconnect is synchronous; keep it off the event loop so the SSE stream stays live.
    return await asyncio.to_thread(_garmin_sync, ctx.env, ctx.state_dir)


# --------------------------------------------------------------------------- GitHub

async def probe_github(ctx: ProbeContext) -> ProbeResult:
    app_id = ctx.env.get("GITHUB_APP_ID")
    inst_id = ctx.env.get("GITHUB_APP_INSTALLATION_ID")
    key_path = ctx.env.get("GITHUB_APP_PRIVATE_KEY_PATH")
    if app_id and inst_id and key_path:
        return await _probe_github_app(ctx, app_id, inst_id, Path(key_path))
    if ctx.env.get("GITHUB_TOKEN"):
        return await _probe_github_pat(ctx, ctx.env["GITHUB_TOKEN"])
    return _missing("no GitHub App configured (and no personal token either)")


async def _probe_github_app(ctx: ProbeContext, app_id: str, inst_id: str,
                            key_path: Path) -> ProbeResult:
    try:
        pem = key_path.read_text(encoding="utf-8")
    except OSError:
        return _missing("GitHub App private key not on the node — attach it to the vault entry and push")

    token, expires_at = github_app.read_minted(ctx.state_dir)
    renewed = False
    for attempt in range(2):
        if attempt or token is None or github_app.needs_remint(expires_at):
            try:
                expires_at = await github_app.mint(ctx.client, app_id, inst_id, pem, ctx.state_dir)
            except httpx.HTTPStatusError as e:
                code = e.response.status_code
                if code in (401, 403, 404):
                    return ProbeResult(ok=False, mode="app", detail=(
                        f"GitHub refused to mint (HTTP {code}) — check the App ID, installation "
                        "ID and private key in the vault entry"))
                return _transient(e.response, "GitHub")
            token, _ = github_app.read_minted(ctx.state_dir)
            renewed = True
        resp = await ctx.client.get(f"{github_app.GITHUB_API}/installation/repositories",
                                    params={"per_page": 1},
                                    headers={"Authorization": f"Bearer {token}",
                                             "Accept": "application/vnd.github+json"})
        if resp.status_code == 200:
            return ProbeResult(ok=True, mode="app", renewed=renewed, auto_expires_at=expires_at,
                               detail="installation token minted" if renewed else "installation token live")
        if resp.status_code != 401:
            return _transient(resp, "GitHub")
        # 401 on a token we believed live: it was revoked early. Re-mint once, then give up.
    return ProbeResult(ok=False, mode="app", detail="freshly minted token was rejected — is the App still installed?")


async def _probe_github_pat(ctx: ProbeContext, pat: str) -> ProbeResult:
    resp = await ctx.client.get(f"{github_app.GITHUB_API}/rate_limit",
                                headers={"Authorization": f"Bearer {pat}"})
    if resp.status_code == 401:
        return ProbeResult(ok=False, mode="pat", detail="GitHub rejected the personal token — it expired or was revoked")
    if resp.status_code != 200:
        return _transient(resp, "GitHub")

    exp = None
    raw = resp.headers.get("github-authentication-token-expiration")
    if raw:
        try:
            exp = datetime.strptime(raw.replace(" UTC", " +0000"), "%Y-%m-%d %H:%M:%S %z")
        except ValueError:
            exp = None
    detail = "personal token works — create the GitHub App so this never needs renewing"
    # Fine-grained PATs have been reported to echo the CURRENT time here instead of the
    # real expiry. A value within a minute of now is that bug, not a token expiring now.
    if exp is not None and abs((exp - _now()).total_seconds()) < 60:
        exp = None
        detail += " · GitHub didn't report this token's expiry; set Expires on the vault entry"
    return ProbeResult(ok=True, mode="pat", expires_at=exp, detail=detail)


# --------------------------------------------------------------------------- Anthropic

async def probe_anthropic(ctx: ProbeContext) -> ProbeResult:
    key = ctx.env.get("ANTHROPIC_API_KEY")
    if not key:
        return _missing("ANTHROPIC_API_KEY not on the node")
    resp = await ctx.client.get("https://api.anthropic.com/v1/models", params={"limit": 1},
                                headers={"x-api-key": key, "anthropic-version": "2023-06-01"})
    if resp.status_code == 200:
        return ProbeResult(ok=True, detail="key accepted")
    if resp.status_code in (401, 403):
        return ProbeResult(ok=False, detail="Anthropic rejected the key — make a new one in the Console, "
                                            "put it in the vault, push")
    return _transient(resp, "Anthropic")


# --------------------------------------------------------------------------- Amazon

AMAZON_KEYS = ("AMAZON_ACCESS_KEY", "AMAZON_SECRET_KEY", "AMAZON_PARTNER_TAG")


async def probe_amazon(ctx: ProbeContext) -> ProbeResult:
    present = [k for k in AMAZON_KEYS if ctx.env.get(k)]
    if not present:
        return _missing("Amazon PA API not configured")
    if len(present) < len(AMAZON_KEYS):
        missing = sorted(set(AMAZON_KEYS) - set(present))
        return ProbeResult(ok=False, detail=f"incomplete: {', '.join(missing)} missing")
    # A real check needs a SigV4-signed PA API request; presence is all we claim.
    return ProbeResult(ok=True, verified=False, detail="all three keys present (not verified with Amazon)")


# --------------------------------------------------------------------------- IMAP mail

def probe_imap_for(account_id: str):
    """A probe bound to one IMAP account (backend/mail/accounts.py discovers them)."""
    async def probe(ctx: ProbeContext) -> ProbeResult:
        from backend.mail import accounts, imap
        acct = next((a for a in accounts.discover(ctx.env) if a.id == account_id), None)
        if acct is None or not acct.password:
            return _missing(f"MAIL_{account_id.upper()}_* not on the node — add it with "
                            "python -m tools.keeper add-imap, then push")
        try:
            await asyncio.to_thread(imap.check_login, acct)
        except imap.ImapError as e:
            return ProbeResult(ok=False if e.kind == "auth" else None, detail=e.detail)
        return ProbeResult(ok=True, detail=f"IMAP login ok ({acct.host})")
    return probe


# --------------------------------------------------------------------------- chigutiro

async def probe_chigutiro(ctx: ProbeContext) -> ProbeResult:
    from backend.mail import memory
    if not memory.configured(ctx.env):
        return _missing("CHIGUTIRO_TOKEN not on the node — python -m tools.keeper add-chigutiro, then push")
    try:
        await memory.health(ctx.client, ctx.env)
        r = await ctx.client.get(f"{memory.base_url(ctx.env)}/status",
                                 headers={"Authorization": f"Bearer {ctx.env['CHIGUTIRO_TOKEN']}"})
    except httpx.HTTPError as e:
        return ProbeResult(ok=None, detail=f"chigutiro not answering ({type(e).__name__})")
    if r.status_code == 401:
        return ProbeResult(ok=False, detail="chigutiro rejected the token — vault and service disagree")
    if r.status_code != 200:
        return _transient(r, "chigutiro")
    stats = r.json().get("stats", {})
    return ProbeResult(ok=True, detail=f"memory holds {stats.get('committed', 0)} records")
