"""
Score a listing 0-100 against the criteria, and say what to do about it.

The score is a ranking aid for a shortlist, not a verdict: an affordability
blocker overrides it outright, because a flat you cannot pay for does not
become payable by scoring well on size.
"""

from __future__ import annotations

from .criteria import BUDGET, REQUIREMENTS, DISTRICTS
from .affordability import assess_affordability, commute

# Weights sum to 100.
_W_PRICE, _W_SIZE, _W_ROOMS, _W_LOCATION, _W_FEATURES = 35, 20, 15, 20, 10


def _price_points(warm: float | None) -> float:
    if warm is None:
        return _W_PRICE * 0.5           # unknown: neutral, not punished
    if warm <= BUDGET["warm_comfortable"]:
        return _W_PRICE
    if warm >= BUDGET["warm_max"]:
        return 0.0
    span = BUDGET["warm_max"] - BUDGET["warm_comfortable"]
    return _W_PRICE * (1 - (warm - BUDGET["warm_comfortable"]) / span)


def _size_points(sqm: float | None) -> float:
    if sqm is None:
        return _W_SIZE * 0.5
    if sqm < REQUIREMENTS["size_min_sqm"]:
        return 0.0
    if sqm >= REQUIREMENTS["size_ideal_sqm"]:
        return _W_SIZE
    span = REQUIREMENTS["size_ideal_sqm"] - REQUIREMENTS["size_min_sqm"]
    return _W_SIZE * (sqm - REQUIREMENTS["size_min_sqm"]) / span


def _room_points(rooms: float | None) -> float:
    if rooms is None:
        return _W_ROOMS * 0.5
    if rooms < REQUIREMENTS["rooms_min"]:
        return 0.0
    return _W_ROOMS if rooms >= 2 else _W_ROOMS * 0.6


def _location_points(district: str | None) -> float:
    if not district or district not in DISTRICTS:
        return _W_LOCATION * 0.5
    return _W_LOCATION * DISTRICTS[district]["score"] / 10


def _feature_points(listing: dict) -> float:
    pts = 0.0
    if listing.get("has_ebk"):
        pts += _W_FEATURES * 0.5
    if listing.get("has_balcony"):
        pts += _W_FEATURES * 0.3
    if not listing.get("is_befristet"):
        pts += _W_FEATURES * 0.2
    return pts


def score_listing(listing: dict) -> dict:
    money = assess_affordability(listing)
    where = commute(listing)

    breakdown = {
        "price":    round(_price_points(money["warmmiete"]), 1),
        "size":     round(_size_points(listing.get("size_sqm")), 1),
        "rooms":    round(_room_points(listing.get("rooms")), 1),
        "location": round(_location_points(listing.get("district")), 1),
        "features": round(_feature_points(listing), 1),
    }
    score = round(sum(breakdown.values()))

    blockers = list(money["blockers"])
    if REQUIREMENTS["wbs_required_is_blocker"] and listing.get("wbs_required"):
        blockers.append("Requires a Wohnberechtigungsschein (WBS) — not held.")
    if listing.get("is_tausch"):
        blockers.append("Tauschwohnung — needs a flat to swap.")

    if blockers:
        rec = "skip"
    elif score >= 75:
        rec = "apply_now"
    elif score >= 58:
        rec = "apply"
    elif score >= 45:
        rec = "backup"
    else:
        rec = "skip"

    return {
        "score": score,
        "breakdown": breakdown,
        "recommendation": rec,
        "blockers": blockers,
        "warnings": money["warnings"],
        "affordability": money,
        "commute": where,
    }
