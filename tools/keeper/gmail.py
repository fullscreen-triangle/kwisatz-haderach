"""
Reconnect Gmail in one command: `python -m tools.keeper reconnect-gmail`.

When the keeper reports Gmail as REJECTED (Google answered `invalid_grant`), the refresh
token on the node is dead and only a human consent brings it back. This does the whole
repair in one pass:

  1. opens the vault and takes the OAuth client from the "Gmail OAuth" entry — the same
     client the node refreshes with (a refresh token only works with the client that got it);
  2. runs Google's consent in the browser over a loopback redirect (PKCE + state);
  3. checks the new token against Gmail itself and names the account it reached;
  4. replaces gmail_token.json on the vault entry (the old one stays in the entry's history);
  5. pushes, and prints the keeper's live verdict from the server.

It also says WHY the token died. Google sends `refresh_token_expires_in` only for a
time-limited refresh token, which in practice means the consent screen is still in
"Testing": every token then dies after 7 days, and the dead-credentials message returns
weekly until the app is published. Nothing here prints a token or the client secret.
"""

from __future__ import annotations

import base64
import hashlib
import http.server
import json
import secrets
import threading
import time
import urllib.parse
import webbrowser
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Optional

AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile"
GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar"
SCOPES = (GMAIL_SCOPE, CALENDAR_SCOPE)    # what web/scripts/gmail_auth.js asks for

ENTRY_TITLE = "Gmail OAuth"
TOKEN_NAME = "gmail_token.json"           # attachment names; vault.FILE_TARGETS routes them
CLIENT_NAME = "credentials.json"


class GmailError(SystemExit):
    """A failure the person has to read; exits with the message, never a traceback."""


@dataclass
class Grant:
    token: dict                            # the token file, in web/lib/gmail.js's format
    scopes: set
    testing_until: Optional[datetime]      # when Google kills the refresh token, if it will


# --------------------------------------------------------------------------- pieces

def client_config(raw: bytes) -> dict:
    """The `installed` (desktop) or `web` block of a Google OAuth client JSON."""
    try:
        data = json.loads(raw)
    except ValueError:
        raise GmailError("the OAuth client file is not JSON — download it again from Google Cloud → Credentials")
    cfg = data.get("installed") or data.get("web")
    if not cfg or not cfg.get("client_id") or not cfg.get("client_secret"):
        raise GmailError("the OAuth client file has no client_id/client_secret")
    return {**cfg, "kind": "installed" if "installed" in data else "web"}


def pkce_pair() -> tuple:
    verifier = secrets.token_urlsafe(64)[:96]
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    return verifier, challenge


def auth_url(cfg: dict, redirect_uri: str, state: str, challenge: str, scopes=SCOPES) -> str:
    return AUTH_URL + "?" + urllib.parse.urlencode({
        "client_id": cfg["client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",       # ask for a refresh token…
        "prompt": "consent",            # …every time, or Google omits it on a repeat consent
        "include_granted_scopes": "true",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    })


def grant_from(body: dict, now: datetime) -> Grant:
    """Google's token response -> the token file the node's readers expect."""
    if not body.get("refresh_token"):
        raise GmailError("Google returned no refresh token. Remove the app's access at "
                         "https://myaccount.google.com/permissions and run this again.")
    token = {
        "access_token": body["access_token"],
        "refresh_token": body["refresh_token"],
        "scope": body.get("scope", ""),
        "token_type": body.get("token_type", "Bearer"),
        "expiry_date": int((now.timestamp() + int(body.get("expires_in", 3600))) * 1000),
    }
    if body.get("id_token"):
        token["id_token"] = body["id_token"]
    testing = (now + timedelta(seconds=int(body["refresh_token_expires_in"]))
               if "refresh_token_expires_in" in body else None)
    return Grant(token=token, scopes=set(token["scope"].split()), testing_until=testing)


def publish_url(cfg: dict) -> str:
    project = cfg.get("project_id")
    return (f"https://console.cloud.google.com/auth/audience?project={project}" if project
            else "https://console.cloud.google.com/auth/audience")


# --------------------------------------------------------------------------- consent

def _callback_server(holder: dict) -> http.server.HTTPServer:
    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):                                   # noqa: N802 (stdlib name)
            query = urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
            if "code" not in query and "error" not in query:
                self.send_response(404)                     # favicon and friends
                self.end_headers()
                return
            holder.update({k: v[0] for k, v in query.items()})
            ok = "code" in query
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            msg = ("Gmail is connected. You can close this tab; the terminal finishes the rest."
                   if ok else f"Google did not grant access ({query['error'][0]}). Close this tab.")
            self.wfile.write(f"<!doctype html><title>Agent Smith</title><p style='font:16px sans-serif'>{msg}".encode())

        def log_message(self, *args):                       # keep the terminal clean
            pass

    return http.server.HTTPServer(("127.0.0.1", 0), Handler)


