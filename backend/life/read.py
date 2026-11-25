"""
Reading one mail for facts about Kundai (slots.py), each witnessed by a verbatim quote.

  triage(m)      is the mail about his papers, home or job at all? (words, no model)
  own_text(m)    the part of the mail its sender wrote: quoted replies cut off, so a fact
                 quoted from someone else is never taken as the sender's own statement
  read(...)      the model proposes {slot, value, quote}; `admit` keeps only proposals whose
                 quote is in the mail verbatim and states the value (a date in any common
                 form). What the model invents without a quote never reaches the record.
"""

from __future__ import annotations

import json
import re
from datetime import date
from typing import List, Mapping, Optional, Tuple

import httpx

from backend.life.slots import BY_ID, SLOTS

TRIAGE = re.compile(
    r"reisepass|passport|\bpass\b|fiktionsbescheinigung|aufenthalt|ausl[äa]nderbeh[öo]rde|migration|blaue karte|"
    r"niederlassungserlaubnis|meldebescheinigung|anmeldung einer wohnung|einwohnermelde|b[üu]rgeramt|"
    r"ummeldung|wohnung|mietvertrag|arbeitsvertrag|einstellung|tv-l|personalfragebogen|geburtsdatum|geb\.",
    re.I)
CARD = re.compile(r"\beAT\b")                   # elektronischer Aufenthaltstitel; case matters ("eat")
NOT_ABOUT_HIM = re.compile(r"^\[[^\]]+\]")          # mailing lists: [zentral_alle] …

QUOTE_START = re.compile(
    r"^(on .{3,120} wrote:|am .{3,120} schrieb .{0,80}:|-{2,} ?(original message|urspr[üu]ngliche nachricht) ?-{2,}|"
    r"von: .+|from: .+)\s*$", re.I)

MONTHS = {m: i for i, names in enumerate([
    ("januar", "january", "jan"), ("februar", "february", "feb"), ("märz", "maerz", "march", "mar", "mär"),
    ("april", "apr"), ("mai", "may"), ("juni", "june", "jun"), ("juli", "july", "jul"),
    ("august", "aug"), ("september", "sept", "sep"), ("oktober", "october", "okt", "oct"),
    ("november", "nov"), ("dezember", "december", "dez", "dec")], 1) for m in names}

SYSTEM = """\
You read one email to keep a record of facts about Kundai Sachikonye, the owner of the mailbox.
Report only facts the email states as TRUE NOW about Kundai himself, for these slots:
{slots}

For each fact give: slot (one of the ids above), value (dates as YYYY-MM-DD; text exactly as
written in the email), quote (the exact words of the email that state it, copied character for
character, at most 200 characters, containing the value as written).

Rules:
- Facts about a FORMER passport, permit or address are not current: leave them out.
- A request or plan is not a fact that holds: asking for a Fiktionsbescheinigung is not having
  one (but it is residence_applied_for if he applied).
- Facts about other people are never facts about Kundai.
- If the email states none of these, answer {{"facts": []}}."""

SCHEMA = {"type": "object", "required": ["facts"], "properties": {"facts": {"type": "array", "items": {
    "type": "object", "required": ["slot", "value", "quote"], "properties": {
        "slot": {"type": "string", "enum": [s.id for s in SLOTS]},
        "value": {"type": "string"}, "quote": {"type": "string"}}}}}}


def triage(m) -> bool:
    if getattr(m, "bulk", False) and not getattr(m, "owner", False):
        return False
    if NOT_ABOUT_HIM.match(m.subject or ""):
        return False
    text = f"{m.subject}\n{own_text(m)}"
    return bool(TRIAGE.search(text) or CARD.search(text))


def own_text(m) -> str:
    """The sender's own words: everything above the first quoted-reply header or '>' block."""
    out = []
    for line in (m.text or "").splitlines():
        s = line.strip()
        if s.startswith(">") or QUOTE_START.match(s):
            break
        out.append(line)
    return "\n".join(out).strip()


def norm(s: str) -> str:
    return " ".join(str(s).split()).casefold()


def dates_in(text: str) -> List[date]:
    """Every calendar date written in `text`: 2036-10-07, 07.10.2036, 7.10.36, 7. Oktober 2036, October 7, 2036."""
    found = []
    t = text.casefold()

    def add(y: int, mo: int, d: int) -> None:
        if y < 100:
            y += 2000 if y < 70 else 1900
        try:
            found.append(date(y, mo, d))
        except ValueError:
            pass

    for y, mo, d in re.findall(r"\b(\d{4})-(\d{1,2})-(\d{1,2})\b", t):
        add(int(y), int(mo), int(d))
    for d, mo, y in re.findall(r"\b(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})\b", t):
        add(int(y), int(mo), int(d))
    for d, name, y in re.findall(r"\b(\d{1,2})\.?\s+([a-zäö]+)\.?\s+(\d{4})\b", t):
        if name in MONTHS:
            add(int(y), MONTHS[name], int(d))
    for name, d, y in re.findall(r"\b([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})\b", t):
        if name in MONTHS:
            add(int(y), MONTHS[name], int(d))
    return found


