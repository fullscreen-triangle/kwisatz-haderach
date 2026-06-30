import subprocess
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

router = APIRouter()
ROOT = Path(__file__).parent.parent.parent


def _run_tool(module: str, timeout: int = 30) -> dict:
    result = subprocess.run(
        ["python", "-m", module],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if result.returncode != 0:
        raise HTTPException(status_code=502, detail=result.stderr[:500])
    return json.loads(result.stdout)


@router.get("/garmin")
def garmin_data():
    """Fetch today's Garmin health stats."""
    return _run_tool("tools.health_tracker", timeout=60)


@router.get("/summary")
def health_summary():
    """Quick health summary for the desk landing panel."""
    data = _run_tool("tools.health_tracker", timeout=60)
    return {
        "sleep_hours": data.get("sleep", {}).get("duration_hours"),
        "hrv": data.get("hrv", {}).get("last_night"),
        "body_battery": data.get("body_battery", {}).get("current"),
        "steps": data.get("steps", {}).get("total"),
        "stress": data.get("stress", {}).get("avg"),
        "spo2": data.get("spo2", {}).get("avg"),
    }
