"""Bank exports: Sparkasse (CSV-CAMT V2 and CSV-MT940) and Revolut (account statement CSV).

Each row becomes ``{id, bank, account, date, amount, currency, counterparty, purpose,
balance}`` with ``date`` in ISO form and ``amount`` a signed decimal string (negative is
money out). The id is a digest of the row's content plus its occurrence number among
identical rows of the same file, so importing overlapping exports twice adds nothing,
while two genuine identical payments on one day are both kept.

Formats are recognised by their header, never by the file name.
"""

from __future__ import annotations

import csv
import hashlib
import io
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from .store import fmt, money

SPARKASSE_KEYS = {"auftragskonto", "buchungstag", "betrag"}
REVOLUT_KEYS = {"type", "started date", "completed date", "description", "amount", "currency", "state"}


class UnknownFormat(ValueError):
    pass


def _decode(raw: bytes) -> str:
    for enc in ("utf-8-sig", "cp1252"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            continue
    return raw.decode("latin-1")


def _sparkasse_date(text: str) -> str:
    for f in ("%d.%m.%y", "%d.%m.%Y"):
        try:
            return datetime.strptime(text.strip(), f).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"not a Sparkasse date: {text!r}")


def _row_id(bank: str, parts: list[str], seen: dict[str, int]) -> str:
    base = hashlib.sha256("\x1f".join([bank, *parts]).encode("utf-8")).hexdigest()[:20]
    n = seen.get(base, 0)
    seen[base] = n + 1
    return f"{bank}-{base}-{n}"


def parse(raw: bytes) -> list[dict]:
    text = _decode(raw)
    first = text.splitlines()[0] if text else ""
    delimiter = ";" if first.count(";") > first.count(",") else ","
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    headers = {h.strip().lower() for h in (reader.fieldnames or [])}
    if SPARKASSE_KEYS <= headers:
        return _sparkasse(reader)
    if REVOLUT_KEYS <= headers:
        return _revolut(reader)
    raise UnknownFormat(f"not a Sparkasse or Revolut export (columns: {sorted(headers)})")


def _get(row: dict, *names: str) -> str:
    lower = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
    for n in names:
        if n in lower and lower[n]:
            return lower[n]
    return ""


def _sparkasse(reader: csv.DictReader) -> list[dict]:
    out: list[dict] = []
    seen: dict[str, int] = {}
    for row in reader:
        amount = _get(row, "betrag")
        if not amount:
            continue
        rec = {
            "bank": "sparkasse",
            "account": _get(row, "auftragskonto"),
            "date": _sparkasse_date(_get(row, "buchungstag")),
            "amount": fmt(money(amount)),
            "currency": _get(row, "waehrung", "währung") or "EUR",
            "counterparty": _get(row, "beguenstigter/zahlungspflichtiger", "begünstigter/zahlungspflichtiger"),
            "purpose": " ".join(filter(None, [_get(row, "buchungstext"), _get(row, "verwendungszweck")])),
            "balance": None,
            "status": _get(row, "info") or None,
        }
        rec["id"] = _row_id("sparkasse", [rec["account"], rec["date"], rec["amount"],
                                          rec["counterparty"], rec["purpose"]], seen)
        out.append(rec)
    return out


def _plain(text: str) -> Decimal:
    """A Revolut amount: dot decimal, optional comma thousands separators."""
    return Decimal(text.replace(",", "").strip() or "0")


def _revolut(reader: csv.DictReader) -> list[dict]:
    out: list[dict] = []
    seen: dict[str, int] = {}
    for row in reader:
        state = _get(row, "state").upper()
        if state and state != "COMPLETED":
            continue  # pending, reverted and declined rows never moved money
        amount = _plain(_get(row, "amount"))
        fee = _plain(_get(row, "fee"))
        when = _get(row, "completed date") or _get(row, "started date")
        balance = _get(row, "balance")
        rec = {
            "bank": "revolut",
            "account": _get(row, "product") or "current",
            "date": when[:10],
            "amount": fmt(amount - fee),
            "currency": _get(row, "currency") or "EUR",
            "counterparty": _get(row, "description"),
            "purpose": _get(row, "type"),
            "balance": fmt(_plain(balance)) if balance else None,
            "status": None,
        }
        rec["id"] = _row_id("revolut", [rec["account"], when, rec["amount"], rec["counterparty"],
                                        rec["currency"]], seen)
        out.append(rec)
    return out


def merge(existing: list[dict], new: list[dict]) -> tuple[list[dict], int]:
    """Add the rows of ``new`` whose ids are not yet present; return rows and count added."""
    ids = {r["id"] for r in existing}
    added = [r for r in new if r["id"] not in ids]
    rows = sorted(existing + added, key=lambda r: (r["date"], r["id"]))
    return rows, len(added)


def import_file(path: Path) -> list[dict]:
    return parse(Path(path).read_bytes())


def summary(rows: list[dict], months: int = 3) -> dict:
    """Money in and out per calendar month, for the last ``months`` months present (EUR only)."""
    by_month: dict[str, dict[str, Decimal]] = {}
    for r in rows:
        if r.get("currency", "EUR") != "EUR":
            continue
        m = r["date"][:7]
        slot = by_month.setdefault(m, {"in": Decimal(0), "out": Decimal(0)})
        a = money(r["amount"])
        slot["in" if a > 0 else "out"] += a
    keys = sorted(by_month)[-months:]
    return {k: {"in": fmt(by_month[k]["in"]), "out": fmt(-by_month[k]["out"])} for k in keys}
