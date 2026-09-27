"""
Gmail reader over the REST API with the node's shared OAuth token (backend/google_oauth).
Messages are fetched as format=raw so they go through the same parser as IMAP mail.

Incremental by "have we stored this id": each pass lists the last `window_days` of inbox
and sent mail and fetches only ids the store hasn't seen. Gmail's history API would be
cheaper per pass, but a bounded list is simple, self-healing, and cheap at one pass a
minute (a list call is 5 quota units).
"""

from __future__ import annotations

import base64
from typing import Callable, List, Tuple

import httpx

from backend import google_oauth
from backend.mail import attachments
from backend.mail.parse import Message, parse_bytes

API = "https://gmail.googleapis.com/gmail/v1/users/me"


async def own_address(client: httpx.AsyncClient, env) -> str:
    token = await google_oauth.access_token(client, env)
    r = await client.get(f"{API}/profile", headers={"Authorization": f"Bearer {token}"})
    r.raise_for_status()
    return r.json().get("emailAddress", "").lower()


async def fetch_new(client: httpx.AsyncClient, env, *, window_days: int,
                    seen: Callable[[str], bool], owner_addrs) -> List[Message]:
    """Raises google_oauth.GoogleAuthError or httpx.HTTPError."""
    token = await google_oauth.access_token(client, env)
    headers = {"Authorization": f"Bearer {token}"}
    out: List[Message] = []
    for folder, query in (("INBOX", f"in:inbox newer_than:{window_days}d"),
                          ("Sent", f"in:sent newer_than:{window_days}d")):
        ids: List[str] = []
        page = None
        while True:
            params = {"q": query, "maxResults": 100, **({"pageToken": page} if page else {})}
            r = await client.get(f"{API}/messages", params=params, headers=headers)
            r.raise_for_status()
            body = r.json()
            ids += [m["id"] for m in body.get("messages", [])]
            page = body.get("nextPageToken")
            if not page or len(ids) >= 500:
                break
        for mid in ids:
            uid = f"{folder}/{mid}"
            if seen(uid):
                continue
            r = await client.get(f"{API}/messages/{mid}", params={"format": "raw"}, headers=headers)
            if r.status_code == 404:
                continue          # deleted between list and get
            r.raise_for_status()
            raw = base64.urlsafe_b64decode(r.json()["raw"] + "===")
            m = parse_bytes(raw, account="gmail", folder=folder, uid=uid, owner_addrs=owner_addrs)
            attachments.save(m.key, raw)
            out.append(m)
    return out
