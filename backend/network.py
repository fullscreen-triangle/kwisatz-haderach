"""
The runtime network: everything in motion drawn as a city's transit map.

  U-Bahn  a project (tools/project_manager): its log entries are stations behind, its
          milestones stations ahead
  S-Bahn  a plan (backend/plans): each root node is a line, its descendants the stations
  Tram    an active repo (backend/repos): each pass that brought commits is a station
  Bus     mail commitments, one line per person the mail is with: action items, replies
          owed, meetings

A station ahead is placed at its own date if it has one, else at the moment the planner
has actually scheduled the work (the end of its last block), else it stays undated and
the map queues it after the line's last dated station. So the map is the plan, not a
second opinion about it.

Interchanges only come from links that exist: a plan node that `requires` a node on
another line, a project subtool that IS a tracked repo, and a mail or plan item that names
a repo (with "repo"/"github"/… beside it, or as owner/name) or a project by its full name.
No fuzzy similarity — a false interchange would send you the wrong way.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional

ROOT = Path(__file__).resolve().parent.parent
MAIL_DAYS = 21
REPO_DAYS = 60
MAX_BUS = 10


def _dt(iso: Optional[str]) -> Optional[datetime]:
    if not iso:
        return None
    try:
        d = datetime.fromisoformat(iso)
    except (TypeError, ValueError):
        return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def _iso(d: Optional[datetime]) -> Optional[str]:
    return d.isoformat() if d else None


class Line:
    def __init__(self, lid: str, mode: str, name: str, ref: Optional[dict] = None, sub: str = ""):
        self.id, self.mode, self.name, self.ref, self.sub = lid, mode, name, ref, sub
        self.stations: List[dict] = []
        self.subtools: List[dict] = []           # projects only: which may be tracked repos

    def station(self, local: str, title: str, at: Optional[datetime], *, done: bool = False,
                kind: str = "milestone", ref: Optional[dict] = None, placed: str = "dated",
                blocked: str = "", note: str = "", due: bool = False) -> dict:
        s = {"id": f"{self.id}:{local}", "title": title, "at": at, "done": done, "kind": kind,
             "ref": ref, "placed": placed if at else "queued", "blocked": blocked, "note": note, "due": due}
        self.stations.append(s)
        return s


def _schedule() -> dict:
    """What the planner has booked: task id / plan node -> last block end; pool title -> start."""
    from backend.planner.service import PLANNER
    by_task, by_plan, by_pool, events = {}, {}, {}, {}
    for b in PLANNER.plan.get("blocks", []):
        src, start, end = b.get("source") or {}, _dt(b.get("start")), _dt(b.get("end"))
        if b.get("kind") == "task" and src.get("task"):
            by_task[src["task"]] = max(end, by_task.get(src["task"], end))
        if src.get("type") == "plan" and src.get("ref"):
            by_plan[src["ref"]] = max(end, by_plan.get(src["ref"], end))
        if b.get("kind") == "pool":
            by_pool.setdefault(b.get("title", ""), start)
        if b.get("kind") == "fixed" and src.get("type") == "mail":
            events[(src.get("ref"), b.get("title"))] = start
    return {"task": by_task, "plan": by_plan, "pool": by_pool, "event": events}


# ----------------------------------------------------------------- the four kinds of line

def project_lines(sched: dict) -> List[Line]:
    try:
        data = json.loads((ROOT / "tools" / "project_manager" / "data" / "projects.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    lines = []
    for p in data.get("projects", []):
        ln = Line(f"project-{p['id']}", "U", p.get("name") or p["id"], {"kind": "project", "ref": p["id"]},
                  sub=(p.get("context") or "")[:120])
        ln.subtools = p.get("subtools", [])
        for i, e in enumerate(p.get("log", [])):
            d = e.get("date") or ""
            ln.station(f"log{i}", e.get("entry", "")[:90], _dt(f"{d}T12:00:00+02:00" if len(d) == 10 else d),
                       done=True, kind="log", ref={"kind": "project", "ref": p["id"]})
        for m in p.get("milestones", []):
            done = m.get("status") in ("done", "complete", "completed")
            at = _dt(m.get("done_at") or m.get("due") or m.get("date"))
            placed = "dated"
            if not at and not done:
                at = sched["pool"].get(f"Projects: {p.get('name')} — {m.get('title')}")
                placed = "scheduled"
            ln.station(m.get("id", m.get("title", "")), m.get("title", ""), at, done=done,
                       ref={"kind": "project", "ref": p["id"]}, placed=placed,
                       note=(m.get("layer") or "") + (" · in progress" if m.get("status") == "in_progress" else ""))
        lines.append(ln)
    return lines


def plan_lines(sched: dict) -> List[Line]:
    from backend.plans.model import blockers, when_span
    from backend.plans.store import PLANS
    from zoneinfo import ZoneInfo
    tz = ZoneInfo("Europe/Berlin")
    nodes = PLANS.nodes()
    kids: Dict[str, list] = {}
    for n in nodes.values():
        if n.parent in nodes:
            kids.setdefault(n.parent, []).append(n)
    lines = []
    for root in [n for n in nodes.values() if not n.parent or n.parent not in nodes]:
        if root.status == "dropped":
            continue
        ln = Line(f"plan-{root.id}", "S", root.title, {"kind": "plan", "ref": root.id}, sub=root.area)
        stack, order = [root], []
        while stack:
            n = stack.pop()
            order.append(n)
            stack.extend(reversed(sorted(kids.get(n.id, []), key=lambda k: k.created)))
        for n in order:
            if n.status == "dropped" or (n is root and kids.get(n.id)):
                continue                       # the root with children IS the line, not a stop
            span = when_span(n, tz)
            at, placed = (span[1] if span else None), "dated"
            if at is None and n.id in sched["plan"]:
                at, placed = sched["plan"][n.id], "scheduled"
            why = [] if n.status == "done" else blockers(n, nodes)
            ln.station(n.id, ("↻ " if n.every else "") + n.title, at, done=n.status == "done",
                       kind="habit" if n.every else ("milestone" if n.minutes is None else "work"),
                       ref={"kind": "plan", "ref": n.id}, placed=placed, blocked="; ".join(why)[:160],
                       note=n.notes[:120], due=bool(span))
            ln.stations[-1]["requires"] = [r for r in n.requires if r in nodes]
        if ln.stations:
            lines.append(ln)
    return lines


def repo_lines(now: datetime) -> List[Line]:
    """One tram per repo that moved in the last REPO_DAYS: a station per day with commits,
    read from `git log` in the node's clones (the pass history only starts when tracking did)."""
    from backend.repos import service as repos
    chi = {r["repo"]: r for r in repos.history()}              # latest record per repo wins
    lines = []
    for clone in sorted(p for p in repos.clones_dir().iterdir() if (p / ".git").exists()):
        r = repos._git(["log", f"--since={REPO_DAYS}.days", "--format=%cI%x1f%s", "--no-merges"], cwd=clone, timeout=60)
        days: Dict[str, list] = {}
        for row in (r.stdout or "").splitlines():
            when, _, subj = row.partition("")
            if when:
                days.setdefault(when[:10], []).append((when, subj))
        if not days:
            continue
        last = chi.get(clone.name, {})
        ln = Line(f"repo-{clone.name}", "T", clone.name, {"kind": "repo", "ref": clone.name},
                  sub=(f"χ {last['chi']}" if last.get("chi") is not None else ""))
        for day in sorted(days):
            commits = sorted(days[day])
            ln.station(day, f"{len(commits)} commit{'s' if len(commits) > 1 else ''} · {commits[-1][1]}"[:90],
                       _dt(commits[-1][0]), done=True, kind="commit", ref={"kind": "repo", "ref": clone.name},
                       note="; ".join(c[1] for c in commits[-4:])[:200])
        lines.append(ln)
    lines.sort(key=lambda l: l.stations[-1]["at"], reverse=True)   # most recently moved first
    return lines


