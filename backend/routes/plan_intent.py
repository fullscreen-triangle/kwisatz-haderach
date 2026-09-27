"""
plan — Agent Smith's dictation routine for plans. "plan: buy a chicken loop".

Two shapes, both parsed deterministically so they work with the model down:

  add   "plan: <title>", "add a plan to <title>", "I plan to <title>"
        with optional words the parser lifts out of the title:
          a date      "by 10.10", "on 2026-10-10", "on Friday", "tomorrow", "next week"
          a rhythm    "3 times a week", "3x a week", "twice a week"
          effort      "for 45 minutes", "45 min", "for 2 hours"
          a cost      "for 60 euro", "60 €", "€60"
  list  "my plans", "what's planned", "upcoming milestones"

The node lands at the top level of the plan tree; its place under a parent is a desk edit.
Slice: {"kind": "plan", "answer": .., "rows": [{name, description}], "node"?}
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from typing import Any, Dict, Optional, Tuple
from zoneinfo import ZoneInfo

from backend.plans.model import PlanNode, milestones
from backend.plans.store import PLANS

TZ = ZoneInfo("Europe/Berlin")
WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
WORDS = {"once": 1, "twice": 2, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7}

ADD = re.compile(r"^\s*(?:plan\s*[:,-]\s*|(?:add|make|create|new)\s+(?:a\s+)?plan\s*(?:to|for|:)?\s*|i\s+(?:plan|intend)\s+to\s+)(?P<rest>.+)$", re.I)
LIST = re.compile(r"\b(my plans|what'?s planned|upcoming milestones|long[- ]term plans?|show (me )?(my )?plans)\b", re.I)


def _take(pattern: str, text: str) -> Tuple[Optional[re.Match], str]:
    m = re.search(pattern, text, re.I)
    if not m:
        return None, text
    return m, (text[:m.start()] + " " + text[m.end():]).strip()


def _year_for(d: date, today: date) -> date:
    """A day-month without a year means its next occurrence."""
    return d if d >= today else d.replace(year=d.year + 1)


def parse(rest: str, today: date) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    t = rest.strip().rstrip(".")

    m, t = _take(r"\b(\d{1,2}|once|twice|one|two|three|four|five|six|seven)\s*(?:x|times?)?\s*(?:a|per|each)\s*week\b", t)
    if m:
        g = m.group(1).lower()
        out["every"] = {"times": int(g) if g.isdigit() else WORDS[g], "per": "week"}

    m, t = _take(r"\b(?:for\s+)?(\d{1,3})\s*(?:min(?:ute)?s?|m)\b", t)
    if m:
        out["minutes"] = int(m.group(1))
    else:
        m, t = _take(r"\b(?:for\s+)?(\d{1,2}(?:[.,]5)?)\s*(?:h|hours?)\b", t)
        if m:
            out["minutes"] = int(float(m.group(1).replace(",", ".")) * 60)

    m, t = _take(r"(?:\bfor\s+)?(?:€\s*(\d+(?:[.,]\d{1,2})?)|\b(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur(?:o|os)?\b))", t)
    if m:
        out["cost"] = {"amount": float((m.group(1) or m.group(2)).replace(",", ".")), "currency": "EUR"}

    when: Optional[date] = None
    m, t = _take(r"\b(?:by|on|until|before|am|bis)\s+(\d{4}-\d{2}-\d{2})\b", t)
    if m:
        when = date.fromisoformat(m.group(1))
    if when is None:
        m, t = _take(r"\b(?:(?:by|on|until|before|am|bis)\s+)?(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4})?)?(?!\d)", t)
        if m:
            y = int(m.group(3)) if m.group(3) else today.year
            y = y + 2000 if y < 100 else y
            try:
                when = date(y, int(m.group(2)), int(m.group(1)))
                when = when if m.group(3) else _year_for(when, today)
            except ValueError:
                when = None
    if when is None:
        m, t = _take(r"\b(?:by|on|before)?\s*(today|tomorrow|next week)\b", t)
        if m:
            when = {"today": today, "tomorrow": today + timedelta(days=1),
                    "next week": today + timedelta(days=7 - today.weekday())}[m.group(1).lower()]
    if when is None:
        m, t = _take(r"\b(?:by|on|before|this|next)?\s*(" + "|".join(WEEKDAYS) + r")\b", t)
        if m:
            ahead = (WEEKDAYS.index(m.group(1).lower()) - today.weekday()) % 7 or 7
            when = today + timedelta(days=ahead)
    if when:
        out["when"] = {"date": when.isoformat()}

    if "every" in out:
        out["every"]["minutes"] = out.pop("minutes", 30)
    title = re.sub(r"\s{2,}", " ", t).strip(" ,;-")
    out["title"] = title[:1].upper() + title[1:] if title else ""
    return out


def _describe(n: PlanNode) -> str:
    bits = []
    if n.when and n.when.date:
        bits.append(f"on {n.when.date}")
    if n.every:
        bits.append(f"{n.every.times}× a week, {n.every.minutes} min")
    elif n.minutes:
        bits.append(f"{n.minutes} min")
    if n.cost:
        bits.append(f"{n.cost.amount:g} {n.cost.currency}")
    return ", ".join(bits)


async def answer_plan(text: str) -> Dict[str, Any]:
    m = ADD.match(text)
    if m and not LIST.search(text):
        fields = parse(m.group("rest"), datetime.now(TZ).date())
        if not fields["title"]:
            return {"kind": "plan", "answer": "What's the plan? Say e.g. “plan: buy a chicken loop”.", "rows": []}
        node = PLANS.add(PlanNode(**fields))
        desc = _describe(node)
        return {"kind": "plan", "answer": f"Added “{node.title}”" + (f" — {desc}." if desc else ".")
                + (" It's on the calendar and in the plan." if (node.when or node.every) and (node.minutes or node.every)
                   else " It's in your plans; give it a date or effort on the desk to schedule it."),
                "rows": [], "node": node.model_dump(exclude_none=True)}
    nodes = PLANS.nodes()
    ms = [x for x in milestones(nodes, TZ) if x["status"] != "done" and x["end"] >= datetime.now(TZ).date()]
    ms.sort(key=lambda x: x["start"])
    blocked = [x for x in ms if x["status"] == "blocked"]
    count = f"{len(nodes)} plan" + ("" if len(nodes) == 1 else "s")
    answer = (f"{count}. Next: " + "; ".join(f"{x['title']} ({x['start']:%d.%m.})" for x in ms[:3]) + "."
              if ms else f"{count}, nothing dated ahead.")
    if blocked:
        answer += f" {len(blocked)} blocked."
    rows = [{"name": f"{x['start']:%d %b %Y} · {x['title']}",
             "description": ("blocked: " + "; ".join(x["blocked_by"])) if x["blocked_by"] else ""} for x in ms[:10]]
    return {"kind": "plan", "answer": answer, "rows": rows}
