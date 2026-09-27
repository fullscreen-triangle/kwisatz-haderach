"""
The console's feed and reader.

build()   one time-ordered list of what moved: agent runs, mail worth attention (bulk and
          spam left out), notes and drafts, repo changes, credential trouble — each item
          {id, at, kind, title, sub, state, ref}. The plan's now/next/at-risk ride along
          separately (they are about the present, not a moment in the past).
version() a tuple of every source's change counter; the SSE stream pushes when it moves.
read()    any item in full, as markdown, with `read:` links (kind/ref) the console opens
          in place — so an email links to its attachments, a run to the mail it cited.
"""

from __future__ import annotations

import asyncio
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

QUIET = {"newsletter", "spam", "notification"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def version() -> tuple:
    from backend.agents import notes
    from backend.agents.service import AGENTS
    from backend.keeper.service import KEEPER
    from backend.mail.service import MAIL
    from backend.planner.service import PLANNER
    from backend.repos.service import REPOS
    return (AGENTS.version, MAIL.version, PLANNER.version, KEEPER.version, REPOS.version, notes.version())


def build(limit: int = 80) -> dict:
    from backend.agents import notes
    from backend.agents.service import AGENTS
    from backend.keeper.service import KEEPER
    from backend.mail.service import MAIL
    from backend.planner.service import PLANNER
    from backend.repos import service as repos

    items = []
    for r in AGENTS.recent(25):
        first = [re.sub(r"^[#>*\-\s]+|[*_`]", "", l).strip()      # first readable line, markdown stripped
                 for l in (r["answer"] or r["error"] or "").splitlines()]
        first = [l for l in first if l and l.lower() not in ("summary", "answer")]
        items.append({"id": f"run:{r['id']}", "at": r["updated"], "kind": "run", "ref": r["id"],
                      "title": r["text"], "state": r["status"],
                      "sub": (first[0][:140] if first else {"planning": "planning…", "running": "agents working…"}.get(r["status"], ""))
                             + (f" · {r['brain']}" if r["brain"] else "")})
    since = (_now() - timedelta(days=14)).isoformat()
    for m in MAIL.store.list(limit=60, include_done=False, since=since):
        ex = m["extraction"] or {}
        if ex.get("category") in QUIET or (m["bulk"] and not ex):
            continue
        acts = len(ex.get("action_items") or []) + len(ex.get("events") or [])
        items.append({"id": f"mail:{m['key']}", "at": m["date"], "kind": "mail", "ref": m["key"],
                      "title": m["subject"] or "(no subject)",
                      "sub": f"{m['from_name'] or m['from_addr']} · " + (ex.get("summary") or ("reading…" if m["status"] == "pending" else m["preview"][:120])),
                      "state": "action" if (ex.get("needs_reply") or acts) else "read" if ex else "pending",
                      "account": m["account"]})
    for n in notes.list_notes(15):
        items.append({"id": f"note:{n['id']}", "at": n["created"], "kind": n["kind"], "ref": n["id"],
                      "title": n["title"], "sub": "reply draft — not sent" if n["kind"] == "draft" else "note",
                      "state": n["kind"]})
    week = (_now() - timedelta(days=7)).isoformat()
    for rec in repos.history(since=week):
        moved = (rec.get("commits") or 0) > 0 or (rec.get("chi_delta") not in (None, 0))
        if not moved:
            continue
        d = rec.get("chi_delta")
        items.append({"id": f"repo:{rec['repo']}:{rec['ts']}", "at": rec["ts"], "kind": "repo", "ref": rec["repo"],
                      "title": f"{rec['repo']}: {rec.get('commits', 0)} commit{'s' if rec.get('commits') != 1 else ''}",
                      "sub": "; ".join((rec.get("subjects") or [])[:2])
                             + (f" · χ {'+' if d > 0 else ''}{d:.2f}" if isinstance(d, (int, float)) and d else ""),
                      "state": "moved"})
    for row in KEEPER.snapshot()["credentials"]:
        if row["state"] in ("dead", "expired", "soon"):
            items.append({"id": f"key:{row['id']}", "at": row.get("last_checked") or _now().isoformat(),
                          "kind": "key", "ref": row["id"], "title": f"{row['title']} credential {row['state']}",
                          "sub": row["detail"][:140], "state": row["state"]})
    items.sort(key=lambda i: i["at"] or "", reverse=True)
    plan = PLANNER.snapshot()
    return {"version": list(version()), "items": items[:limit],
            "now": plan.get("now"), "next": plan.get("next"), "at_risk": plan.get("at_risk", [])}


def _ts(iso: str) -> str:
    try:
        return datetime.fromisoformat(iso).astimezone().strftime("%a %d %b %Y, %H:%M")
    except (TypeError, ValueError):
        return iso or ""


async def read(kind: str, ref: str) -> Optional[dict]:
    from backend.agents import notes
    from backend.agents.service import AGENTS
    from backend.mail import attachments
    from backend.mail.service import MAIL
    from backend.repos import service as repos

    if kind == "mail":
        m = MAIL.store.get_message(ref)
        if m is None:
            return None
        ex = (MAIL.store.extraction(ref) or {}).get("data") or {}
        try:
            atts = await attachments.ensure(ref)
        except Exception:
            atts = attachments.listing(ref) or []
        md = [f"**From** {m.from_name} &lt;{m.from_addr}&gt;  \n**Date** {_ts(m.date.isoformat())} · {m.account}"
              + (" · sent" if m.folder == "Sent" else "")]
        if ex.get("summary"):
            md.append(f"> {ex['summary']}")
        if ex.get("action_items"):
            md.append("### To do\n" + "\n".join(f"- {a['title']}" + (f" — due {_ts(a['due'])}" if a.get("due") else "")
                                                + f" ({a.get('estimated_minutes', '?')} min)" for a in ex["action_items"]))
        if ex.get("events"):
            md.append("### Dates\n" + "\n".join(f"- {e['title']} — {_ts(e['start'])}"
                                                + (f", {e['location']}" if e.get("location") else "") for e in ex["events"]))
        if atts:
            md.append("### Attachments\n" + "\n".join(f"- [{a['name']}](read:attachment/{ref}/{a['n']}) "
                                                      f"({a['size'] // 1024} KB)" for a in atts))
        md.append("---\n\n" + m.text)
        return {"kind": kind, "ref": ref, "title": m.subject or "(no subject)", "markdown": "\n\n".join(md),
                "actions": ["reply", "done", "summarize"]}

    if kind == "attachment":
        key, _, n = ref.rpartition("/")
        meta = next((a for a in (attachments.listing(key) or []) if str(a["n"]) == n), None)
        if meta is None:
            return None
        summ = attachments.summary(key, int(n))
        body = attachments.text(key, int(n)) or "*(this file has no extractable text)*"
        md = ([f"### Summary\n\n{summ}", "---"] if summ else []) + [body]
        return {"kind": kind, "ref": ref, "title": meta["name"], "markdown": "\n\n".join(md),
                "actions": [] if summ else ["summarize"], "parent": key}

    if kind in ("note", "draft"):
        n = notes.get(ref)
        if n is None:
            return None
        head = f"*Reply draft — not sent. Copy it into your mail program to use it.*\n\n" if n["kind"] == "draft" else ""
        return {"kind": n["kind"], "ref": ref, "title": n["title"], "markdown": head + n["body"],
                "actions": ["copy"]}

    if kind == "run":
        run = AGENTS.get(ref)
        if run is None:
            return None
        md = [run.answer or (f"**Failed:** {run.error}" if run.error else "*working…*")]
        if run.sources:
            md.append("### Sources\n" + "\n".join(
                f"{i}. [{s['title']}](read:{s['kind']}/{s['ref']})" for i, s in enumerate(run.sources, 1)))
        steps = "\n".join(f"- **{s['id']}** {s['goal']} — `{s['tool']}` · {s.get('status', '')}"
                          + (f" · {s['summary']}" if s.get("summary") else "") for s in run.subtasks)
        if steps:
            md.append(f"### How it was done ({run.brain or '…'})\n{steps}" + (f"\n\n*{run.note}*" if run.note else ""))
        return {"kind": kind, "ref": ref, "title": run.text, "markdown": "\n\n".join(md), "actions": ["rerun"],
                "graph": {"nodes": list(run.nodes.values()), "links": run.links}, "status": run.status}

    if kind == "repo":
        recs = repos.history(repo=ref)[-30:]
        if not recs:
            return None
        rows = ["| when | commits | lines | χ |", "|---|---|---|---|"]
        for r in reversed(recs):
            rows.append(f"| {_ts(r['ts'])} | {r.get('commits', 0)} | +{r.get('insertions', 0)}/-{r.get('deletions', 0)} "
                        f"| {r.get('chi') if r.get('chi') is not None else '—'} |")
        latest = [s for r in reversed(recs) for s in (r.get("subjects") or [])][:12]
        md = ["\n".join(rows)] + (["### Latest commits\n" + "\n".join(f"- {s}" for s in latest)] if latest else [])
        return {"kind": kind, "ref": ref, "title": ref, "markdown": "\n\n".join(md), "actions": []}

    if kind == "key":
        from backend.keeper.service import KEEPER
        row = next((r for r in KEEPER.snapshot()["credentials"] if r["id"] == ref), None)
        if row is None:
            return None
        return {"kind": kind, "ref": ref, "title": row["title"],
                "markdown": f"**State** {row['state']}\n\n{row['detail']}\n\n[Open the keys page](/desk/keys)", "actions": []}
    return None