def iso_date(value: str) -> Optional[str]:
    v = value.strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        try:
            return date.fromisoformat(v).isoformat()
        except ValueError:
            return None
    ds = dates_in(v)
    return ds[0].isoformat() if len(ds) == 1 else None


def witnessed(kind: str, value: str, quote: str, text: str) -> bool:
    """The quote is in the text verbatim (whitespace and case aside) and states the value."""
    q = norm(quote)
    if len(q) < 3 or q not in norm(text):
        return False
    if kind == "date":
        return any(d.isoformat() == value for d in dates_in(quote))
    return bool(norm(value)) and norm(value) in q


def admit(items: list, text: str) -> List[dict]:
    """The proposals that are witnessed, normalised: [{slot, value, quote}]. One per slot+value."""
    out, seen = [], set()
    for it in items if isinstance(items, list) else []:
        if not isinstance(it, dict):
            continue
        slot = BY_ID.get(str(it.get("slot", "")).strip())
        value, quote = str(it.get("value", "")).strip(), str(it.get("quote", "")).strip()
        if slot is None or not value or not quote:
            continue
        if slot.kind == "date":
            value = iso_date(value) or ""
            if not value:
                continue
        else:
            value = " ".join(value.split())[:120]
        if witnessed(slot.kind, value, quote, text) and (slot.id, value) not in seen:
            seen.add((slot.id, value))
            out.append({"slot": slot.id, "value": value, "quote": " ".join(quote.split())[:240]})
    return out


def prompt(m) -> Tuple[str, str]:
    slots = "\n".join(f"- {s.id} ({s.kind}): {s.hint}" for s in SLOTS)
    sender = "Kundai himself" if m.owner else f"{m.from_name} <{m.from_addr}>"
    user = (f"From: {sender}\nDate: {m.date.date().isoformat()}\nSubject: {m.subject}\n\n{own_text(m)[:6000]}")
    return SYSTEM.format(slots=slots), user


class ReadFailed(Exception):
    pass


async def ask(client: httpx.AsyncClient, env: Mapping[str, str], system: str, user: str) -> Tuple[str, str]:
    """(model's JSON text, model name) from the node's model — Ollama, or Anthropic when the
    mail extraction is set to it (MAIL_EXTRACT_PROVIDER=anthropic)."""
    if env.get("MAIL_EXTRACT_PROVIDER") == "anthropic" and env.get("ANTHROPIC_API_KEY"):
        model = env.get("MAIL_EXTRACT_ANTHROPIC_MODEL") or "claude-haiku-4-5-20251001"
        r = await client.post("https://api.anthropic.com/v1/messages", headers={
            "x-api-key": env["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01"}, json={
            "model": model, "max_tokens": 1500, "temperature": 0,
            "system": system + "\nAnswer with one JSON object matching this schema and nothing else: " + json.dumps(SCHEMA),
            "messages": [{"role": "user", "content": user}]}, timeout=120)
        if r.status_code != 200:
            raise ReadFailed(f"Anthropic answered HTTP {r.status_code}")
        text = "".join(b.get("text", "") for b in r.json().get("content", []))
        return text[text.find("{"): text.rfind("}") + 1], model
    from backend.mail.extract import DEFAULT_MODEL
    model = env.get("MAIL_EXTRACT_MODEL") or DEFAULT_MODEL
    url = (env.get("OLLAMA_URL") or "http://127.0.0.1:11434").rstrip("/")
    r = await client.post(f"{url}/api/chat", json={
        "model": model, "stream": False, "format": SCHEMA, "options": {"temperature": 0, "num_ctx": 8192},
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}, timeout=900)
    if r.status_code != 200:
        raise ReadFailed(f"Ollama answered HTTP {r.status_code}")
    return r.json()["message"]["content"], model


async def read(client: httpx.AsyncClient, env: Mapping[str, str], m) -> Tuple[List[dict], str]:
    """-> (witnessed facts, model). Raises ReadFailed when no model answers usably."""
    system, user = prompt(m)
    try:
        content, model = await ask(client, env, system, user)
    except httpx.HTTPError as e:
        raise ReadFailed(f"model unreachable ({type(e).__name__})")
    try:
        items = json.loads(content).get("facts", [])
    except (ValueError, AttributeError):
        raise ReadFailed("the model's answer was not JSON")
    return admit(items, f"{m.subject}\n{own_text(m)}"), model
