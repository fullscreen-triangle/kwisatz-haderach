"""
Jobcenter tracker — manual data store, no official API.
Tracks appointments, deadlines, Bescheide, and Sachbearbeiter info.
Data lives in tools/jobcenter_tracker/data/tracker.json
"""

import json
from pathlib import Path
from datetime import datetime, date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
ROOT = Path(__file__).parent.parent.parent
DATA_DIR = ROOT / "tools" / "jobcenter_tracker" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
TRACKER_FILE = DATA_DIR / "tracker.json"


def _load() -> dict:
    if not TRACKER_FILE.exists():
        return {
            "kundennummer": "",
            "sachbearbeiter": {"name": "", "phone": "", "email": ""},
            "appointments": [],
            "deadlines": [],
            "bescheide": [],
            "notes": [],
        }
    return json.loads(TRACKER_FILE.read_text(encoding="utf-8"))


def _save(data: dict):
    TRACKER_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


class Appointment(BaseModel):
    date: str          # ISO: 2026-07-15
    time: str          # e.g. 10:30
    location: str
    type: str          # Erstgespräch, Beratung, Pflichttermin, etc.
    notes: Optional[str] = ""


class Deadline(BaseModel):
    date: str
    title: str          # e.g. Eigenbewerber-Nachweise einreichen
    description: Optional[str] = ""
    done: Optional[bool] = False


class Bescheid(BaseModel):
    received: str       # ISO date
    valid_from: str
    valid_until: str
    monthly_amount: Optional[float] = None
    type: str           # ALG II, Bürgergeld, etc.
    notes: Optional[str] = ""


@router.get("/")
def get_tracker():
    data = _load()
    today = date.today().isoformat()

    # Flag overdue deadlines
    for d in data.get("deadlines", []):
        d["overdue"] = not d.get("done") and d.get("date", "9999") < today

    # Flag upcoming appointments (next 14 days)
    for a in data.get("appointments", []):
        a["upcoming"] = today <= a.get("date", "") <= date.fromordinal(date.today().toordinal() + 14).isoformat()

    # Flag expiring Bescheide (within 30 days)
    for b in data.get("bescheide", []):
        days_left = (date.fromisoformat(b["valid_until"]) - date.today()).days if b.get("valid_until") else 999
        b["days_until_expiry"] = days_left
        b["expiring_soon"] = 0 <= days_left <= 30

    return data


@router.post("/appointment")
def add_appointment(a: Appointment):
    data = _load()
    data["appointments"].append(a.dict())
    data["appointments"].sort(key=lambda x: x["date"])
    _save(data)
    return {"ok": True}


@router.post("/deadline")
def add_deadline(d: Deadline):
    data = _load()
    data["deadlines"].append(d.dict())
    data["deadlines"].sort(key=lambda x: x["date"])
    _save(data)
    return {"ok": True}


@router.post("/bescheid")
def add_bescheid(b: Bescheid):
    data = _load()
    data["bescheide"].append(b.dict())
    _save(data)
    return {"ok": True}


@router.patch("/deadline/{idx}/done")
def mark_deadline_done(idx: int):
    data = _load()
    if idx >= len(data["deadlines"]):
        raise HTTPException(status_code=404, detail="Deadline not found")
    data["deadlines"][idx]["done"] = True
    _save(data)
    return {"ok": True}


@router.patch("/profile")
def update_profile(kundennummer: Optional[str] = None, name: Optional[str] = None,
                   phone: Optional[str] = None, email: Optional[str] = None):
    data = _load()
    if kundennummer:
        data["kundennummer"] = kundennummer
    if name:
        data["sachbearbeiter"]["name"] = name
    if phone:
        data["sachbearbeiter"]["phone"] = phone
    if email:
        data["sachbearbeiter"]["email"] = email
    _save(data)
    return {"ok": True}


@router.get("/alerts")
def alerts():
    """Return only urgent items — for the desk summary panel."""
    data = _load()
    today = date.today().isoformat()
    in_14 = date.fromordinal(date.today().toordinal() + 14).isoformat()
    in_30 = date.fromordinal(date.today().toordinal() + 30).isoformat()

    return {
        "overdue_deadlines": [d for d in data["deadlines"] if not d.get("done") and d.get("date", "9999") < today],
        "upcoming_appointments": [a for a in data["appointments"] if today <= a.get("date", "") <= in_14],
        "expiring_bescheide": [
            b for b in data["bescheide"]
            if b.get("valid_until") and today <= b["valid_until"] <= in_30
        ],
    }
