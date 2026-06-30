"""
Bank data route — reads CSV/CAMT exports dropped into tools/bank_tracker/data/
Supports DKB, N26, Sparkasse, ING export formats.
No live bank API — user drops export files manually.
"""

import csv
import json
import re
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import Optional

router = APIRouter()
ROOT = Path(__file__).parent.parent.parent
DATA_DIR = ROOT / "tools" / "bank_tracker" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _parse_amount(raw: str) -> Optional[float]:
    if not raw:
        return None
    cleaned = raw.replace(".", "").replace(",", ".").replace("€", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def _detect_bank(headers: list[str]) -> str:
    h = [h.lower() for h in headers]
    if "glaeubiger-id" in h or "mandatsreferenz" in h:
        return "dkb"
    if "iban" in h and "transaction type" in h:
        return "n26"
    if "buchungstag" in h and "verwendungszweck" in h:
        return "sparkasse"
    if "buchung" in h and "empfänger/auftraggeber" in h:
        return "ing"
    return "generic"


def _parse_csv(path: Path) -> list[dict]:
    transactions = []
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        # Skip preamble lines (DKB has ~5 header rows before actual CSV)
        lines = f.readlines()
        start = 0
        for i, line in enumerate(lines):
            if re.search(r"datum|buchung|date|value", line, re.I):
                start = i
                break
        reader = csv.DictReader(lines[start:], delimiter=";")
        bank = _detect_bank(reader.fieldnames or [])

        for row in reader:
            row = {k.strip(): v.strip() for k, v in row.items() if k}
            if bank == "dkb":
                t = {
                    "date": row.get("Buchungstag", ""),
                    "payee": row.get("Auftraggeber / Beguenstigter", ""),
                    "purpose": row.get("Verwendungszweck", ""),
                    "amount": _parse_amount(row.get("Betrag (EUR)", "")),
                    "bank": "dkb",
                }
            elif bank == "n26":
                t = {
                    "date": row.get("Date", ""),
                    "payee": row.get("Payee", ""),
                    "purpose": row.get("Transaction type", ""),
                    "amount": _parse_amount(row.get("Amount (EUR)", "")),
                    "bank": "n26",
                }
            else:
                # generic fallback — grab first date-like, payee-like, amount-like columns
                vals = list(row.values())
                t = {
                    "date": vals[0] if vals else "",
                    "payee": vals[1] if len(vals) > 1 else "",
                    "purpose": vals[2] if len(vals) > 2 else "",
                    "amount": _parse_amount(vals[-1]) if vals else None,
                    "bank": "generic",
                }
            if t["amount"] is not None:
                transactions.append(t)

    return transactions


def _categorize(t: dict) -> str:
    text = (t.get("payee", "") + " " + t.get("purpose", "")).lower()
    if any(w in text for w in ["rewe", "kaufland", "penny", "aldi", "lidl", "edeka", "netto"]):
        return "groceries"
    if any(w in text for w in ["netflix", "spotify", "amazon prime", "disney", "claude", "openai"]):
        return "subscriptions"
    if any(w in text for w in ["miete", "rent", "wohnung", "nebenkosten"]):
        return "rent"
    if any(w in text for w in ["db ", "mvv", "ubahn", "s-bahn", "flixbus", "uber", "bolt"]):
        return "transport"
    if any(w in text for w in ["apotheke", "arzt", "doctor", "pharmacy", "kranken"]):
        return "health"
    if any(w in text for w in ["jobcenter", "arbeitsamt", "sozial", "alg"]):
        return "benefits"
    if any(w in text for w in ["payback", "coupon", "rabatt", "cashback"]):
        return "discounts"
    if t.get("amount", 0) > 0:
        return "income"
    return "other"


@router.get("/summary")
def bank_summary():
    """Summarize all transactions from latest export file."""
    files = sorted(DATA_DIR.glob("*.csv"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not files:
        return {"error": "No CSV export found. Drop your bank export into tools/bank_tracker/data/"}

    transactions = _parse_csv(files[0])
    for t in transactions:
        t["category"] = _categorize(t)

    by_category: dict[str, float] = {}
    for t in transactions:
        by_category[t["category"]] = by_category.get(t["category"], 0) + (t["amount"] or 0)

    subscriptions = [t for t in transactions if t["category"] == "subscriptions" and (t["amount"] or 0) < 0]

    return {
        "file": files[0].name,
        "transaction_count": len(transactions),
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "subscriptions": subscriptions,
        "total_spend": round(sum(t["amount"] for t in transactions if (t["amount"] or 0) < 0), 2),
        "total_income": round(sum(t["amount"] for t in transactions if (t["amount"] or 0) > 0), 2),
    }


@router.get("/transactions")
def transactions(category: Optional[str] = None, limit: int = 50):
    """Return raw transactions, optionally filtered by category."""
    files = sorted(DATA_DIR.glob("*.csv"), key=lambda f: f.stat().st_mtime, reverse=True)
    if not files:
        return {"transactions": [], "error": "No export file found"}

    all_t = _parse_csv(files[0])
    for t in all_t:
        t["category"] = _categorize(t)

    if category:
        all_t = [t for t in all_t if t["category"] == category]

    return {"transactions": all_t[:limit], "total": len(all_t)}


@router.post("/upload")
async def upload_export(file: UploadFile = File(...)):
    """Upload a bank CSV export directly from the browser."""
    dest = DATA_DIR / file.filename
    content = await file.read()
    dest.write_bytes(content)
    return {"saved": file.filename, "size": len(content)}
