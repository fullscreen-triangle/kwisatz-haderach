"""
Affordability: what a listing actually costs, and whether it is takeable.

Two distinct questions, deliberately kept apart:
  * monthly  — Warmmiete against the budget ceiling.
  * upfront  — Kaution + Genossenschaftsanteile + kitchen, the cash wall at signing.

A flat can pass one and fail the other; the caller needs to see which.
"""

from __future__ import annotations

from typing import Optional

from .criteria import BUDGET, DISTRICTS

# A fitted kitchen is standard in Greifswald co-op stock but not in private
# lettings; without an EBK you are buying one before you can cook.
KITCHEN_COST_IF_ABSENT = 1200.0


def _warm(listing: dict) -> Optional[float]:
    if listing.get("warmmiete") is not None:
        return listing["warmmiete"]
    kalt = listing.get("kaltmiete")
    if kalt is None:
        return None
    return round(kalt + (listing.get("nebenkosten") or 0.0) + (listing.get("heizkosten") or 0.0), 2)


def assess_affordability(listing: dict) -> dict:
    warm = _warm(listing)
    kaution = listing.get("kaution")
    anteile = listing.get("genossenschaftsanteile") or 0.0

    # Kaution unstated: assume the legal maximum of 3 Kaltmieten, and say so.
    kaution_assumed = False
    if kaution is None and listing.get("kaltmiete") is not None:
        kaution = round(listing["kaltmiete"] * 3, 2)
        kaution_assumed = True

    kitchen = 0.0 if listing.get("has_ebk") else KITCHEN_COST_IF_ABSENT
    upfront = round((kaution or 0.0) + anteile + kitchen, 2)

    blockers: list[str] = []
    warnings: list[str] = []

    if warm is None:
        warnings.append("Warmmiete unknown — ask the landlord for Nebenkosten and Heizkosten.")
    elif warm > BUDGET["warm_max"]:
        blockers.append(f"Warmmiete {warm:.0f} € exceeds the {BUDGET['warm_max']:.0f} € ceiling.")
    elif warm > BUDGET["warm_comfortable"]:
        warnings.append(f"Warmmiete {warm:.0f} € is above the comfortable {BUDGET['warm_comfortable']:.0f} €.")

    if kaution and kaution > BUDGET["kaution_max"]:
        blockers.append(f"Kaution {kaution:.0f} € exceeds available cash ({BUDGET['kaution_max']:.0f} €).")
    if anteile > BUDGET["genossenschaft_anteile_max"]:
        blockers.append(f"Genossenschaftsanteile {anteile:.0f} € exceed the {BUDGET['genossenschaft_anteile_max']:.0f} € limit.")
    if kaution_assumed:
        warnings.append("Kaution not stated — assumed 3 Kaltmieten. Confirm before viewing.")
    if kitchen:
        warnings.append(f"No Einbauküche — budget about {KITCHEN_COST_IF_ABSENT:.0f} € for one.")

    total_cash = round(upfront + (warm or 0.0), 2)  # signing day: deposit + first month

    return {
        "warmmiete": warm,
        "kaltmiete": listing.get("kaltmiete"),
        "kaution": kaution,
        "kaution_assumed": kaution_assumed,
        "genossenschaftsanteile": anteile,
        "kitchen_cost": kitchen,
        "upfront_total": upfront,
        "cash_at_signing": total_cash,
        "refundable": round((kaution or 0.0) + anteile, 2),  # comes back when you leave
        "eur_per_sqm": round(warm / listing["size_sqm"], 2)
            if warm and listing.get("size_sqm") else None,
        "blockers": blockers,
        "warnings": warnings,
        "affordable": not blockers,
    }


def commute(listing: dict) -> dict:
    d = listing.get("district")
    info = DISTRICTS.get(d) if d else None
    if not info:
        return {"district": d, "bike_min": None, "note": "District unknown — check the address."}
    return {"district": d, "bike_min": info["bike_min"], "note": info["note"]}
