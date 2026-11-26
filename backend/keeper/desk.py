"""
Renewing a credential from the desk — from the phone or any browser — instead of the laptop.

A value renewed here is checked with its provider first (the same probe the keeper runs; a
value the provider does not accept is never stored), then kept in <state>/desk-keys/, which
`keeper push` never writes into:

  desk-keys/env             NAME='value' lines (0600): read by the web service at start, and
                            applied to this process's environment by `reconcile`
  desk-keys/overrides.json  value-free: per name, the fingerprint of the desk value and of the
                            pushed value it replaced
  desk-keys/log.jsonl       value-free record of every renewal
  desk-keys/gmail-*.json    a Gmail OAuth client / token obtained here

`reconcile` runs when the backend starts, after a push has rewritten the pushed env: a desk
value stays while the pushed value is still the one it replaced (the vault is older); it is
dropped once the vault holds the same value (`keeper pull` brought it over) or a different
one (the vault was renewed since — it wins).

Forges: `mint` makes a new Gitea token from your password (typed once, kept nowhere);
`rotate` renews a GitLab token with itself, and the keeper does that by itself once the token
turns amber (service.py `_renew_due`), so it never runs out while it still works.

Gmail: the client comes as its downloaded JSON or as the client ID and secret typed in
(`google_client_fields`). `google_start` gives a sign-in link for the OAuth client; with a web client whose
redirect URI is this desk's callback, Google returns here by itself; with a desktop client
Google sends the browser to 127.0.0.1, and the address it lands on is pasted into the desk.
"""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import time
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Mapping, MutableMapping, Optional

import httpx

from backend.keeper.service import state_dir

SETTINGS = {"HOME_CITY": "Home city", "HOME_LATITUDE": "Home latitude", "HOME_LONGITUDE": "Home longitude"}
FLOW_TTL = 15 * 60
# A token the desk mints on Gitea may read and push your repositories and read who you are.
GITEA_SCOPES = ["write:repository", "read:user", "read:organization"]
ROTATE_DAYS = 360                # GitLab caps a token at 365 days


def fp(value: str) -> str:
    return hashlib.sha256((value or "").encode("utf-8")).hexdigest()[:16]


def quote(v: str) -> str:
    """One systemd EnvironmentFile value. Single quotes keep everything literal; a value that
    holds one is double-quoted with \\ " $ ` escaped (tools/keeper/render.py uses the same rules)."""
    if "'" not in v:
        return f"'{v}'"
    esc = v.replace("\\", "\\\\").replace('"', '\\"').replace("$", "\\$").replace("`", "\\`")
    return f'"{esc}"'


