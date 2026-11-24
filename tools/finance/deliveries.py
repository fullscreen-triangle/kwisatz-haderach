"""Parcels: tracking numbers found in order and shipping mail, and where each parcel is.

A number is taken only when the evidence for it is specific, because order numbers,
customer numbers and phone numbers look like tracking numbers:

* a carrier's tracking link (``piececode=``, ``tracknum=``, ``/parcel/``, ...),
* a labelled number (``Sendungsnummer: ...``, ``Tracking number ...``), or
* a carrier-specific format, only in a message that names that carrier, and only
  within a short distance of a word such as "Sendung", "Paket" or "tracking".

UPS numbers (``1Z`` + 16 characters) are unambiguous and are taken anywhere.

Status comes from the newest message that mentions the number: ordered, shipped,
in transit, out for delivery, delivered. When a parcel is delivered, ``return_by`` is
fourteen days later: the statutory withdrawal period for distance purchases in the EU,
which many shops extend. It is a reminder, not legal advice.
"""

from __future__ import annotations

import re
import sqlite3
from datetime import date, timedelta
from pathlib import Path

TRACK_URL = {
    "dhl": "https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode={n}",
    "ups": "https://www.ups.com/track?tracknum={n}",
    "dpd": "https://tracking.dpd.de/status/de_DE/parcel/{n}",
    "hermes": "https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation#{n}",
    "gls": "https://gls-group.com/DE/de/paketverfolgung?match={n}",
}

CARRIER_WORDS = {
    "dhl": ("dhl", "deutsche post"),
    "ups": ("ups",),
    "dpd": ("dpd",),
    "hermes": ("hermes",),
    "gls": ("gls",),
}

# carrier-specific number shapes (used only near a label word, in a message naming the carrier)
SHAPES = {
    "dhl": r"(?:00340\d{15}|JJD\d{18,20}|\d{20}|\d{12})",
    "dpd": r"(?:0\d{13}|\d{14})",
    "hermes": r"(?:H\d{19}|\d{16}|\d{14})",
    "gls": r"(?:\d{11,12})",
}

LINKS = [
    ("dhl", r"piececode=([A-Z0-9]{10,35})"),
    ("dhl", r"dhl\.[a-z.]+/[^\s\"'<>]*?(?:idc|tracking-id|shipmentId)=([A-Z0-9]{10,35})"),
    ("ups", r"ups\.com/[^\s\"'<>]*?(?:tracknum|trackNums|InquiryNumber1)=([A-Z0-9]{10,35})"),
    ("dpd", r"dpd\.[a-z.]+/[^\s\"'<>]*?parcel/([0-9]{14})"),
    ("dpd", r"dpd\.[a-z.]+/[^\s\"'<>]*?parcelNumber=([0-9]{14})"),
    ("hermes", r"(?:myhermes|hermesworld)[^\s\"'<>]*?(?:#|=)([A-Z0-9]{14,20})"),
    ("gls", r"gls-[a-z.-]+/[^\s\"'<>]*?(?:match|txtAction)=([0-9]{11,12})"),
]

LABEL = re.compile(
    r"(?:sendungsnummer|sendungs-nr\.?|trackingnummer|tracking-nummer|tracking number|tracking no\.?|"
    r"paketnummer|parcel number|shipment number)\s*[:#]?\s*([A-Z0-9]{8,35})",
    re.I,
)
NEAR = re.compile(r"sendung|paket|tracking|parcel|shipment|verfolg", re.I)
UPS = re.compile(r"\b1Z[0-9A-Z]{16}\b")

STATUS_WORDS = [  # checked in this order; the first that matches wins
    ("delivered", ("wurde zugestellt", "zugestellt", "delivered", "abgegeben bei", "in der packstation abgelegt")),
    ("out-for-delivery", ("in zustellung", "out for delivery", "heute zugestellt", "wird heute")),
    ("in-transit", ("unterwegs", "in transit", "auf dem weg", "im paketzentrum")),
    ("shipped", ("versandt", "verschickt", "shipped", "versendet", "has been dispatched")),
    ("ordered", ("bestellbestätigung", "bestellung eingegangen", "order confirmation", "vielen dank für ihre bestellung")),
]
RANK = {"ordered": 0, "shipped": 1, "in-transit": 2, "out-for-delivery": 3, "delivered": 4}


def _carriers_named(text: str) -> set[str]:
    low = text.lower()
    found = set()
    for carrier, words in CARRIER_WORDS.items():
        for w in words:
            if re.search(rf"\b{re.escape(w)}\b", low):
                found.add(carrier)
    return found


def _guess_carrier(number: str, named: set[str]) -> str | None:
    if UPS.fullmatch(number):
        return "ups"
    for carrier in sorted(named):
        shape = SHAPES.get(carrier)
        if shape and re.fullmatch(shape, number):
            return carrier
    return next(iter(sorted(named)), None)


