"""
Mail -> chigutiro (semantics/purpose/chigutiro), the personal memory service on
127.0.0.1:8740. The split follows chigutiro's own Gmail adapter (bridge-ts adapters.ts):

  * one `prose` record per message — `subject` is the correspondent's address, so
    `erase {subject}` later removes that person completely; mail Kundai wrote is
    `authored_by_owner` (the only prose that may reach model weights, after redaction);
  * one `contact` per person the extraction names (id = their address);
  * one `event` per extracted event.

Bulk mail and triaged spam are not sent: they would only dilute the text receiver.
Records carry ids, so re-sending is a no-op duplicate on chigutiro's side.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Mapping, Optional, Tuple

import httpx

from backend.mail.parse import Message


def configured(env: Mapping[str, str]) -> bool:
    return bool(env.get("CHIGUTIRO_TOKEN"))


def base_url(env: Mapping[str, str]) -> str:
    return (env.get("CHIGUTIRO_URL") or "http://127.0.0.1:8740").rstrip("/")


def records_for(m: Message, ex: Optional[dict], triage: str = "") -> List[dict]:
    if (m.bulk and not m.owner) or triage in ("newsletter", "predatory"):
        return []
    ex = ex or {}
    source = f"mail-{m.account}"
    ts = m.date.isoformat()
    tags = [m.account, m.folder.lower()] + ([ex["category"]] if ex.get("category") else [])
    prose = {"kind": "prose", "id": m.key, "source": source, "ts": ts, "title": m.subject,
             "text": m.text or m.subject or "(empty)", "authored_by_owner": m.owner, "tags": tags}
    if not m.owner and m.from_addr:
        prose["subject"] = m.from_addr
    recs = [prose]

    people = {}
    if not m.owner and m.from_addr:
        people[m.from_addr] = {"name": m.from_name}
    for p in ex.get("people") or []:
        email = (p.get("email") or "").strip().lower()
        if email and "@" in email:
            people[email] = {**people.get(email, {}), **{k: v for k, v in p.items() if v}}
    for email, p in people.items():
        rec = {"kind": "contact", "id": email, "source": "mail-contacts", "ts": ts,
               "person": p.get("name") or email, "subject": email}
        if p.get("org"):
            rec["org"] = p["org"]
        if p.get("role"):
            rec["role"] = p["role"]
        recs.append(rec)

    for i, ev in enumerate(ex.get("events") or []):
        rec = {"kind": "event", "id": f"{m.key}:e{i}", "source": source, "ts": ev["start"],
               "title": ev.get("title") or m.subject, "notes": ex.get("summary", "")}
        if ev.get("end") and datetime.fromisoformat(ev["end"]) >= datetime.fromisoformat(ev["start"]):
            rec["end"] = ev["end"]
        if ev.get("location"):
            rec["place"] = ev["location"]
        if not m.owner and m.from_addr:
            rec["subject"] = m.from_addr
        recs.append(rec)
    return recs


async def ingest(client: httpx.AsyncClient, env: Mapping[str, str], records: List[dict]) -> Tuple[int, int]:
    """-> (accepted + duplicates, rejected). Raises httpx.HTTPError when chigutiro is down."""
    if not records:
        return 0, 0
    r = await client.post(f"{base_url(env)}/ingest", json={"records": records},
                          headers={"Authorization": f"Bearer {env['CHIGUTIRO_TOKEN']}"}, timeout=60)
    r.raise_for_status()
    body = r.json()
    return body.get("accepted", 0) + body.get("duplicates", 0), len(body.get("rejected", []))


async def health(client: httpx.AsyncClient, env: Mapping[str, str]) -> dict:
    r = await client.get(f"{base_url(env)}/health", timeout=10)
    r.raise_for_status()
    return r.json()


async def ask(client: httpx.AsyncClient, env: Mapping[str, str], query: str, budget: int = 8) -> dict:
    r = await client.post(f"{base_url(env)}/ask", json={"query": query, "budget": budget},
                          headers={"Authorization": f"Bearer {env['CHIGUTIRO_TOKEN']}"}, timeout=120)
    r.raise_for_status()
    return r.json()