def mail_lines(now: datetime, sched: dict) -> List[Line]:
    from backend.mail.service import MAIL
    rows = MAIL.store.list(since=(now - timedelta(days=MAIL_DAYS)).isoformat(), include_done=True, limit=400)
    people: Dict[str, dict] = {}
    for row in sorted(rows, key=lambda r: r["date"]):
        ex = row.get("extraction") or {}
        items = ex.get("action_items") or []
        evs = ex.get("events") or []
        owes = ex.get("needs_reply") and not row["owner"]
        if not (items or evs or owes):
            continue
        if row["owner"]:                                   # your mail: the line is whoever it went to
            m = MAIL.store.get_message(row["key"])
            addr, name = (m.to[0] if m and m.to else "sent"), ""
        else:
            addr, name = row["from_addr"] or row["from_name"], row["from_name"]
        p = people.setdefault(addr.strip().lower(), {"name": "", "rows": []})
        p["name"] = p["name"] or name
        p["rows"].append(row)
    for addr, p in people.items():
        p["name"] = p["name"] or addr
    ranked = sorted(people.values(), key=lambda p: (-sum(1 for r in p["rows"] if not r["done"]), p["name"]))
    lines = []
    for p in ranked[:MAX_BUS]:
        ln = Line(f"mail-{re.sub(r'[^a-z0-9]+', '-', p['name'].lower()).strip('-')[:40]}", "B", p["name"],
                  sub=f"{len(p['rows'])} emails")
        for row in p["rows"]:
            ex = row.get("extraction") or {}
            ref = {"kind": "mail", "ref": row["key"]}
            before = len(ln.stations)
            for i, a in enumerate(ex.get("action_items") or []):
                due = _dt(a.get("due"))
                at, placed = due, "dated"
                if not due:
                    at, placed = sched["task"].get(f"mail:{row['key']}:a{i}"), "scheduled"
                ln.station(f"{row['key']}:a{i}", a.get("title", ""), at, done=row["done"], kind="task", ref=ref,
                           placed=placed, note=row["subject"][:80], due=bool(due))
            for j, ev in enumerate(ex.get("events") or []):
                ln.station(f"{row['key']}:e{j}", ev.get("title") or row["subject"], _dt(ev.get("start")),
                           done=row["done"], kind="event", ref=ref, note=ev.get("location") or row["subject"][:80])
            if ex.get("needs_reply") and not row["owner"]:
                by = _dt(ex.get("reply_by")) or (_dt(row["date"]) + timedelta(days=2))
                ln.station(f"{row['key']}:r", f"reply: {row['subject']}"[:90], by, done=row["done"], kind="reply",
                           ref=ref, due=True)
            for st in ln.stations[before:]:
                st["subject"] = row["subject"]
        lines.append(ln)
    return lines


