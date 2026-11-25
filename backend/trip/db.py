"""
DB journeys (the db-rest API) mapped to estimator legs. Unlike the desk's travel search,
walking legs are kept: they are where generic estimates go most wrong.

The public instance v6.db.transport.rest no longer resolves (checked 2026-11-24). Set
TRIP_DB_API to a db-rest instance (e.g. a self-hosted one on 127.0.0.1); the default is
kept so the error says what is missing.
"""

from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request

API = os.getenv("TRIP_DB_API", "https://v6.db.transport.rest").rstrip("/")
_POINT = re.compile(r"^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$")


def _place(prefix: str, value: str) -> dict:
    """A station id, or `lat,lon` for an address point."""
    m = _POINT.match(value)
    if m:
        return {f"{prefix}.latitude": m.group(1), f"{prefix}.longitude": m.group(2),
                f"{prefix}.address": "point"}
    return {prefix: value}


def fetch_journeys(frm: str, to: str, departure: str | None = None, arrival: str | None = None,
                   results: int = 4, timeout: float = 15.0) -> list[dict]:
    q = {**_place("from", frm), **_place("to", to), "results": results,
         "stopovers": "false", "remarks": "false"}
    if arrival:
        q["arrival"] = arrival
    elif departure:
        q["departure"] = departure
    req = urllib.request.Request(f"{API}/journeys?{urllib.parse.urlencode(q)}",
                                 headers={"User-Agent": "agent-smith-trip/1"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read()).get("journeys", [])


def _lonlat(p: dict | None) -> tuple[float, float] | None:
    if not p:
        return None
    loc = p.get("location") or p
    la, lo = loc.get("latitude"), loc.get("longitude")
    return (lo, la) if la is not None and lo is not None else None


def _minutes_between(a: str | None, b: str | None) -> float | None:
    from datetime import datetime
    if not a or not b:
        return None
    f = lambda s: datetime.fromisoformat(s.replace("Z", "+00:00"))
    return round((f(b) - f(a)).total_seconds() / 60, 1)


def to_legs(journey: dict) -> list[dict]:
    legs = []
    for l in journey.get("legs", []):
        if l.get("walking"):
            a, b = _lonlat(l.get("origin")), _lonlat(l.get("destination"))
            leg = {"kind": "walk",
                   "planned_minutes": _minutes_between(l.get("plannedDeparture") or l.get("departure"),
                                                       l.get("plannedArrival") or l.get("arrival"))}
            if l.get("distance") is not None:
                leg["distance_m"] = l["distance"]
            if a and b:
                leg["coords"] = [a, b]
            if "distance_m" in leg or "coords" in leg:
                legs.append(leg)
            continue
        legs.append({
            "kind": "transit",
            "line": (l.get("line") or {}).get("name"),
            "from": (l.get("origin") or {}).get("name"),
            "to": (l.get("destination") or {}).get("name"),
            "planned_departure": l.get("plannedDeparture") or l.get("departure"),
            "planned_arrival": l.get("plannedArrival") or l.get("arrival"),
            "departure_delay_s": l.get("departureDelay"),
            "arrival_delay_s": l.get("arrivalDelay"),
        })
    return legs


def first_point(journey: dict) -> tuple[float, float] | None:
    for l in journey.get("legs", []):
        p = _lonlat(l.get("origin"))
        if p:
            return p
    return None
