"""
Planner settings — <state>/planner/settings.json, editable from the plan page.

Pools are the "scenes" that share whatever time deadlines and fixed events leave free.
Each pool's return on time is modelled as concave, w·log(1 + t/τ): weight w is how much
the pool matters, τ how long before its returns start flattening. Concavity is what makes
the water-filling split optimal (split-attention paper, thm:waterfill) — with convex
returns you would instead pour everything into one pool.
"""

from __future__ import annotations

import copy
import json
from pathlib import Path

DEFAULTS = {
    "timezone": "Europe/Berlin",
    "horizon_days": 7,
    "grid_minutes": 5,
    "min_block": 30,            # shorter leftovers become transition buffers
    "max_block": 120,           # a pool/task chunk never runs longer than this
    "break_after": 50,          # a work chunk at least this long is followed by…
    "break_minutes": 10,        # …a break of this length (when there's room)
    "freeze_minutes": 60,       # re-plans never move anything starting sooner than this
    "sleep": {"start": "23:30", "end": "07:00", "from_garmin": True},
    "meals": [
        {"title": "Breakfast", "at": "07:15", "minutes": 30},
        {"title": "Lunch", "at": "12:30", "minutes": 45},
        {"title": "Dinner", "at": "19:00", "minutes": 45},
    ],
    # Employed hours. Mail from the `accounts` listed is work and is scheduled inside;
    # whatever work tasks leave free stays a plain work block. Pools fill the rest.
    "workday": {"enabled": True, "title": "NFDI4Cat", "start": "09:00", "end": "17:00",
                "days": [0, 1, 2, 3, 4], "accounts": ["uni"]},
    "pools": [
        {"id": "projects", "title": "Projects", "weight": 3.0, "tau": 60},
        {"id": "research", "title": "Research writing", "weight": 3.0, "tau": 90},
        {"id": "jobs", "title": "Job applications", "weight": 2.0, "tau": 45},
        {"id": "learning", "title": "Reading & learning", "weight": 1.5, "tau": 45},
        {"id": "health", "title": "Training & recovery", "weight": 1.5, "tau": 45, "work": False},
        {"id": "admin", "title": "Admin", "weight": 1.0, "tau": 30},
        {"id": "rest", "title": "Rest", "weight": 1.0, "tau": 30, "work": False},
    ],
    "stale_task_days": 21,      # an undated mail task older than this leaves the plan
}


def _merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        out[k] = _merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def load(path: Path) -> dict:
    try:
        return _merge(DEFAULTS, json.loads(path.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        return copy.deepcopy(DEFAULTS)


def validate(s: dict) -> dict:
    """Reject settings that would make the solver nonsense; normalise the rest."""
    s = _merge(DEFAULTS, s)
    if not s["pools"]:
        raise ValueError("at least one pool is needed to fill free time")
    ids = [p["id"] for p in s["pools"]]
    if len(ids) != len(set(ids)):
        raise ValueError("pool ids must be unique")
    for p in s["pools"]:
        p["weight"] = max(0.0, float(p.get("weight", 1)))
        p["tau"] = max(5.0, float(p.get("tau", 30)))
        p["title"] = str(p.get("title") or p["id"])
    for k in ("grid_minutes", "min_block", "max_block", "horizon_days"):
        s[k] = int(s[k])
    if not (1 <= s["grid_minutes"] <= 30 and s["min_block"] <= s["max_block"] and 1 <= s["horizon_days"] <= 14):
        raise ValueError("grid/min/max/horizon out of range")
    return s


def save(path: Path, s: dict) -> dict:
    s = validate(s)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(s, indent=2), encoding="utf-8")
    tmp.replace(path)
    return s
