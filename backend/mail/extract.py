"""
One message -> structured facts, in two steps.

1. Triage (no model, instant). Newsletters (List-Unsubscribe / Precedence: bulk) and
   predatory journal mail (tools/journal_manager/classifier.py, the rules the inbox
   already used) get a one-line summary and never reach the model — on a CPU box the
   model is the scarce resource, and most bulk mail carries nothing to schedule.
2. Extraction. Ollama /api/chat with a JSON-schema `format` (constrained decoding, so
   the reply is always parseable), temperature 0, then pydantic validation. Dates the
   model leaves without a zone are read as Europe/Berlin. One retry on invalid output.

Optional MAIL_EXTRACT_PROVIDER=anthropic uses the Anthropic API instead (only when a key
is live). The prompt is the same; only the transport differs.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import List, Literal, Mapping, Optional, Tuple
from zoneinfo import ZoneInfo

import httpx
from pydantic import BaseModel, Field, ValidationError, field_validator

from backend.mail.parse import Message

TZ = ZoneInfo("Europe/Berlin")
DEFAULT_MODEL = "qwen2.5:7b-instruct-q4_K_M"
CATEGORIES = ("work", "research", "admin", "job", "finance", "travel", "personal",
              "journal", "newsletter", "notification", "spam")


def _when(v):
    """'' / None -> None; naive datetimes -> Europe/Berlin."""
    if v in (None, "", "null", "none"):
        return None
    if isinstance(v, str):
        try:
            v = datetime.fromisoformat(v.strip().replace("Z", "+00:00"))
        except ValueError:
            return None
    if isinstance(v, datetime) and v.tzinfo is None:
        v = v.replace(tzinfo=TZ)
    return v


class ActionItem(BaseModel):
    title: str
    due: Optional[datetime] = None
    due_weekday: str = ""              # the weekday word the email used; see sanity()
    estimated_minutes: int = Field(30, ge=5, le=480)
    priority: Literal["high", "normal", "low"] = "normal"

    @field_validator("due", mode="before")
    @classmethod
    def due_tz(cls, v):
        return _when(v)

    @field_validator("estimated_minutes", mode="before")
    @classmethod
    def clamp_minutes(cls, v):
        try:
            return max(5, min(480, int(v)))
        except (TypeError, ValueError):
            return 30


class Event(BaseModel):
    title: str
    start: datetime
    start_weekday: str = ""
    end: Optional[datetime] = None
    location: str = ""
    confirmed: bool = False

    @field_validator("start", "end", mode="before")
    @classmethod
    def times_tz(cls, v):
        return _when(v)


class Person(BaseModel):
    name: str = ""
    email: str = ""
    role: str = ""
    org: str = ""


class Extraction(BaseModel):
    summary: str
    category: str = "personal"
    needs_reply: bool = False
    reply_by: Optional[datetime] = None
    action_items: List[ActionItem] = []
    events: List[Event] = []
    people: List[Person] = []
    key_facts: List[str] = []

    @field_validator("reply_by", mode="before")
    @classmethod
    def reply_tz(cls, v):
        return _when(v)

    @field_validator("category", mode="before")
    @classmethod
    def known_category(cls, v):
        v = str(v or "").lower().strip()
        return v if v in CATEGORIES else "personal"

    @field_validator("events", mode="before")
    @classmethod
    def drop_undated(cls, v):
        return [e for e in (v or []) if isinstance(e, dict) and _when(e.get("start"))]


_STR = {"type": "string"}
SCHEMA = {
    "type": "object",
    "properties": {
        "summary": _STR,
        "category": {"type": "string", "enum": list(CATEGORIES)},
        "needs_reply": {"type": "boolean"},
        "reply_by": {**_STR, "description": "ISO 8601 or empty"},
        "action_items": {"type": "array", "items": {"type": "object", "properties": {
            "title": _STR, "due": {**_STR, "description": "ISO 8601 or empty"},
            "due_weekday": {**_STR, "description": "the weekday word the email uses for this deadline, e.g. Mittwoch, else empty"},
            "estimated_minutes": {"type": "integer"},
            "priority": {"type": "string", "enum": ["high", "normal", "low"]}},
            "required": ["title", "due", "due_weekday", "estimated_minutes", "priority"]}},
        "events": {"type": "array", "items": {"type": "object", "properties": {
            "title": _STR, "start": _STR,
            "start_weekday": {**_STR, "description": "the weekday word the email uses for this event, e.g. Donnerstag, else empty"},
            "end": _STR, "location": _STR, "confirmed": {"type": "boolean"}},
            "required": ["title", "start", "start_weekday", "end", "location", "confirmed"]}},
        "people": {"type": "array", "items": {"type": "object", "properties": {
            "name": _STR, "email": _STR, "role": _STR, "org": _STR},
            "required": ["name", "email", "role", "org"]}},
        "key_facts": {"type": "array", "items": _STR},
    },
    "required": ["summary", "category", "needs_reply", "reply_by", "action_items", "events",
                 "people", "key_facts"],
}


def system_prompt(now: datetime) -> str:
    local = now.astimezone(TZ)
    return (
        "You read one email for Kundai Sachikonye and extract what he needs for his planner. "
        f"Now is {local:%A %d %B %Y, %H:%M} (Europe/Berlin). He works at Universität Greifswald "
        "(NFDI4Cat), researches mathematical and computational frameworks, and is applying for jobs.\n"
        "Rules:\n"
        "- summary: one or two plain sentences, what the email is and what (if anything) it asks of him.\n"
        "- action_items: only things HE must do, each with a realistic estimated_minutes; due = the "
        "deadline if one is stated or clearly implied, else empty. For an email he sent, include "
        "promises he made (\"I will send it by Friday\") — but what he asks OTHERS to do (\"please "
        "review the attached\") is their task, not his: leave it out.\n"
        "- events: meetings, appointments, calls, deadlines-as-events with a date. Resolve every "
        "relative date (\"kommenden Donnerstag\", \"next Thursday 15:00\", \"bis Mittwoch\") by "
        "LOOKING IT UP in the date table at the end of the message — never by arithmetic. A weekday "
        "name means the first such day after the email was sent. ISO 8601 with offset. "
        "confirmed=true only when the time is fixed, not proposed.\n"
        "- needs_reply: true if a person (not a system) expects an answer from him; reply_by if stated.\n"
        "- people: humans mentioned with their role/organisation when stated.\n"
        "- Never invent facts. Empty lists and empty strings are correct when nothing applies. "
        "Newsletters and automated notifications usually have no action items."
    )


WEEKDAYS_DE = ("Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag")


def date_table(sent: datetime, days: int = 14) -> str:
    """The dates following the email's send date, with English and German weekday names.
    Small models resolve "kommenden Donnerstag" badly by arithmetic and well by lookup,
    so the lookup is handed to them."""
    base = sent.astimezone(TZ).date()
    rows = []
    for i in range(days + 1):
        d = base + timedelta(days=i)
        rows.append(f"{d:%a} / {WEEKDAYS_DE[d.weekday()]} = {d.isoformat()}"
                    + (" (the day it was sent)" if i == 0 else ""))
    return "\n".join(rows)


def user_prompt(m: Message) -> str:
    who = "HE WROTE THIS EMAIL (sent mail)" if m.owner else "email he received"
    from backend.mail import attachments          # deadlines often live in an attached PDF
    att = "".join(f"\n\n[Attachment {a['name']}]\n{attachments.text(m.key, a['n'])[:1500]}"
                  for a in (attachments.listing(m.key) or [])[:3])
    return (f"[{who}; account: {m.account}]\nFrom: {m.from_name} <{m.from_addr}>\n"
            f"To: {', '.join(m.to[:8])}\nSent: {m.date.astimezone(TZ):%A %d %B %Y %H:%M}\n"
            f"Subject: {m.subject}\n\n{m.text[:6000]}{att}\n\n"
            f"Date table (look weekday names up here):\n{date_table(m.date)}")


WEEKDAY_WORDS = {
    **{w: i for i, w in enumerate(("montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag"))},
    **{w: i for i, w in enumerate(("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"))},
    **{w: i for i, w in enumerate(("mo", "di", "mi", "do", "fr", "sa", "so"))},
    **{w: i for i, w in enumerate(("mon", "tue", "wed", "thu", "fri", "sat", "sun"))},
}


def fix_weekday(iso: Optional[str], word: str, sent: datetime) -> Optional[str]:
    """If the email named a weekday and the model's date falls on a different one, move the
    date to the first such weekday after the email was sent, keeping the time of day.
    A date already on the named weekday is kept — that covers "Donnerstag nächste Woche"."""
    day = WEEKDAY_WORDS.get((word or "").strip().lower().rstrip("."))
    if not iso or day is None:
        return iso
    dt = datetime.fromisoformat(iso).astimezone(TZ)
    if dt.weekday() == day:
        return iso
    base = sent.astimezone(TZ).date()
    ahead = (day - base.weekday()) % 7 or 7
    target = base + timedelta(days=ahead)
    return dt.replace(year=target.year, month=target.month, day=target.day).isoformat()


def sanity(data: dict, sent: datetime) -> dict:
    """What a model says about time is checked against when the mail was sent. First, a
    named weekday beats the model's date arithmetic (fix_weekday). Then a deadline before
    the mail existed is a misreading (dropped; the task stays, undated), and an event that
    ended before the mail was sent is history, not something to schedule."""
    floor = sent - timedelta(hours=1)

    def before(iso: Optional[str], limit: datetime) -> bool:
        return bool(iso) and datetime.fromisoformat(iso) < limit

    for a in data.get("action_items") or []:
        a["due"] = fix_weekday(a.get("due"), a.pop("due_weekday", ""), sent)
    for e in data.get("events") or []:
        word = e.pop("start_weekday", "")
        new_start = fix_weekday(e.get("start"), word, sent)
        if new_start != e.get("start") and e.get("end"):
            shift = datetime.fromisoformat(new_start) - datetime.fromisoformat(e["start"])
            e["end"] = (datetime.fromisoformat(e["end"]) + shift).isoformat()
        e["start"] = new_start
    for a in data.get("action_items") or []:
        if before(a.get("due"), floor):
            a["due"] = None
    if before(data.get("reply_by"), floor):
        data["reply_by"] = None
    data["events"] = [e for e in data.get("events") or []
                      if not before(e.get("end") or e.get("start"), sent - timedelta(hours=12))]
    return data


def triage(m: Message) -> Optional[Tuple[str, dict]]:
    """(triage label, minimal extraction) when the model is not worth running, else None."""
    if m.bulk and not m.owner:
        return "newsletter", {"summary": m.subject or "(newsletter)", "category": "newsletter"}
    try:
        from tools.journal_manager.classifier import classify
        r = classify(f"From: {m.from_name} <{m.from_addr}>\nSubject: {m.subject}\n\n{m.text[:4000]}")
        if r.category == "spam" and len(r.spam_signals) >= 2:
            return "predatory", {"summary": f"Predatory journal/conference mail: {m.subject}",
                                 "category": "spam"}
    except Exception:
        pass
    return None


class ExtractionFailed(Exception):
    pass


async def _ollama(client: httpx.AsyncClient, env: Mapping[str, str], m: Message, now: datetime) -> Tuple[str, str]:
    model = env.get("MAIL_EXTRACT_MODEL") or DEFAULT_MODEL
    url = (env.get("OLLAMA_URL") or "http://127.0.0.1:11434").rstrip("/")
    r = await client.post(f"{url}/api/chat", json={
        "model": model, "stream": False, "format": SCHEMA,
        "options": {"temperature": 0, "num_ctx": 8192},
        "messages": [{"role": "system", "content": system_prompt(now)},
                     {"role": "user", "content": user_prompt(m)}],
    }, timeout=600)
    if r.status_code != 200:
        raise ExtractionFailed(f"Ollama answered HTTP {r.status_code}")
    return r.json()["message"]["content"], model


async def _anthropic(client: httpx.AsyncClient, env: Mapping[str, str], m: Message, now: datetime) -> Tuple[str, str]:
    model = env.get("MAIL_EXTRACT_ANTHROPIC_MODEL") or "claude-haiku-4-5-20251001"
    r = await client.post("https://api.anthropic.com/v1/messages", headers={
        "x-api-key": env.get("ANTHROPIC_API_KEY", ""), "anthropic-version": "2023-06-01"}, json={
        "model": model, "max_tokens": 2000, "temperature": 0,
        "system": system_prompt(now) + "\nAnswer with one JSON object matching this schema and nothing else: "
                  + json.dumps(SCHEMA),
        "messages": [{"role": "user", "content": user_prompt(m)}],
    }, timeout=120)
    if r.status_code != 200:
        raise ExtractionFailed(f"Anthropic answered HTTP {r.status_code}")
    text = "".join(b.get("text", "") for b in r.json().get("content", []))
    return text[text.find("{"): text.rfind("}") + 1], model


async def extract(client: httpx.AsyncClient, env: Mapping[str, str], m: Message,
                  now: Optional[datetime] = None) -> Tuple[dict, str]:
    """-> (validated extraction as JSON-able dict, model name). Raises ExtractionFailed."""
    now = now or datetime.now(TZ)
    call = _anthropic if env.get("MAIL_EXTRACT_PROVIDER") == "anthropic" and env.get("ANTHROPIC_API_KEY") else _ollama
    last = ""
    for _ in range(2):
        try:
            content, model = await call(client, env, m, now)
        except httpx.HTTPError as e:
            raise ExtractionFailed(f"model unreachable ({type(e).__name__})")
        try:
            data = Extraction.model_validate(json.loads(content)).model_dump(mode="json")
            return sanity(data, m.date), model
        except (ValueError, ValidationError) as e:
            last = f"invalid model output ({type(e).__name__})"
    raise ExtractionFailed(last)