def extract(text: str, *, sender: str = "", subject: str = "") -> list[dict]:
    """Tracking numbers in one message, as ``[{carrier, number, url}]``."""
    whole = f"{sender}\n{subject}\n{text}"
    named = _carriers_named(whole)
    found: dict[str, str | None] = {}
    for carrier, pattern in LINKS:
        for m in re.finditer(pattern, whole, re.I):
            found.setdefault(m.group(1).upper(), carrier)
    for m in UPS.finditer(whole):
        found.setdefault(m.group(0).upper(), "ups")
    for m in LABEL.finditer(whole):
        n = m.group(1).upper()
        if any(c.isdigit() for c in n):
            found.setdefault(n, _guess_carrier(n, named))
    for carrier in named:
        shape = SHAPES.get(carrier)
        if not shape:
            continue
        for m in re.finditer(rf"(?<![0-9A-Z]){shape}(?![0-9A-Z])", whole):
            window = whole[max(0, m.start() - 80): m.end() + 20]
            if NEAR.search(window):
                found.setdefault(m.group(0), carrier)
    out = []
    for n, carrier in found.items():
        url = TRACK_URL[carrier].format(n=n) if carrier in TRACK_URL else None
        out.append({"carrier": carrier, "number": n, "url": url})
    return out


def status_of(text: str) -> str | None:
    low = text.lower()
    for status, words in STATUS_WORDS:
        if any(w in low for w in words):
            return status
    return None


def _day(value: str) -> str:
    return value[:10]


def apply(parcels: dict, message: dict, *, today: date | None = None) -> list[str]:
    """Record what ``message`` says about parcels into ``parcels``; return the numbers touched.

    ``message`` has ``key``, ``date`` (ISO), ``from_name``/``from_addr``, ``subject``, ``text``.
    A parcel's status only moves forward; a message older than the last update does not
    overwrite it.
    """
    sender = f"{message.get('from_name') or ''} <{message.get('from_addr') or ''}>"
    found = extract(message.get("text") or "", sender=sender, subject=message.get("subject") or "")
    status = status_of(f"{message.get('subject') or ''}\n{message.get('text') or ''}")
    when = _day(message.get("date") or (today or date.today()).isoformat())
    touched = []
    for f in found:
        p = parcels.setdefault(f["number"], {
            "number": f["number"], "carrier": f["carrier"], "url": f["url"],
            "shop": message.get("from_name") or message.get("from_addr") or "",
            "subject": message.get("subject") or "", "first_seen": when,
            "status": "ordered", "last_update": when, "delivered_on": None, "return_by": None,
            "sources": [],
        })
        if message.get("key") and message["key"] not in p["sources"]:
            p["sources"].append(message["key"])
        if p.get("carrier") is None and f["carrier"]:
            p["carrier"], p["url"] = f["carrier"], f["url"]
        if status and RANK[status] >= RANK.get(p["status"], 0) and when >= p["last_update"]:
            p["status"] = status
            p["last_update"] = when
            if status == "delivered" and not p.get("delivered_on"):
                p["delivered_on"] = when
                p["return_by"] = (date.fromisoformat(when) + timedelta(days=14)).isoformat()
        touched.append(f["number"])
    return touched


def scan_mail_db(db_path: Path, parcels: dict, *, since: str) -> dict:
    """Read the desk's mail store (read-only) and apply every candidate message since ``since``."""
    uri = f"file:{Path(db_path).as_posix()}?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    con.row_factory = sqlite3.Row
    words = sorted({w for ws in CARRIER_WORDS.values() for w in ws} |
                   {"sendung", "tracking", "versand", "zugestellt", "bestellung", "paket"})
    cond = " OR ".join(["lower(subject) LIKE ? OR lower(from_name) LIKE ? OR lower(from_addr) LIKE ?"] * len(words))
    args: list[str] = []
    for w in words:
        args += [f"%{w}%"] * 3
    try:
        rows = con.execute(
            f"SELECT key, date, from_name, from_addr, subject, text FROM messages "
            f"WHERE date >= ? AND ({cond}) ORDER BY date", [since, *args]).fetchall()
    finally:
        con.close()
    touched: set[str] = set()
    for r in rows:
        touched.update(apply(parcels, dict(r)))
    return {"messages_read": len(rows), "parcels_touched": len(touched)}


def listing(parcels: dict, *, today: date | None = None) -> list[dict]:
    """Parcels newest first, with days left to return delivered ones."""
    today = today or date.today()
    out = []
    for p in parcels.values():
        item = dict(p)
        if p.get("return_by"):
            item["return_days_left"] = (date.fromisoformat(p["return_by"]) - today).days
        out.append(item)
    newest_first = sorted(out, key=lambda p: p["last_update"], reverse=True)
    return sorted(newest_first, key=lambda p: p["status"] == "delivered")  # stable: open ones first
