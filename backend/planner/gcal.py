"""
Google Calendar, read-only, with the node's shared OAuth token (needs the `calendar`
scope — web/scripts/gmail_auth.js asks for it). Dormant unless that scope is granted.

  busy()  reads his calendars so the planner never schedules over an appointment made
          elsewhere. All-day, cancelled, "free" and declined events don't block time.

Nothing is written to Google: the timeline lives in the PWA (/desk/brief), which is the
only place the plan is shown.
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import List, Mapping, Optional

import httpx

from backend import google_oauth
from backend.planner.model import Block

API = "https://www.googleapis.com/calendar/v3"


def enabled(env: Mapping[str, str]) -> bool:
    return google_oauth.configured(env) and google_oauth.CALENDAR_SCOPE in google_oauth.granted_scopes(env)


async def _headers(client, env) -> dict:
    return {"Authorization": f"Bearer {await google_oauth.access_token(client, env)}"}


def _dt(ev_time: dict) -> Optional[datetime]:
    if "dateTime" not in ev_time:
        return None                                   # all-day
    return datetime.fromisoformat(ev_time["dateTime"].replace("Z", "+00:00"))


async def busy(client: httpx.AsyncClient, env, start: datetime, end: datetime,
               own_calendar: Optional[str]) -> List[Block]:
    h = await _headers(client, env)
    r = await client.get(f"{API}/users/me/calendarList", headers=h, params={"minAccessRole": "reader"})
    r.raise_for_status()
    cals = [c for c in r.json().get("items", [])
            if c.get("selected") and c["id"] != own_calendar and c.get("summary") != CALENDAR_NAME]
    out: List[Block] = []
    for cal in cals:
        page = None
        while True:
            params = {"timeMin": start.isoformat(), "timeMax": end.isoformat(), "singleEvents": "true",
                      "orderBy": "startTime", "maxResults": 250, **({"pageToken": page} if page else {})}
            r = await client.get(f"{API}/calendars/{cal['id']}/events", headers=h, params=params)
            if r.status_code in (403, 404):
                break
            r.raise_for_status()
            body = r.json()
            for ev in body.get("items", []):
                s, e = _dt(ev.get("start", {})), _dt(ev.get("end", {}))
                if not s or not e or ev.get("status") == "cancelled" or ev.get("transparency") == "transparent":
                    continue
                me = next((a for a in ev.get("attendees", []) if a.get("self")), None)
                if me and me.get("responseStatus") == "declined":
                    continue
                out.append(Block(
                    id="gcal-" + hashlib.sha1(f"{cal['id']}|{ev['id']}".encode()).hexdigest()[:12],
                    start=s, end=e, kind="fixed", title=ev.get("summary") or "(busy)",
                    source={"type": "gcal", "ref": ev["id"], "calendar": cal.get("summary", "")},
                    tentative=bool(me and me.get("responseStatus") in ("tentative", "needsAction"))))
            page = body.get("nextPageToken")
            if not page:
                break
    return out
