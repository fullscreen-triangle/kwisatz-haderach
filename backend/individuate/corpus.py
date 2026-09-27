"""
What the depth dial individuates: every open item of his life, as the engine's corpus.

An entity has three observation channels, read in order — the engine starts with the
title and reads further only where a separation is still open (a probe):

  title    mail subject / plan title / todo text
  context  what the item is part of: a plan's notes and its ancestors' titles; for mail the
           extraction's action items and key facts
  abstract the observation itself: the raw mail text (head), or a plan's dates, cost,
           rhythm and requirements written out as words

Identifiers — message keys, addresses, plan ids — are kept in `meta` and never shown to the
witness: they would individuate every item by name, the selector the method refuses.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple

from backend.plans.model import PlanNode, effective, when_span

SKIP_CATEGORIES = {"newsletter", "spam", "journal", "notification"}


def _mail(now: datetime) -> Tuple[Dict[str, dict], Dict[str, dict]]:
    from backend.mail.service import MAIL
    rows = MAIL.store.extracted_since((now - timedelta(days=30)).astimezone(timezone.utc).isoformat())
    rows = [r for r in rows if not r["done"] and not r["owner"]
            and (r["extraction"] or {}).get("category") not in SKIP_CATEGORIES]
    bodies = MAIL.store.bodies([r["key"] for r in rows])
    ents, meta = {}, {}
    for r in rows:
        ex = r["extraction"] or {}
        ctx = [a.get("title", "") for a in ex.get("action_items") or []] + list(ex.get("key_facts") or [])
        dues = [a.get("due") for a in ex.get("action_items") or [] if a.get("due")]
        k = f"m:{r['key']}"
        ents[k] = {"title": r["subject"] or "(no subject)", "context": [c for c in ctx if c],
                   "abstract": bodies.get(r["key"], "")}
        meta[k] = {"kind": "mail", "ref": r["key"], "title": r["subject"], "date": r["date"],
                   "who": r["from_name"] or r["from_addr"], "account": r["account"],
                   "due": min(dues) if dues else (ex.get("reply_by") or None),
                   "needs_reply": bool(ex.get("needs_reply"))}
    return ents, meta


def _plan_words(n: PlanNode, tz) -> str:
    parts = []
    span = when_span(n, tz)
    if span:
        s, e = span
        parts.append(f"on {s:%A %d %B %Y}" if s == e else f"between {s:%d %B %Y} and {e:%d %B %Y}")
    if n.every:
        parts.append(f"{n.every.times} times a {n.every.per} for {n.every.minutes} minutes")
    if n.minutes:
        parts.append(f"takes about {n.minutes} minutes")
    if n.cost:
        parts.append(f"costs {n.cost.amount:g} {n.cost.currency}")
    parts += [f"requires {r}" for r in n.requires]
    return ". ".join(parts)


def _plans(tz) -> Tuple[Dict[str, dict], Dict[str, dict]]:
    from backend.plans.store import PLANS
    nodes = PLANS.nodes()
    ents, meta = {}, {}
    for n in nodes.values():
        state = effective(n, nodes)
        if state in ("done", "dropped"):
            continue
        chain, cur, seen = [], nodes.get(n.parent) if n.parent else None, set()
        while cur is not None and cur.id not in seen:
            seen.add(cur.id)
            chain.append(cur.title)
            cur = nodes.get(cur.parent) if cur.parent else None
        span = when_span(n, tz)
        k = f"p:{n.id}"
        ents[k] = {"title": n.title, "context": [c for c in [n.notes, *chain, n.area] if c],
                   "abstract": _plan_words(n, tz)}
        meta[k] = {"kind": "plan", "ref": n.id, "title": n.title, "status": state,
                   "due": span[1].isoformat() if span else None}
    return ents, meta


def _todos(root) -> Tuple[Dict[str, dict], Dict[str, dict]]:
    try:
        data = json.loads((root / "tools" / "document_tracker" / "data" / "todos.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}, {}
    items = data.get("todos", []) if isinstance(data, dict) else data
    ents, meta = {}, {}
    for t in items if isinstance(items, list) else []:
        if t.get("done") or not t.get("text"):
            continue
        k = f"t:{t.get('id')}"
        ents[k] = {"title": t["text"], "context": [], "abstract": ""}
        meta[k] = {"kind": "todo", "ref": str(t.get("id")), "title": t["text"], "due": t.get("due")}
    return ents, meta


def build(now: datetime, tz, root) -> Tuple[dict, Dict[str, dict], str]:
    """-> (corpus for the engine, meta per entity key, fingerprint of what the witness sees)."""
    ents, meta = {}, {}
    for e, m in (_mail(now), _plans(tz), _todos(root)):
        ents.update(e)
        meta.update(m)
    fp = hashlib.sha1(json.dumps(ents, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    return {"entities": ents}, meta, fp
