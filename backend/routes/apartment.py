"""
Apartment search — Greifswald.

Listings (fetch/parse/score), viewings, deadlines, and the Bewerbermappe.
Data lives in tools/apartment_search/data/search.json
"""

from __future__ import annotations

import sys
from datetime import date
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))

from tools.apartment_search import store
from tools.apartment_search.criteria import BUDGET, DOSSIER_ITEMS, PORTALS, REQUIREMENTS
from tools.apartment_search.dossier import dossier_status, generate_anschreiben
from tools.apartment_search.parser import parse_listing
from tools.apartment_search.scorer import score_listing

router = APIRouter()

APPLICANT = {
    "name": "Kundai Farai Sachikonye",
    "role": "wissenschaftlicher Mitarbeiter an der Universität Greifswald",
    "phone": "",
    "email": "",
}


class ListingIn(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None       # pasted listing, for JS-rendered portals
    address: Optional[str] = None


class StatusIn(BaseModel):
    status: str


class Viewing(BaseModel):
    listing_id: Optional[str] = None
    date: str                        # ISO
    time: str
    address: str
    contact: Optional[str] = ""
    notes: Optional[str] = ""


class Deadline(BaseModel):
    date: str
    title: str
    description: Optional[str] = ""
    done: Optional[bool] = False


class DossierItem(BaseModel):
    have: bool
    note: Optional[str] = ""
    obtained: Optional[str] = None


def _fetch(url: str) -> Optional[str]:
    try:
        from tools.job_assistant.scraper import fetch_job_text
        return fetch_job_text(url, verbose=False)
    except ImportError:
        return None


@router.get("/")
def get_all():
    data = store.load()
    today = date.today().isoformat()
    in_14 = date.fromordinal(date.today().toordinal() + 14).isoformat()

    for v in data.get("viewings", []):
        v["upcoming"] = today <= v.get("date", "") <= in_14
        v["past"] = v.get("date", "") < today
    for d in data.get("deadlines", []):
        d["overdue"] = not d.get("done") and d.get("date", "9999") < today

    listings = sorted(data.get("listings", []), key=lambda e: e.get("score", 0), reverse=True)
    active = [e for e in listings if e.get("status") in store.ACTIVE_STATUSES]

    return {
        "listings": listings,
        "viewings": sorted(data.get("viewings", []), key=lambda v: v.get("date", "")),
        "deadlines": sorted(data.get("deadlines", []), key=lambda d: d.get("date", "")),
        "dossier": dossier_status(data.get("dossier", {})),
        "stats": {
            "total": len(listings),
            "active": len(active),
            "applied": len([e for e in listings if e.get("status") == "applied"]),
            "viewings_upcoming": len([v for v in data.get("viewings", []) if v.get("upcoming")]),
            "best_score": max([e.get("score", 0) for e in listings], default=0),
        },
        "budget": BUDGET,
        "requirements": REQUIREMENTS,
    }


@router.get("/portals")
def portals():
    return {"portals": PORTALS}


@router.post("/listing")
def add_listing(body: ListingIn):
    text = body.text
    if not text and body.url:
        text = _fetch(body.url)
    if not text:
        raise HTTPException(
            status_code=422,
            detail="Could not read the listing. The portal likely requires JavaScript — "
                   "copy the listing text and paste it instead of the URL.",
        )

    listing = parse_listing(text)
    listing["url"] = body.url or ""
    if body.address:
        listing["address"] = body.address
    assessment = score_listing(listing)

    entry = store.add_listing({
        **listing,
        "score": assessment["score"],
        "recommendation": assessment["recommendation"],
        "assessment": assessment,
    })
    return {"ok": True, "listing": entry}


@router.patch("/listing/{listing_id}")
def set_status(listing_id: str, body: StatusIn):
    if body.status not in store.STATUSES:
        raise HTTPException(status_code=400, detail=f"Unknown status. One of: {', '.join(store.STATUSES)}")
    entry = store.update_listing(listing_id, status=body.status)
    if not entry:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"ok": True, "listing": entry}


@router.delete("/listing/{listing_id}")
def remove_listing(listing_id: str):
    if not store.delete_listing(listing_id):
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"ok": True}


@router.get("/listing/{listing_id}/anschreiben")
def anschreiben(listing_id: str):
    data = store.load()
    entry = next((e for e in data["listings"] if e["id"] == listing_id), None)
    if not entry:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"text": generate_anschreiben(entry, APPLICANT)}


@router.post("/viewing")
def add_viewing(v: Viewing):
    data = store.load()
    data["viewings"].append(v.dict())
    data["viewings"].sort(key=lambda x: (x["date"], x.get("time", "")))
    store.save(data)
    # Booking a viewing advances a flat that has not got there yet, but must never
    # drag one backwards: a flat already applied for or offered stays where it is.
    if v.listing_id:
        current = next((e for e in data["listings"] if e["id"] == v.listing_id), None)
        if current and current.get("status") in ("saved", "contacted"):
            store.update_listing(v.listing_id, status="viewing")
    return {"ok": True}


@router.post("/deadline")
def add_deadline(d: Deadline):
    data = store.load()
    data["deadlines"].append(d.dict())
    data["deadlines"].sort(key=lambda x: x["date"])
    store.save(data)
    return {"ok": True}


@router.patch("/deadline/{idx}/done")
def mark_deadline_done(idx: int):
    data = store.load()
    if idx >= len(data["deadlines"]):
        raise HTTPException(status_code=404, detail="Deadline not found")
    data["deadlines"][idx]["done"] = True
    store.save(data)
    return {"ok": True}


@router.patch("/dossier/{item_id}")
def set_dossier_item(item_id: str, body: DossierItem):
    if item_id not in {i["id"] for i in DOSSIER_ITEMS}:
        raise HTTPException(status_code=404, detail="Unknown dossier item")
    data = store.load()
    data.setdefault("dossier", {})[item_id] = body.dict()
    store.save(data)
    return {"ok": True, "dossier": dossier_status(data["dossier"])}


@router.get("/alerts")
def alerts():
    """Urgent items only — for the desk summary panel."""
    data = store.load()
    today = date.today().isoformat()
    in_14 = date.fromordinal(date.today().toordinal() + 14).isoformat()
    ds = dossier_status(data.get("dossier", {}))
    return {
        "upcoming_viewings": [v for v in data.get("viewings", []) if today <= v.get("date", "") <= in_14],
        "overdue_deadlines": [d for d in data.get("deadlines", []) if not d.get("done") and d.get("date", "9999") < today],
        "dossier_order_now": ds["order_now"],
        "dossier_complete": ds["complete"],
    }