def consent(cfg: dict, *, opener: Callable[[str], object] = webbrowser.open,
            timeout: float = 300, say: Callable[[str], None] = print) -> tuple:
    """Run the browser consent. Returns (code, redirect_uri, verifier)."""
    if cfg["kind"] == "web":
        say("  note: this is a 'web' OAuth client; Google accepts the loopback redirect only if "
            "http://127.0.0.1 is registered on it. A 'Desktop app' client needs nothing.")
    holder: dict = {}
    server = _callback_server(holder)
    redirect_uri = f"http://127.0.0.1:{server.server_address[1]}"
    state = secrets.token_urlsafe(24)
    verifier, challenge = pkce_pair()
    url = auth_url(cfg, redirect_uri, state, challenge)
    server.timeout = 0.5
    deadline = time.monotonic() + timeout

    def serve():
        while not holder and time.monotonic() < deadline:
            server.handle_request()

    thread = threading.Thread(target=serve, daemon=True)
    thread.start()
    say("  a browser tab opens at Google — sign in with the Gmail account the desk reads, and allow both boxes.")
    say(f"  if no tab opens, paste this into a browser:\n  {url}")
    opener(url)
    thread.join(timeout + 1)
    server.server_close()
    if not holder:
        raise GmailError(f"no answer from the browser within {int(timeout)} s — nothing was changed.")
    if holder.get("state") != state:
        raise GmailError("the browser answered with a different state — refusing it (possible replay). Nothing changed.")
    if "error" in holder:
        raise GmailError(f"Google did not grant access ({holder['error']}). Nothing was changed.")
    return holder["code"], redirect_uri, verifier


def exchange(client, cfg: dict, code: str, redirect_uri: str, verifier: str) -> dict:
    resp = client.post(TOKEN_URL, data={
        "code": code, "client_id": cfg["client_id"], "client_secret": cfg["client_secret"],
        "redirect_uri": redirect_uri, "grant_type": "authorization_code", "code_verifier": verifier,
    })
    if resp.status_code != 200:
        try:
            err = resp.json().get("error", "")
        except ValueError:
            err = ""
        raise GmailError(f"Google refused the code exchange (HTTP {resp.status_code} {err}). Nothing was changed.")
    return resp.json()


def mailbox(client, token: dict) -> str:
    """Ask Gmail itself which mailbox the new token opens — the real liveness test."""
    resp = client.get(PROFILE_URL, headers={"Authorization": f"Bearer {token['access_token']}"})
    if resp.status_code != 200:
        raise GmailError(f"the new token was refused by Gmail (HTTP {resp.status_code}). Nothing was changed.")
    return resp.json().get("emailAddress", "?")


# --------------------------------------------------------------------------- vault

def gmail_entry(kp):
    from tools.keeper import vault
    return vault.find_for(kp, "gmail") or vault.find_entry(kp, ENTRY_TITLE)


def client_from_vault(kp, fallback: Optional[Path]) -> tuple:
    """(client JSON bytes, where from). The vault's copy wins: the node refreshes with it."""
    e = gmail_entry(kp)
    if e is not None:
        for a in e.attachments:
            if a.filename == CLIENT_NAME:
                return a.data, f"the vault entry '{e.title}'"
    if fallback is not None and fallback.exists():
        return fallback.read_bytes(), str(fallback)
    raise GmailError("no OAuth client: attach credentials.json (Google Cloud → Credentials → your Desktop "
                     "client → Download JSON) to the vault entry 'Gmail OAuth', or pass --credentials FILE.")


