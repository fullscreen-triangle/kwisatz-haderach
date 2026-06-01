"""
Garmin health data fetcher using the unofficial garminconnect library.

Usage (from repo root):
  python -m tools.health_tracker.garmin_fetch --today
  python -m tools.health_tracker.garmin_fetch --days 7

Outputs JSON to stdout. Credentials read from environment:
  GARMIN_EMAIL   GARMIN_PASSWORD
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date, timedelta
from pathlib import Path

try:
    from garminconnect import Garmin, GarminConnectConnectionError, GarminConnectAuthenticationError
except ImportError:
    print(json.dumps({"error": "garminconnect not installed — run: pip install garminconnect"}))
    sys.exit(1)

CACHE_DIR = Path(__file__).parent / "data"
CACHE_DIR.mkdir(exist_ok=True)


def _cache_path(day: str) -> Path:
    return CACHE_DIR / f"garmin_{day}.json"


def _is_fresh(path: Path, max_age_seconds: int = 3600) -> bool:
    if not path.exists():
        return False
    return (Path().stat().st_mtime - path.stat().st_mtime) < max_age_seconds


def fetch_day(client: Garmin, day: date) -> dict:
    iso = day.isoformat()
    cache = _cache_path(iso)

    # Use cache unless it's today (re-fetch every hour)
    if cache.exists():
        if day < date.today() or _is_fresh(cache):
            return json.loads(cache.read_text())

    result: dict = {"date": iso}

    # Sleep
    try:
        sleep = client.get_sleep_data(iso)
        if sleep and "dailySleepDTO" in sleep:
            dto = sleep["dailySleepDTO"]
            result["sleep"] = {
                "duration_seconds":  dto.get("sleepTimeSeconds"),
                "deep_seconds":      dto.get("deepSleepSeconds"),
                "light_seconds":     dto.get("lightSleepSeconds"),
                "rem_seconds":       dto.get("remSleepSeconds"),
                "awake_seconds":     dto.get("awakeSleepSeconds"),
                "score":             dto.get("sleepScores", {}).get("overall", {}).get("value"),
                "start_time":        dto.get("sleepStartTimestampLocal"),
                "end_time":          dto.get("sleepEndTimestampLocal"),
            }
    except Exception as e:
        result["sleep_error"] = str(e)

    # HRV
    try:
        hrv = client.get_hrv_data(iso)
        if hrv and "hrvSummary" in hrv:
            s = hrv["hrvSummary"]
            result["hrv"] = {
                "weekly_avg":  s.get("weeklyAvg"),
                "last_night":  s.get("lastNight"),
                "status":      s.get("status"),
                "feedback":    s.get("feedbackPhrase"),
            }
    except Exception as e:
        result["hrv_error"] = str(e)

    # Body battery
    try:
        bb = client.get_body_battery_data(iso)
        if bb:
            charged = bb[0].get("charged") if isinstance(bb, list) and bb else None
            drained = bb[0].get("drained") if isinstance(bb, list) and bb else None
            result["body_battery"] = {"charged": charged, "drained": drained, "data": bb}
    except Exception as e:
        result["body_battery_error"] = str(e)

    # Stats (steps, calories, active minutes)
    try:
        stats = client.get_stats(iso)
        if stats:
            result["activity"] = {
                "steps":               stats.get("totalSteps"),
                "step_goal":           stats.get("dailyStepGoal"),
                "active_calories":     stats.get("activeKilocalories"),
                "resting_hr":          stats.get("restingHeartRate"),
                "avg_stress":          stats.get("averageStressLevel"),
                "max_stress":          stats.get("maxStressLevel"),
                "floors_ascended":     stats.get("floorsAscended"),
                "moderately_active":   stats.get("moderateIntensityMinutes"),
                "vigorously_active":   stats.get("vigorousIntensityMinutes"),
            }
    except Exception as e:
        result["activity_error"] = str(e)

    # SPO2
    try:
        spo2 = client.get_spo2_data(iso)
        if spo2 and "averageSpO2" in spo2:
            result["spo2"] = {
                "average": spo2.get("averageSpO2"),
                "lowest":  spo2.get("lowestSpO2"),
            }
    except Exception as e:
        pass  # SPO2 not available on all devices

    cache.write_text(json.dumps(result, indent=2))
    return result


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--today",  action="store_true")
    parser.add_argument("--days",   type=int, default=1)
    parser.add_argument("--date",   type=str, help="ISO date YYYY-MM-DD")
    args = parser.parse_args()

    email    = os.environ.get("GARMIN_EMAIL")
    password = os.environ.get("GARMIN_PASSWORD")

    if not email or not password:
        print(json.dumps({"error": "GARMIN_EMAIL and GARMIN_PASSWORD not set in environment"}))
        sys.exit(1)

    try:
        client = Garmin(email, password)
        client.login()
    except GarminConnectAuthenticationError as e:
        print(json.dumps({"error": f"Garmin authentication failed: {e}"}))
        sys.exit(1)
    except GarminConnectConnectionError as e:
        print(json.dumps({"error": f"Garmin connection error: {e}"}))
        sys.exit(1)

    if args.date:
        days = [date.fromisoformat(args.date)]
    elif args.today:
        days = [date.today()]
    else:
        days = [date.today() - timedelta(days=i) for i in range(args.days)]

    results = [fetch_day(client, d) for d in days]
    print(json.dumps(results if len(results) > 1 else results[0]))


if __name__ == "__main__":
    main()