def unquote(raw: str) -> str:
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] == "'":
        return raw[1:-1]
    if len(raw) >= 2 and raw[0] == raw[-1] == '"':
        out, i, body = [], 0, raw[1:-1]
        while i < len(body):
            if body[i] == "\\" and i + 1 < len(body):
                out.append(body[i + 1])
                i += 2
            else:
                out.append(body[i])
                i += 1
        return "".join(out)
    return raw


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class DeskKeys:
    def __init__(self, directory: Optional[Path] = None, env: Optional[MutableMapping[str, str]] = None):
        self._dir = directory
        self.env = env if env is not None else os.environ

    @property
    def dir(self) -> Path:
        d = self._dir or state_dir() / "desk-keys"
        d.mkdir(parents=True, exist_ok=True)
        try:
            d.chmod(0o700)
        except OSError:
            pass
        return d

    # ------------------------------------------------------------- the store

    def values(self) -> Dict[str, str]:
        out = {}
        try:
            for line in (self.dir / "env").read_text(encoding="utf-8").splitlines():
                name, sep, raw = line.partition("=")
                if sep and name.strip() and not name.startswith("#"):
                    out[name.strip()] = unquote(raw)
        except OSError:
            pass
        return out

    def meta(self) -> Dict[str, dict]:
        try:
            return json.loads((self.dir / "overrides.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return {}

    def _write(self, values: Dict[str, str], meta: Dict[str, dict]) -> None:
        lines = ["# renewed on the desk (backend/keeper/desk.py); keeper pull brings these into the vault"]
        lines += [f"{k}={quote(v)}" for k, v in sorted(values.items())]
        for name, text in (("env", "\n".join(lines) + "\n"), ("overrides.json", json.dumps(meta, indent=1))):
            tmp = self.dir / f".{name}.tmp"
            tmp.write_text(text, encoding="utf-8")
            try:
                tmp.chmod(0o600)
            except OSError:
                pass
            tmp.replace(self.dir / name)

    def _log(self, **rec) -> None:
        with open(self.dir / "log.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps({"at": _now(), **rec}) + "\n")

    def put(self, values: Dict[str, str], by: str) -> None:
        """Keep `values` (already checked) and apply them to this process now."""
        stored, meta = self.values(), self.meta()
        for name, v in values.items():
            replaced = meta.get(name, {}).get("replaced", fp(self.env.get(name, "")))   # the PUSHED value's print
            stored[name] = v
            meta[name] = {"fp": fp(v), "replaced": replaced, "at": _now(), "by": by}
            self.env[name] = v
        self._write(stored, meta)
        self._log(by=by, names=sorted(values), fps=[fp(v) for _, v in sorted(values.items())])

    def drop(self, names: List[str], why: str) -> None:
        stored, meta = self.values(), self.meta()
        for n in names:
            stored.pop(n, None)
            meta.pop(n, None)
        self._write(stored, meta)
        self._log(dropped=sorted(names), why=why)

    def reconcile(self) -> Dict[str, str]:
        """At start: apply desk values the vault has not caught up with; drop the others."""
        stored, meta, outcome, stale = self.values(), self.meta(), {}, []
        for name, v in stored.items():
            m = meta.get(name, {})
            pushed = fp(self.env.get(name, ""))
            if pushed == m.get("fp"):
                outcome[name], _ = "the vault has it now", stale.append(name)
            elif pushed == m.get("replaced"):
                self.env[name] = v
                outcome[name] = "applied"
            else:
                outcome[name], _ = "the vault holds a newer value", stale.append(name)
        if stale:
            self.drop(stale, "reconciled at start")
        return outcome

    def status(self) -> dict:
        meta = self.meta()
        return {"renewed_here": [{"name": n, "at": m.get("at"), "by": m.get("by")} for n, m in sorted(meta.items())],
                "settings": {k: {"label": lbl, "value": self.env.get(k, "")} for k, lbl in SETTINGS.items()}}

    # ------------------------------------------------------------- checking a value

    @staticmethod
    def fields(cred_id: str) -> List[dict]:
        """The values a credential is renewed with on the desk ([] = not renewable here)."""
        from backend.keeper import apikeys
        if cred_id in apikeys.BY_ID:
            return [{"name": apikeys.BY_ID[cred_id].env[0], "label": "New key", "secret": True}]
        if cred_id.startswith("forge-"):
            return [{"name": f"FORGE_{cred_id[6:].upper()}_TOKEN", "label": "New access token", "secret": True}]
        if cred_id.startswith("mail-"):
            return [{"name": f"MAIL_{cred_id[5:].upper()}_PASSWORD", "label": "Password (or app password)", "secret": True}]
        if cred_id == "amazon":
            return [{"name": "AMAZON_ACCESS_KEY", "label": "Access key", "secret": True},
                    {"name": "AMAZON_SECRET_KEY", "label": "Secret key", "secret": True},
                    {"name": "AMAZON_PARTNER_TAG", "label": "Partner tag", "secret": False}]
        return []

    async def renew(self, cred_id: str, values: Mapping[str, str]) -> dict:
        """Check `values` with the credential's own probe in a copy of the environment; keep and
        apply them only when the provider accepts them. Returns the probe's verdict."""
        from backend.keeper import apikeys, probes
        from backend.keeper.service import KEEPER
        want = {f["name"] for f in self.fields(cred_id)}
        if not want:
            raise ValueError("this credential is not renewed on the desk")
        values = {k: str(v).strip() for k, v in values.items() if k in want and str(v).strip()}
        if set(values) != want:
            raise ValueError("fill in every field")
        row = KEEPER.rows.get(cred_id)
        if row is None:
            raise KeyError(cred_id)
        cred = row.cred
        trial = {**dict(self.env), **values}
        async with httpx.AsyncClient(timeout=30) as client:
            res = await cred.probe(probes.ProbeContext(client=client, env=trial, state_dir=KEEPER.dir))
        if res.ok is not True:
            return {"ok": False, "detail": res.detail if res.ok is None else
                    f"the provider did not accept it ({res.detail.split(' — ')[0]}); nothing was stored"}
        stored = dict(values)
        if cred_id in apikeys.BY_ID:                                 # every name the key goes by
            names = apikeys.BY_ID[cred_id].env
            for alias in names[1:]:
                stored[alias] = values[names[0]]
        self.put(stored, by=cred_id)
        KEEPER.check_now()
        return {"ok": True, "detail": res.detail}

    def set_setting(self, name: str, value: str) -> dict:
        if name not in SETTINGS:
            raise ValueError("not a desk setting")
        v = value.strip()
        if not v or len(v) > 80:
            raise ValueError("give a value")
        if name != "HOME_CITY":
            float(v)
        self.put({name: v}, by="settings")
        return self.status()

    # ------------------------------------------------------------- forge tokens the desk makes

    def _forge(self, cred_id: str, kind: str):
        from backend import forges
        a = next((x for x in forges.discover(self.env) if f"forge-{x.id}" == cred_id), None)
        if a is None or a.kind != kind:
            raise ValueError(f"{cred_id} is not a {kind} account on the node")
        return a

    def actions(self, cred_id: str) -> Dict[str, dict]:
        """What the desk can do for a credential beyond taking a pasted value:
        mint   a Gitea token made from your forge password (typed once, never kept)
        rotate a GitLab token renewed with itself, while it still works"""
        from backend import forges
        a = next((x for x in forges.discover(self.env) if f"forge-{x.id}" == cred_id), None)
        if a is None:
            return {}
        if a.kind == "gitea":
            return {"mint": {"user": a.user, "host": a.host}}
        if a.kind == "gitlab":
            return {"rotate": {"host": a.host}}
        return {}

    async def mint(self, cred_id: str, password: str, otp: str = "", user: str = "") -> dict:
        """Gitea: ask the forge for a new access token with your user name and password. The
        password is used for this one request and kept nowhere; the token is checked like any
        renewed value before it is kept."""
        a = self._forge(cred_id, "gitea")
        login = (user or a.user).strip()
        if not login:
            raise ValueError("give your user name on the forge")
        if not password:
            raise ValueError("give your password on the forge")
        name = f"agent-smith-desk-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}"
        headers = {"X-Gitea-OTP": otp.strip()} if otp.strip() else {}
        url = f"{a.api}/users/{urllib.parse.quote(login)}/tokens"
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(url, auth=(login, password), headers=headers,
                                  json={"name": name, "scopes": GITEA_SCOPES})
            if r.status_code in (400, 422) and "scope" in r.text.lower():      # a Gitea older than 1.19
                r = await client.post(url, auth=(login, password), headers=headers, json={"name": name})
        if r.status_code == 401:
            return {"ok": False, "detail": f"{a.host} did not accept that user name and password"
                    + ("" if otp else " (with two-factor sign-in, add the current code)") + "; nothing was stored"}
        if r.status_code == 403:
            return {"ok": False, "detail": f"{a.host} does not let a password make tokens (single sign-on?): "
                    "make one in its settings — the link above — and paste it below"}
        if r.status_code not in (200, 201) or not (r.json() if r.content else {}).get("sha1"):
            return {"ok": False, "detail": f"{a.host} answered {r.status_code}; nothing was stored"}
        token_name = f"FORGE_{a.id.upper()}_TOKEN"
        out = await self.renew(cred_id, {token_name: r.json()["sha1"]})
        if out.get("ok") and login != a.user:
            self.put({f"FORGE_{a.id.upper()}_USER": login}, by=f"{cred_id}-mint")
        if out.get("ok"):
            out["detail"] = f"{a.host} made a new token ({name}) and it works"
        return out

    async def rotate(self, cred_id: str) -> dict:
        """GitLab: renew the token with itself (POST /personal_access_tokens/self/rotate). GitLab
        revokes the old token the moment it answers, so the new one is kept straight away."""
        from backend.keeper.service import KEEPER
        a = self._forge(cred_id, "gitlab")
        until = (datetime.now(timezone.utc) + timedelta(days=ROTATE_DAYS)).date().isoformat()
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"{a.api}/personal_access_tokens/self/rotate", headers=a.headers,
                                  json={"expires_at": until})
            if r.status_code == 400 and "expires" in r.text.lower():         # beyond the instance's cap
                r = await client.post(f"{a.api}/personal_access_tokens/self/rotate", headers=a.headers)
        if r.status_code in (401, 403):
            return {"ok": False, "detail": f"{a.host} no longer accepts the current token, so it cannot renew "
                    "itself: open the form (filled in for you), make a token and paste it below"}
        body = r.json() if r.content else {}
        if r.status_code != 200 or not body.get("token"):
            return {"ok": False, "detail": f"{a.host} answered {r.status_code}; the token was not rotated"}
        self.put({f"FORGE_{a.id.upper()}_TOKEN": body["token"]}, by=f"{cred_id}-rotate")
        KEEPER.check_now()
        return {"ok": True, "detail": f"rotated; the new token runs until {body.get('expires_at') or until}"}

    # ------------------------------------------------------------- Gmail

    def google_client_fields(self, client_id: str, client_secret: str, kind: str = "web") -> dict:
        """The same as uploading the client JSON, from the two values Google shows on the
        client's page — easier to copy on a phone than a downloaded file."""
        client_id, client_secret = client_id.strip(), client_secret.strip()
        if not client_id.endswith(".apps.googleusercontent.com") or not client_secret:
            raise ValueError("give the client ID (…apps.googleusercontent.com) and its secret")
        block = {"client_id": client_id, "client_secret": client_secret,
                 "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": "https://oauth2.googleapis.com/token",
                 "redirect_uris": [self.callback_url()] if kind == "web" else ["http://localhost"]}
        return self.google_client(json.dumps({"web" if kind == "web" else "installed": block}))

    def _flows(self) -> Dict[str, dict]:
        """Gmail sign-ins under way, by state — on disk, so a restart between start and finish
        (a renewal restarts the services) does not lose one."""
        try:
            flows = json.loads((self.dir / "flows.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            flows = {}
        now = time.time()
        return {k: f for k, f in flows.items() if now - f.get("at", 0) < FLOW_TTL}

    def _save_flows(self, flows: Dict[str, dict]) -> None:
        tmp = self.dir / ".flows.json.tmp"
        tmp.write_text(json.dumps(flows), encoding="utf-8")
        try:
            tmp.chmod(0o600)
        except OSError:
            pass
        tmp.replace(self.dir / "flows.json")

    def _client_raw(self) -> Optional[bytes]:
        p = self.env.get("GMAIL_CREDENTIALS_PATH")
        try:
            return Path(p).read_bytes() if p else None
        except OSError:
            return None

    def google_client(self, text: str) -> dict:
        """Keep a new OAuth client (the JSON downloaded from Google Cloud)."""
        from tools.keeper import gmail
        raw = text.strip().encode("utf-8")
        try:
            cfg = gmail.client_config(raw)
        except SystemExit as e:
            raise ValueError(str(e))
        p = self.dir / "gmail-credentials.json"
        p.write_bytes(raw)
        try:
            p.chmod(0o600)
        except OSError:
            pass
        self.put({"GMAIL_CREDENTIALS_PATH": str(p)}, by="gmail-client")
        return {"kind": cfg["kind"], "project": cfg.get("project_id", ""),
                "redirect_ok": self.callback_url() in cfg.get("redirect_uris", [])}

    def callback_url(self) -> str:
        base = (self.env.get("AGENT_SMITH_URL") or "https://server-2.tail48bcc9.ts.net").rstrip("/")
        return f"{base}/api/desk/keeper/google/callback"

    def google_start(self) -> dict:
        from tools.keeper import gmail
        raw = self._client_raw()
        if not raw:
            raise ValueError("no OAuth client on the node yet: upload the client JSON first")
        try:
            cfg = gmail.client_config(raw)
        except SystemExit as e:
            raise ValueError(str(e))
        web = cfg["kind"] == "web" and self.callback_url() in cfg.get("redirect_uris", [])
        redirect = self.callback_url() if web else "http://127.0.0.1:8765"
        verifier, challenge = gmail.pkce_pair()
        state = secrets.token_urlsafe(24)
        flows = self._flows()
        flows[state] = {"verifier": verifier, "redirect": redirect, "at": time.time()}
        self._save_flows(flows)
        return {"url": gmail.auth_url(cfg, redirect, state, challenge), "mode": "redirect" if web else "paste",
                "redirect_uri": redirect}

    async def google_finish(self, *, code: str = "", state: str = "", pasted: str = "") -> dict:
        """Finish a sign-in from the callback (code+state) or from the pasted 127.0.0.1 address."""
        from tools.keeper import gmail
        if pasted:
            q = urllib.parse.parse_qs(urllib.parse.urlsplit(pasted.strip()).query)
            if q.get("error"):
                raise ValueError(f"Google answered: {q['error'][0]}")
            code, state = (q.get("code") or [""])[0], (q.get("state") or [""])[0]
        flows = self._flows()
        flow = flows.pop(state, None)
        self._save_flows(flows)
        if not code or flow is None or time.time() - flow["at"] > FLOW_TTL:
            raise ValueError("this sign-in is unknown or older than 15 minutes; start it again")
        cfg = gmail.client_config(self._client_raw() or b"")

        def run() -> dict:
            with httpx.Client(timeout=30) as client:
                body = gmail.exchange(client, cfg, code, flow["redirect"], flow["verifier"])
                grant = gmail.grant_from(body, datetime.now(timezone.utc))
                box = gmail.mailbox(client, grant.token)
            return {"token": grant.token, "box": box, "testing_until": grant.testing_until, "scopes": grant.scopes}
        import asyncio
        try:
            got = await asyncio.to_thread(run)
        except SystemExit as e:
            raise ValueError(str(e))
        p = self.dir / "gmail-token.json"
        p.write_text(json.dumps(got["token"]), encoding="utf-8")
        try:
            p.chmod(0o600)
        except OSError:
            pass
        self.put({"GMAIL_TOKEN_PATH": str(p)}, by="gmail")
        from backend.keeper.service import KEEPER
        KEEPER.check_now()
        out = {"ok": True, "mailbox": got["box"], "calendar": gmail.CALENDAR_SCOPE in got["scopes"]}
        if got["testing_until"]:
            out["testing_until"] = got["testing_until"].date().isoformat()
            out["publish_url"] = gmail.publish_url(cfg)
        return out


DESK = DeskKeys()