def store(kp, grant: Grant, client_raw: bytes, replace_client: bool = False) -> tuple:
    """Put the new token on the Gmail entry. Returns (entry, created). The previous token
    stays in the entry's history; the binary is not deleted because history refers to it.
    `replace_client`: the OAuth client changed too (a new one was made on the desk)."""
    from tools.keeper import vault
    data = json.dumps(grant.token, indent=2).encode()
    e = gmail_entry(kp)
    if e is None:
        e = vault.add_entry(kp, ENTRY_TITLE, keeper_id="gmail", strategy="refresh", env_spec="",
                            fields={}, files={CLIENT_NAME: client_raw, TOKEN_NAME: data})
        created = True
    else:
        e.save_history()
        for a in list(e.attachments):
            if a.filename == TOKEN_NAME or (replace_client and a.filename == CLIENT_NAME):
                e.delete_attachment(a)
        e.add_attachment(kp.add_binary(data, compressed=True, protected=True), TOKEN_NAME)
        if not any(a.filename == CLIENT_NAME for a in e.attachments):
            e.add_attachment(kp.add_binary(client_raw, compressed=True, protected=True), CLIENT_NAME)
        vault.adopt(e, keeper_id="gmail", strategy="refresh", env_spec="")
        names = [a.filename for a in e.attachments]
        e.set_custom_property("Files", "; ".join(f"{n}={vault.FILE_TARGETS.get(n, n)}" for n in names))
        created = False
    # The vault's Expires is the end a human must act on; push sends it to the keeper.
    e.expires = grant.testing_until is not None
    if grant.testing_until is not None:
        e.expiry_time = grant.testing_until
    e.touch(modify=True)
    return e, created


# --------------------------------------------------------------------------- command

def reconnect(a, push_items) -> None:
    import httpx
    from tools.keeper import vault

    print("Reconnect Gmail — the token goes into your vault and to the server; nothing is printed.\n")
    print("1/4  Opening your vault")
    kp = vault.open_vault(Path(a.vault), keyfile=a.keyfile)
    fallback = Path(a.credentials) if a.credentials else Path(__file__).resolve().parents[2] / "web" / "credentials.json"
    client_raw, source = client_from_vault(kp, fallback)
    cfg = client_config(client_raw)
    print(f"     OAuth client from {source}")

    print("2/4  Asking Google for a new token")
    opener = (lambda url: None) if a.no_browser else webbrowser.open
    code, redirect_uri, verifier = consent(cfg, opener=opener, timeout=a.timeout)
    with httpx.Client(timeout=30) as client:
        grant = grant_from(exchange(client, cfg, code, redirect_uri, verifier), datetime.now(timezone.utc))
        address = mailbox(client, grant.token)
    print(f"     Gmail accepted it: the token opens {address}")
    if CALENDAR_SCOPE not in grant.scopes:
        print("     note: the Calendar box was left unticked — the planner stays without your calendars.")

    print("3/4  Storing it in the vault")
    entry, created = store(kp, grant, client_raw)
    kp.save()
    print(f"     {'created' if created else 'updated'} '{entry.title}'"
          + ("" if created else " (the previous token is in the entry's history)"))

    if a.no_push:
        print("4/4  Not pushed (--no-push). Send it with: python -m tools.keeper push")
    else:
        print("4/4  Sending it to the server")
        push_items(vault.read_items(kp), a.host)

    if grant.testing_until is not None:
        days = max(0, (grant.testing_until - datetime.now(timezone.utc)).days)
        print(f"""
WHY IT KEEPS DYING: your Google OAuth consent screen is in "Testing". Google kills every
refresh token it issues after 7 days, so this one dies on {grant.testing_until:%a %d %b %H:%M} UTC
(in {days} days) and the dead-credentials message comes back. To end that for good:

  1. open {publish_url(cfg)}
  2. under "Publishing status" press "Publish app" and confirm
  3. run this command once more (a token issued in Testing keeps its 7-day limit)

Publishing does not make your mail public: only accounts that consent can grant access.
Google will show "Google hasn't verified this app" at the next consent; for your own
account choose "Advanced" → "Go to … (unsafe)" — verification is only needed for
other people's accounts.""")
    else:
        print("\nThe refresh token has no end date: Google will not expire it (it lapses only if unused "
              "for six months, which the keeper's 30-minute refresh prevents, or if you revoke it).")
