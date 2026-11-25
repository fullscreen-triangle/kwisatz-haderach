"""
Garmin activities: list them, and download each one's ORIGINAL file (the FIT the watch wrote).

The daily-stats fetcher (garmin_fetch.py) asks for sleep, HRV and body battery, which a
Forerunner 45 barely records. The GPS tracks are in the *activities*, and they are what
trip estimation needs.

Usage (from repo root, with the same environment as garmin_fetch.py):
  python -m tools.health_tracker.garmin_activities --summary
  python -m tools.health_tracker.garmin_activities --download [--types walking,running,hiking]
                                                   [--since 2020-01-01] [--out DIR]

Files land in DIR (default <AGENT_SMITH_STATE>/walks, else ~/.agent-smith/walks):
  <activityId>.fit       the original recording
  index.json             one row per activity: id, type, start (UTC), seconds, metres, device
Recordings hold home and work locations. DIR is private state: never inside a repository.
Console output is counts only, so it can be shown or logged without disclosing a place.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
import zipfile
from collections import Counter
from pathlib import Path

DEFAULT_TYPES = ("walking", "running", "hiking", "casual_walking", "speed_walking",
                 "trail_running", "street_running", "track_running")


def _state_dir() -> Path:
    state = os.environ.get("AGENT_SMITH_STATE")
    return Path(state) if state else Path.home() / ".agent-smith"


def _client():
    try:
        from garminconnect import Garmin
    except ImportError:
        sys.exit("garminconnect not installed — pip install garminconnect")
    email, password = os.environ.get("GARMIN_EMAIL"), os.environ.get("GARMIN_PASSWORD")
    if not email or not password:
        sys.exit("GARMIN_EMAIL and GARMIN_PASSWORD not set in environment")
    tokenstore = os.environ.get("GARMINTOKENS") or str(_state_dir() / "garmin")
    g = Garmin(email, password)
    needs_mfa, _ = g.login(tokenstore)  # resumes the keeper's session; password only if rejected
    if needs_mfa:
        sys.exit("Garmin wants an MFA code — log in once interactively")
    return g


def all_activities(g, page: int = 100) -> list[dict]:
    """Every activity on the account, newest first."""
    out, start = [], 0
    while True:
        batch = g.get_activities(start, page) or []
        out.extend(batch)
        if len(batch) < page:
            return out
        start += page
        time.sleep(0.5)


def _type(a: dict) -> str:
    return ((a.get("activityType") or {}).get("typeKey") or "unknown").lower()


def _row(a: dict) -> dict:
    return {
        "id": a.get("activityId"),
        "type": _type(a),
        "start_utc": a.get("startTimeGMT"),
        "seconds": a.get("duration"),
        "metres": a.get("distance"),
        "device_id": a.get("deviceId"),
        "has_gps": bool(a.get("hasPolyline") or a.get("startLatitude") is not None),
    }


def summary(acts: list[dict]) -> dict:
    rows = [_row(a) for a in acts]
    years = Counter((r["start_utc"] or "?")[:4] for r in rows)
    return {
        "activities": len(rows),
        "with_gps": sum(r["has_gps"] for r in rows),
        "by_type": dict(Counter(r["type"] for r in rows).most_common()),
        "by_year": dict(sorted(years.items())),
        "devices": len({r["device_id"] for r in rows}),
        "first": min((r["start_utc"] for r in rows if r["start_utc"]), default=None),
        "last": max((r["start_utc"] for r in rows if r["start_utc"]), default=None),
    }


def _fit_from_zip(blob: bytes) -> bytes | None:
    try:
        with zipfile.ZipFile(io.BytesIO(blob)) as z:
            names = [n for n in z.namelist() if n.lower().endswith(".fit")]
            return z.read(names[0]) if names else None
    except zipfile.BadZipFile:
        return blob if blob[8:12] == b".FIT" else None


def download(g, acts: list[dict], out: Path, types: set[str], since: str | None) -> dict:
    out.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(out, 0o700)
    except OSError:
        pass
    index_path = out / "index.json"
    index = {r["id"]: r for r in json.loads(index_path.read_text())} if index_path.exists() else {}
    from garminconnect import Garmin

    got = skipped = failed = 0
    for a in acts:
        r = _row(a)
        if r["type"] not in types or not r["has_gps"]:
            continue
        if since and (r["start_utc"] or "") < since:
            continue
        path = out / f"{r['id']}.fit"
        if path.exists():
            skipped += 1
            index[r["id"]] = r
            continue
        try:
            fit = _fit_from_zip(g.download_activity(str(r["id"]), dl_fmt=Garmin.ActivityDownloadFormat.ORIGINAL))
        except Exception:  # one bad activity must not stop the rest
            fit = None
        if fit is None:
            failed += 1
            continue
        path.write_bytes(fit)
        index[r["id"]] = r
        got += 1
        time.sleep(0.5)  # Garmin throttles bursts
    rows = sorted(index.values(), key=lambda r: r["start_utc"] or "")
    index_path.write_text(json.dumps(rows, indent=1))
    return {"downloaded": got, "already_there": skipped, "failed": failed, "in_index": len(rows)}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--summary", action="store_true")
    p.add_argument("--download", action="store_true")
    p.add_argument("--types", default=",".join(DEFAULT_TYPES))
    p.add_argument("--since")
    p.add_argument("--out", type=Path)
    a = p.parse_args()
    g = _client()
    acts = all_activities(g)
    if a.summary or not a.download:
        print(json.dumps(summary(acts), indent=1))
    if a.download:
        out = a.out or _state_dir() / "walks"
        print(json.dumps(download(g, acts, out, set(a.types.split(",")), a.since), indent=1))


if __name__ == "__main__":
    main()