# ----------------------------------------------------------------- interchanges

REPO_CONTEXT = r"(?:repo|repository|github|git|crate|package|codebase)"


def _nearest(line: Line, at: Optional[datetime]) -> Optional[dict]:
    if not line.stations:
        return None
    if at is None:                                            # where the line is heading: its next open stop
        now = datetime.now(timezone.utc)
        open_ = [s for s in line.stations if not s["done"]]
        ahead = sorted((s for s in open_ if s["at"] and s["at"] >= now), key=lambda s: s["at"])
        return (ahead or open_ or line.stations)[0 if (ahead or open_) else -1]
    dated = [s for s in line.stations if s["at"]]
    if not dated:
        return line.stations[0]
    return min(dated, key=lambda s: abs((s["at"] - at).total_seconds()))


def transfers(lines: List[Line]) -> List[dict]:
    out, seen = [], set()
    by_station = {s["id"].split(":", 1)[1]: (ln, s) for ln in lines if ln.mode == "S" for s in ln.stations}
    repos = {ln.name.lower(): ln for ln in lines if ln.mode == "T"}
    projects = [ln for ln in lines if ln.mode == "U"]

    def add(a: dict, b: dict, why: str):
        k = tuple(sorted((a["id"], b["id"])))
        if k in seen or a is b:
            return
        seen.add(k)
        out.append({"a": a["id"], "b": b["id"], "why": why})

    for ln in lines:                                           # plan requires across lines
        for s in ln.stations:
            for r in s.get("requires", []):
                other = by_station.get(r)
                if other and other[0] is not ln:
                    add(s, other[1], "requires")
    for p in projects:                                         # a subtool that is a tracked repo
        for st in p.subtools:
            names = {st.get("id", "").lower(), (st.get("repo") or "").split("/")[-1].lower()}
            for n in names:
                if n and n in repos:
                    a, b = _nearest(p, None), _nearest(repos[n], None)
                    if a and b:
                        add(a, b, f"subtool {st.get('name') or n}")
    for ln in lines:                                           # mail / plan items that name a repo or project
        if ln.mode not in ("B", "S"):
            continue
        for s in ln.stations:
            text = f"{s['title']} {s.get('note', '')}".lower()
            for name, rl in repos.items():
                if len(name) < 4:
                    continue
                pat = (rf"(?:[\w.-]+/{re.escape(name)}\b|\b{re.escape(name)}\b.{{0,40}}\b{REPO_CONTEXT}\b|"
                       rf"\b{REPO_CONTEXT}\b.{{0,40}}\b{re.escape(name)}\b)")
                if re.search(pat, text):
                    b = _nearest(rl, s["at"])
                    if b:
                        add(s, b, f"mentions {rl.name}")
            for p in projects:
                if len(p.name) >= 8 and p.name.lower() in text:
                    b = _nearest(p, s["at"])
                    if b:
                        add(s, b, f"mentions {p.name}")
    buses = [ln for ln in lines if ln.mode == "B"]
    thread: Dict[str, list] = {}                              # one email thread on several people's lines
    for ln in buses:
        for s in ln.stations:
            subj = _thread(s.get("subject", ""))
            if subj:
                thread.setdefault(subj, []).append((ln, s))
    for subj, hits in thread.items():
        per_line: Dict[str, tuple] = {}
        for ln, s in hits:
            per_line.setdefault(ln.id, (ln, s))
        pairs = list(per_line.values())
        for (l1, s1), (l2, s2) in zip(pairs, pairs[1:]):
            add(s1, s2, f"same thread: {subj[:50]}")
    for p in projects:                                         # a correspondent named in the project itself
        text = _fold(" ".join([p.sub] + [f"{t.get('name', '')} {t.get('role', '')}" for t in p.subtools]))
        for ln in buses:
            tokens = [t for t in re.findall(r"[a-z]+", _fold(ln.name)) if len(t) >= 4 and t not in _NAME_NOISE]
            if any(re.search(rf"\b{t}\b", text) for t in tokens):
                a, b = _nearest(p, None), _nearest(ln, None)
                if a and b:
                    add(a, b, f"{ln.name} is part of {p.name}")
    return out


