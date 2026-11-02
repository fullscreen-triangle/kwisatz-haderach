"""
The brief — what to read in one sitting, at your pace (the currentValue desk's format).

  first      at most three things, the most consequential first, each with one thing to do
  needs_you  everything else that waits for you
  later      what moved, by title only

Built without a model, from what the desk already holds: forms with fields waiting for
you, credentials the keeper reports dead/expired/expiring, model accounts that refused a
call for lack of credit, mail asking for a reply, plan tasks at risk, and tasks the models
declined. Every item names where it was read (`source`), so each statement is witnessed by
the desk's own record or says where to look. When nothing waits for you, `first` and
`needs_you` are empty — the brief does not invent something to say.

Order of consequence is fixed, not learned: paperwork first (it gates everything else,
including paying for the model accounts), then the plan, mail, credentials, model credit,
declined tasks.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List

BILLING = {
    "anthropic": "https://console.anthropic.com/settings/billing",
    "openai": "https://platform.openai.com/settings/organization/billing",
    "hf": "https://huggingface.co/settings/billing",
    "gemini": "https://aistudio.google.com/",
}
RANK = {"form": 0, "plan": 1, "mail": 2, "key": 3, "credit": 4, "task": 5}


def _item(kind, title, why, do_label, do_href, source, at=None) -> dict:
    return {"kind": kind, "title": title, "why": why, "do": {"label": do_label, "href": do_href} if do_label else None,
            "source": source, "at": at}


def _forms() -> List[dict]:
    from backend.forms.service import service
    out = []
    svc = service()
    for f in svc.recent():
        try:
            v = svc.view(f["id"])
        except Exception:
            continue
        waiting = v["counts"]["undecided"] + v["counts"]["assumed"]
        if waiting:
            out.append(_item("form", f"{v['title']}: {waiting} of {len(v['rows'])} fields need you",
                             f"{v['counts']['solved']} will be filled from what you confirmed or what documents show",
                             "open the form", f"/desk/forms?id={v['id']}", f"form memory {v['key'][:12]}", v.get("updated")))
    return out


def _keys() -> List[dict]:
    from backend.keeper.service import KEEPER
    out = []
    for row in KEEPER.snapshot()["credentials"]:
        if row["state"] in ("dead", "expired", "soon"):
            out.append(_item("key", f"{row['title']}: {row['state']}", row["detail"][:200],
                             "renew it" if row.get("renew_url") else "", row.get("renew_url") or "",
                             f"keeper probe {row.get('last_checked') or ''}".strip(), row.get("last_checked")))
    return out


def _credit() -> List[dict]:
    from backend.primitive.providers import PROVIDERS
    from backend.primitive.service import service
    out = []
    for pid, why in service().providers.refused().items():
        label = PROVIDERS[pid].label if pid in PROVIDERS else pid
        out.append(_item("credit", f"{label} answers no calls: {why}",
                         "the key works; the account refused the call, so the desk routes around it for an hour",
                         "add credit", BILLING.get(pid, ""), "the last model call to it"))
    return out


def _mail_and_plan() -> List[dict]:
    from backend import feed
    out = []
    f = feed.build(80)
    for t in (f.get("at_risk") or [])[:5]:
        title = t.get("title") if isinstance(t, dict) else str(t)
        out.append(_item("plan", f"At risk: {title}", "the plan cannot fit it before its deadline", "see the plan",
                         "/desk/plan", "planner"))
    asks = [i for i in f["items"] if i["kind"] == "mail" and i["state"] == "action"]
    for m in asks[:5]:
        out.append(_item("mail", m["title"], m["sub"][:200], "read it", f"/desk/console?read=mail/{m['ref']}",
                         f"mail {m['ref']}", m["at"]))
    return out


def _tasks() -> List[dict]:
    from backend.primitive.service import service
    since = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
    out = []
    for t in service().recent(30):
        if t["status"] == "declined" and (t["updated"] or "") >= since:
            o = t.get("outcome") or {}
            out.append(_item("task", f"The models declined: {t['task'][:120]}", (o.get("reason") or "")[:200],
                             "see what was tried", f"/desk/console?task={t['id']}", f"task {t['id']}", t["updated"]))
    return out


def _later() -> List[dict]:
    from backend import feed
    return [{"title": i["title"], "kind": i["kind"], "ref": i["ref"], "at": i["at"]}
            for i in feed.build(40)["items"] if i["kind"] in ("repo", "run", "note")][:12]


def build() -> dict:
    waiting: List[dict] = []
    problems: List[str] = []
    for name in ("forms", "mail_and_plan", "keys", "credit", "tasks"):
        try:
            waiting += globals()[f"_{name}"]()
        except Exception as e:                   # one source down must not blank the brief
            problems.append(f"{name}: {type(e).__name__}")
    waiting.sort(key=lambda i: RANK[i["kind"]])
    try:
        later = _later()
    except Exception as e:
        later, problems = [], problems + [f"later: {type(e).__name__}"]
    return {"at": datetime.now().astimezone().isoformat(timespec="seconds"),
            "first": waiting[:3], "needs_you": waiting[3:], "later": later,
            "unread_sources": problems}
