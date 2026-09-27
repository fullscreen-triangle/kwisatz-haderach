"""
Everything the solver plans with, gathered fresh on every re-plan:

  mail      extracted action items -> tasks; "needs reply" -> a 15-min reply task;
            extracted events -> fixed blocks (tentative when the time was only proposed)
  todos     tools/document_tracker/data/todos.json -> tasks
  pools     projects.json milestones and the job pipeline name what a pool block is *for*
  sleep     the Garmin sleep cache (last 7 nights) -> bedtime/wake, else settings

Google Calendar busy time comes from gcal.py (cached by the service, since it's remote).
"""

from __future__ import annotations

import hashlib
import json
import statistics
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from backend.mail.extract import _when
from backend.planner.model import Block, Task

ROOT = Path(__file__).resolve().parent.parent.parent


def _read_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def mail_inputs(rows: List[dict], now: datetime, settings: dict) -> Tuple[List[Task], List[Block]]:
    """rows = MailStore.extracted_since(...). Stale work drops out: an action item whose
    deadline passed more than 3 days ago, or an undated one older than stale_task_days."""
    work_accounts = set(settings["workday"].get("accounts") or [])
    stale = now - timedelta(days=int(settings.get("stale_task_days", 21)))
    tasks: List[Task] = []
    fixed: Dict[tuple, Block] = {}
    for row in rows:
        if row["done"]:
            continue
        ex, key = row["extraction"] or {}, row["key"]
        sent = datetime.fromisoformat(row["date"])
        src = {"type": "mail", "ref": key, "account": row["account"], "subject": row["subject"]}
        work = row["account"] in work_accounts
        for i, a in enumerate(ex.get("action_items") or []):
            due = _when(a.get("due"))
            if (due and due < now - timedelta(days=3)) or (not due and sent < stale):
                continue
            tasks.append(Task(id=f"mail:{key}:a{i}", title=a["title"], minutes=int(a.get("estimated_minutes") or 30),
                              due=due, priority=a.get("priority") or "normal", work=work, source=src))
        if ex.get("needs_reply") and not row["owner"]:
            due = _when(ex.get("reply_by")) or sent + timedelta(days=2)
            if due >= now - timedelta(days=3):
                who = row["from_name"] or row["from_addr"]
                tasks.append(Task(id=f"mail:{key}:reply", title=f"Reply to {who}: {row['subject']}", minutes=15,
                                  due=due, priority="normal", work=work, source=src))
        for ev in ex.get("events") or []:
            start = _when(ev.get("start"))
            if not start:
                continue
            end = _when(ev.get("end")) or start + timedelta(hours=1)
            if end <= start:
                end = start + timedelta(hours=1)
            if end <= now:
                continue
            dedup = ((ev.get("title") or "").strip().lower(), start)
            if dedup in fixed:                     # invite + reminder for one meeting
                continue
            bid = "mail-" + hashlib.sha1(f"{key}|{ev.get('title')}|{start.isoformat()}".encode()).hexdigest()[:12]
            fixed[dedup] = Block(id=bid, start=start, end=end, kind="fixed",
                                 title=ev.get("title") or row["subject"],
                                 source={**src, "location": ev.get("location", "")},
                                 tentative=not ev.get("confirmed", False))
    return tasks, list(fixed.values())


def todo_tasks(now: datetime, tz) -> List[Task]:
    data = _read_json(ROOT / "tools" / "document_tracker" / "data" / "todos.json", [])
    items = data.get("todos", []) if isinstance(data, dict) else data
    out = []
    for t in items if isinstance(items, list) else []:
        if t.get("done") or not t.get("text"):
            continue
        due = None
        if t.get("due"):
            try:
                d = datetime.fromisoformat(str(t["due"]))
                due = d if d.tzinfo else datetime.combine(d.date(), time(18, 0), tzinfo=tz)
            except ValueError:
                due = None
        minutes = {"high": 60, "normal": 30, "low": 30}.get(t.get("priority"), 30)
        out.append(Task(id=f"todo:{t.get('id')}", title=t["text"], minutes=minutes, due=due,
                        priority=t.get("priority") or "normal",
                        source={"type": "todo", "ref": str(t.get("id"))}))
    return out


def pool_items() -> Dict[str, List[str]]:
    items: Dict[str, List[str]] = {}
    projects = _read_json(ROOT / "tools" / "project_manager" / "data" / "projects.json", {})
    ms = []
    for p in projects.get("projects", []) if isinstance(projects, dict) else []:
        for m in p.get("milestones", []):
            if m.get("status") in ("in_progress", "todo"):
                ms.append((0 if m["status"] == "in_progress" else 1, f"{p.get('name')} — {m.get('title')}"))
    if ms:
        items["projects"] = [t for _, t in sorted(ms)]
    jobs = _read_json(ROOT / "tools" / "job_assistant" / "output" / "index.json", [])
    active = [j for j in jobs if isinstance(j, dict) and j.get("status") not in ("rejected", "withdrawn")]
    names = [f"{j.get('company', '')}: {j.get('title', '')}".strip(": ") for j in active]
    if any(names):
        items["jobs"] = [n for n in names if n]
    return items


def sleep_window(settings: dict) -> Optional[Tuple[time, time]]:
    """Mean bedtime / wake over the last 7 cached Garmin nights, rounded to 5 minutes.
    Garmin's *Local timestamps are local wall-clock milliseconds encoded as if UTC."""
    if not settings["sleep"].get("from_garmin"):
        return None
    beds, wakes = [], []
    for f in sorted((ROOT / "tools" / "health_tracker" / "data").glob("garmin_*.json"))[-7:]:
        s = (_read_json(f, {}) or {}).get("sleep") or {}
        if not s.get("start_time") or not s.get("end_time"):
            continue
        b = datetime.fromtimestamp(s["start_time"] / 1000, timezone.utc)
        w = datetime.fromtimestamp(s["end_time"] / 1000, timezone.utc)
        hours = (w - b).total_seconds() / 3600
        if not 4 <= hours <= 12:
            continue
        bm = b.hour * 60 + b.minute
        beds.append(bm + 1440 if bm < 720 else bm)      # after-midnight bedtimes count late
        wakes.append(w.hour * 60 + w.minute)
    if len(beds) < 3:
        return None

    def hm(mins: float) -> time:
        m = int(round(mins / 5) * 5) % 1440
        return time(m // 60, m % 60)

    return hm(statistics.mean(beds)), hm(statistics.mean(wakes))