_NAME_NOISE = {"admin", "team", "info", "noreply", "mail", "support", "university", "universitat", "greifswald"}


def _fold(s: str) -> str:
    s = (s or "").lower().translate(str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"}))
    return s


def _thread(subject: str) -> str:
    s = re.sub(r"^\s*((re|aw|fw|fwd|wg|antw)\s*:\s*)+", "", (subject or "").strip(), flags=re.I)
    return s.strip().lower() if len(s.strip()) >= 6 else ""


# ----------------------------------------------------------------- assembly

def build() -> dict:
    now = datetime.now(timezone.utc)
    sched = _schedule()
    lines: List[Line] = []
    errors = []
    for make in (lambda: project_lines(sched), lambda: plan_lines(sched), lambda: repo_lines(now),
                 lambda: mail_lines(now, sched)):
        try:
            lines += make()
        except Exception as e:                                 # one broken source must not blank the map
            errors.append(f"{type(e).__name__}: {str(e)[:120]}")
    counters: Dict[str, int] = {}
    out_lines = []
    for ln in lines:
        counters[ln.mode] = counters.get(ln.mode, 0) + 1
        far = datetime.max.replace(tzinfo=timezone.utc)
        seq = sorted(enumerate(ln.stations),
                     key=lambda iv: (iv[1]["at"] is None, iv[1]["at"] or far, iv[0]))
        stations, nxt = [], None
        for _, s in seq:
            if s["done"]:
                state = "past"
            elif s["blocked"]:
                state = "blocked"
            elif s["at"] and s["at"] < now and s["due"]:
                state = "late"
            elif s["at"] and s["at"] < now:
                state = "past" if s["kind"] in ("event", "commit", "origin", "log") else "due"
            else:
                state = "future"
            if nxt is None and state in ("future", "due", "late", "blocked"):
                nxt, state = s["id"], ("next" if state == "future" else state)
            stations.append({**{k: v for k, v in s.items() if k not in ("due",)}, "at": _iso(s["at"]),
                             "state": state})
        done = sum(1 for s in stations if s["state"] == "past")
        out_lines.append({"id": ln.id, "mode": ln.mode, "code": f"{ln.mode}{counters[ln.mode]}", "name": ln.name,
                          "sub": ln.sub, "ref": ln.ref, "stations": stations, "next": nxt,
                          "progress": [done, len(stations)]})
    return {"now": now.isoformat(), "lines": out_lines, "transfers": transfers(lines), "errors": errors}
