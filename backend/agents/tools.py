"""
What agents can do. Each tool: a name, a one-line description the planner reads, named
string arguments, and an async function returning a ToolResult.

Read:   find_mail, read_mail, search, read_attachment, ask, memory, plan_view, repos,
        repo_facts, notes_list
Write (Kundai approved these): plan_add, plan_done, note_write, draft_reply (text only —
        nothing is ever sent), repo_refresh, summarize_attachment (caches a summary)

A ToolResult carries `text` (what the synthesis step reads, capped), a short `summary`
(what the graph node shows) and `sources` (what the result cites: mail, notes, plan
blocks, repos) — sources become nodes in the run graph.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Awaitable, Callable, Dict, List, Optional

import httpx

from backend.agents import llm, notes

TEXT_CAP = 6000


@dataclass
class ToolResult:
    summary: str
    text: str = ""
    sources: List[dict] = field(default_factory=list)   # {kind, ref, title}
    ok: bool = True


@dataclass
class Tool:
    name: str
    description: str
    args: Dict[str, str]                       # arg name -> what it means
    fn: Callable[..., Awaitable[ToolResult]]
    writes: bool = False


REGISTRY: Dict[str, Tool] = {}


def tool(name: str, description: str, args: Dict[str, str], writes: bool = False):
    def deco(fn):
        REGISTRY[name] = Tool(name, description, args, fn, writes)
        return fn
    return deco


def catalogue() -> str:
    lines = []
    for t in REGISTRY.values():
        a = ", ".join(f"{k}: {v}" for k, v in t.args.items()) or "no arguments"
        lines.append(f"- {t.name} ({a}){' [changes things]' if t.writes else ''}: {t.description}")
    return "\n".join(lines)


def _mail():
    from backend.mail.service import MAIL
    return MAIL


def _cap(s: str, n: int = TEXT_CAP) -> str:
    return s if len(s) <= n else s[:n] + "\n…(truncated)"


# ----------------------------------------------------------------- mail

@tool("find_mail", "List recent emails with what was extracted from each (summary, to-dos, dates).",
      {"account": "leave EMPTY to search every mailbox; only set it when the command names one",
       "days": "how many days back (default 7)",
       "needs_action": "yes to keep only mail that asks something of him",
       "about": "optional words to filter by: a sender's name, a topic"})
async def find_mail(account: str = "", days: str = "7", needs_action: str = "", about: str = "") -> ToolResult:
    since = (datetime.now(timezone.utc) - timedelta(days=int(days or 7))).isoformat()
    words = [w for w in about.lower().split() if len(w) > 2]

    def pick(acct: str) -> list:
        rows = _mail().store.list(account=acct, needs_action=needs_action.lower().startswith("y"),
                                  include_done=False, limit=200, since=since)
        if words:
            rows = [r for r in rows if any(w in f"{r['subject']} {r['from_name']} {r['from_addr']} {r['preview']} "
                                           f"{(r['extraction'] or {}).get('summary', '')}".lower() for w in words)]
        return rows

    acct = account.strip().lower()
    rows, widened = pick(acct), False
    if acct and not rows:                        # a guessed mailbox is the model's commonest slip
        rows, widened = pick(""), True
    lines, sources = [], []
    for r in rows[:30]:
        ex = r["extraction"] or {}
        todo = "; ".join(f"{a['title']}" + (f" (due {a['due'][:16]})" if a.get("due") else "")
                         for a in ex.get("action_items") or [])
        evs = "; ".join(f"{e['title']} {e['start'][:16]}" for e in ex.get("events") or [])
        lines.append(f"[{r['key']}] {r['date'][:10]} {r['account']} from {r['from_name'] or r['from_addr']}: "
                     f"{r['subject']} — {ex.get('summary') or r['preview'][:160]}"
                     + (f" | to do: {todo}" if todo else "") + (f" | events: {evs}" if evs else ""))
        sources.append({"kind": "mail", "ref": r["key"], "title": r["subject"] or "(no subject)"})
    note = f"(nothing in '{acct}', so every mailbox was searched)\n" if widened else ""
    return ToolResult(summary=f"{len(rows)} emails", text=_cap(note + ("\n".join(lines) or "no matching mail")),
                      sources=sources)


@tool("read_mail", "Read one email in full, with its attachments listed.", {"key": "the email's key, e.g. uni:1a2b…"})
async def read_mail(key: str) -> ToolResult:
    m = _mail().store.get_message(key.strip())
    if m is None:
        return ToolResult(summary="no such email", ok=False)
    from backend.mail import attachments
    atts = await attachments.ensure(m.key)
    ex = (_mail().store.extraction(m.key) or {}).get("data") or {}
    text = (f"From: {m.from_name} <{m.from_addr}>\nDate: {m.date:%Y-%m-%d %H:%M}\nSubject: {m.subject}\n"
            + (f"Attachments: {', '.join(a['name'] for a in atts)}\n" if atts else "")
            + (f"Extracted summary: {ex.get('summary')}\n" if ex.get("summary") else "") + f"\n{m.text}")
    return ToolResult(summary=m.subject or "(no subject)", text=_cap(text),
                      sources=[{"kind": "mail", "ref": m.key, "title": m.subject or "(no subject)"}])


@tool("read_attachment", "Read the text of an email attachment (PDF, Word, text).",
      {"key": "the email's key", "name": "the attachment's file name (or its number, 0 = first)"})
async def read_attachment(key: str, name: str = "0") -> ToolResult:
    from backend.mail import attachments
    atts = await attachments.ensure(key.strip())
    a = next((x for x in atts if x["name"] == name or str(x["n"]) == name.strip()), atts[0] if atts else None)
    if a is None:
        return ToolResult(summary="no attachments", ok=False)
    t = attachments.text(key.strip(), a["n"])
    return ToolResult(summary=f"{a['name']} ({a['chars']} characters)", text=_cap(t or "(no text in this file)", 12000),
                      sources=[{"kind": "attachment", "ref": f"{key.strip()}/{a['n']}", "title": a["name"]}])


@tool("summarize_attachment", "Summarise an email attachment and keep the summary with the mail.",
      {"key": "the email's key", "name": "the attachment's file name or number"}, writes=True)
async def summarize_attachment(key: str, name: str = "0") -> ToolResult:
    from backend.mail import attachments
    got = await read_attachment(key, name)
    if not got.ok:
        return got
    n = int(got.sources[0]["ref"].rsplit("/", 1)[1])
    cached = attachments.summary(key.strip(), n)
    if cached:
        return ToolResult(summary=f"summary of {got.sources[0]['title']}", text=cached, sources=got.sources)
    md = await llm.local_text(
        "Summarise this document for Kundai in clear markdown: what it is, key points, and every date, "
        "deadline, amount or action it asks of him. Use the document's language for quoted terms.", got.text)
    attachments.save_summary(key.strip(), n, md)
    return ToolResult(summary=f"summary of {got.sources[0]['title']}", text=md, sources=got.sources)


@tool("search", "Full-text search across all mail (and attachments) and his notes; returns matching passages.",
      {"query": "the words to look for"})
async def search(query: str) -> ToolResult:
    from backend.mail import search as sp
    mail_res = await asyncio.to_thread(sp.ask, _mail().store.md_root, query, 8)
    note_res = await asyncio.to_thread(sp.ask, notes.notes_dir(), query, 4)
    lines, sources = [], []
    for res, kind in ((mail_res, "mail"), (note_res, "note")):
        for r in res.get("results", []) if isinstance(res, dict) else []:
            path = r.get("path", "")
            if kind == "mail":
                acct, stem = path.split("/", 1)[0], path.rsplit("/", 1)[-1].removesuffix(".md")
                ref, title = f"{acct}:{stem}", path
            else:
                ref = path.rsplit("/", 1)[-1].removesuffix(".md")
                title = ref
            lines.append(f"[{kind} {ref}] {r.get('snippet', '')[:500]}")
            sources.append({"kind": kind, "ref": ref, "title": title})
    return ToolResult(summary=f"{len(sources)} passages", text=_cap("\n\n".join(lines) or "nothing found"),
                      sources=sources)


@tool("ask", "Answer a question from his mail, projects, plans and todos, graded by how many independent "
             "sources agree (four-sided-triangle).", {"question": "the question"})
async def ask(question: str) -> ToolResult:
    async with httpx.AsyncClient(timeout=120) as c:
        try:
            r = await c.get("http://127.0.0.1:3002/api/desk/mail/ask", params={"q": question})
            d = r.json()
        except (httpx.HTTPError, ValueError) as e:
            return ToolResult(summary=f"ask failed ({type(e).__name__})", ok=False)
    if d.get("error"):
        return ToolResult(summary=d["error"], ok=False)
    sources = [{"kind": "mail", "ref": s["key"], "title": s["id"]} for s in d.get("support", []) if s.get("key")]
    text = f"status: {d.get('status')}\n{d.get('claim') or d.get('reason', '')}\n{d.get('warning', '')}"
    return ToolResult(summary=d.get("status", "?"), text=_cap(text), sources=sources)


@tool("memory", "Ask chigutiro, his personal memory, which holds mail, contacts, events and past runs.",
      {"question": "the question"})
async def memory(question: str) -> ToolResult:
    from backend.mail import memory as mem
    if not mem.configured(_mail().env):
        return ToolResult(summary="memory not configured", ok=False)
    async with httpx.AsyncClient() as c:
        try:
            d = await mem.ask(c, _mail().env, question, 8)
        except httpx.HTTPError as e:
            return ToolResult(summary=f"memory unreachable ({type(e).__name__})", ok=False)
    claims = "\n".join(f"- [{c['receiver']}, {c['grade']}] {c['text']}" for c in d.get("claims", []))
    return ToolResult(summary=f"{d.get('grade')} · {len(d.get('claims', []))} claims",
                      text=_cap(f"{d.get('answer', '')}\n{claims}"))


# ----------------------------------------------------------------- plan

@tool("plan_view", "What his plan holds: the current and next blocks, today's and tomorrow's schedule, "
                   "and tasks at risk of missing their deadline.", {"day": "today | tomorrow (default today)"})
async def plan_view(day: str = "today") -> ToolResult:
    from backend.planner.service import PLANNER
    from zoneinfo import ZoneInfo
    tz = ZoneInfo("Europe/Berlin")
    target = datetime.now(tz).date() + timedelta(days=1 if day.strip().lower().startswith("tom") else 0)
    snap = PLANNER.snapshot()
    rows = [b for b in snap["blocks"] if datetime.fromisoformat(b["start"]).astimezone(tz).date() == target
            and b["kind"] not in ("sleep", "buffer", "break")]
    lines = [f"{datetime.fromisoformat(b['start']).astimezone(tz):%H:%M}-{datetime.fromisoformat(b['end']).astimezone(tz):%H:%M} "
             f"{b['kind']}: {b['title']}" for b in rows]
    risk = [f"AT RISK: {r['title']} (due {r.get('due') or '?'})" for r in snap.get("at_risk", [])]
    now = f"now: {snap['now']['title']}" if snap.get("now") else ""
    return ToolResult(summary=f"{len(rows)} blocks {target:%a %d %b}" + (f", {len(risk)} at risk" if risk else ""),
                      text=_cap("\n".join([now] + lines + risk)),
                      sources=[{"kind": "plan", "ref": b["id"], "title": b["title"]} for b in rows if b["kind"] in ("task", "fixed")][:12])


@tool("plan_add", "Add something to his plan: a task with effort (minutes) and optional due date, or a dated milestone.",
      {"title": "what it is", "minutes": "effort in minutes, empty for a milestone",
       "due": "YYYY-MM-DD or YYYY-MM-DDTHH:MM, optional", "notes": "optional"}, writes=True)
async def plan_add(title: str, minutes: str = "", due: str = "", notes_: str = "", **extra) -> ToolResult:
    from backend.plans.model import PlanNode
    from backend.plans.store import PLANS
    body = {"title": title.strip()[:200], "notes": (notes_ or extra.get("notes", ""))[:2000]}
    if minutes.strip().isdigit():
        body["minutes"] = max(5, min(480, int(minutes)))
    if due.strip():
        body["when"] = {"date": due.strip()[:16]}
    try:
        node = PLANS.add(PlanNode(**body))
    except Exception as e:
        return ToolResult(summary=f"could not add ({type(e).__name__})", ok=False)
    try:
        from backend.planner.service import PLANNER
        PLANNER.request_replan()
    except Exception:
        pass
    return ToolResult(summary=f"added “{node.title}”", text=f"Added plan item {node.id}: {node.title}",
                      sources=[{"kind": "planitem", "ref": node.id, "title": node.title}])


@tool("plan_done", "Mark a block of his plan done.", {"block_id": "the block's id"}, writes=True)
async def plan_done(block_id: str) -> ToolResult:
    from backend.planner.service import PLANNER
    ok = PLANNER.mark_done(block_id.strip(), True)
    return ToolResult(summary="marked done" if ok else "no such block", ok=ok)


# ----------------------------------------------------------------- notes & drafts

@tool("note_write", "Save a note (markdown) he can read later.", {"title": "the note's title", "body": "markdown"},
      writes=True)
async def note_write(title: str, body: str) -> ToolResult:
    n = notes.write(title.strip() or "Note", body)
    return ToolResult(summary=f"saved note “{n['title']}”", text=body[:1000],
                      sources=[{"kind": "note", "ref": n["id"], "title": n["title"]}])


@tool("notes_list", "List his recent notes and drafts.", {})
async def notes_list() -> ToolResult:
    items = notes.list_notes(20)
    return ToolResult(summary=f"{len(items)} notes", text="\n".join(f"[{n['id']}] {n['kind']}: {n['title']}" for n in items),
                      sources=[{"kind": "note", "ref": n["id"], "title": n["title"]} for n in items[:8]])


@tool("draft_reply", "Write a reply draft to an email (saved as a draft note — never sent).",
      {"key": "the email's key", "intent": "what the reply should say or achieve"}, writes=True)
async def draft_reply(key: str, intent: str = "") -> ToolResult:
    m = _mail().store.get_message(key.strip())
    if m is None:
        return ToolResult(summary="no such email", ok=False)
    text = await llm.local_text(
        "Write a reply email for Kundai Sachikonye. Match the language of the original (German or English) and "
        "its register; be concise and concrete; sign as Kundai. Output only the email body.",
        f"Original from {m.from_name} <{m.from_addr}>, subject {m.subject}:\n\n{m.text[:5000]}\n\n"
        f"What the reply should do: {intent or 'answer appropriately'}")
    n = notes.write(f"Reply to {m.from_name or m.from_addr}: {m.subject}", text, kind="draft", ref=m.key)
    return ToolResult(summary=f"draft saved ({len(text.split())} words)", text=text,
                      sources=[{"kind": "note", "ref": n["id"], "title": n["title"]},
                               {"kind": "mail", "ref": m.key, "title": m.subject}])


# ----------------------------------------------------------------- repos

@tool("repos", "How his active GitHub repos have moved: commits, lines changed and the tracker's χ over time.",
      {"days": "how many days back (default 7)", "repo": "optional repo name"})
async def repos(days: str = "7", repo: str = "") -> ToolResult:
    from backend.repos import service as rs
    since = (datetime.now(timezone.utc) - timedelta(days=int(days or 7))).isoformat()
    recs = rs.history(repo=repo.strip(), since=since)
    agg: Dict[str, dict] = {}
    for r in recs:
        a = agg.setdefault(r["repo"], {"commits": 0, "insertions": 0, "deletions": 0, "chi": None, "subjects": []})
        a["commits"] += r.get("commits") or 0
        a["insertions"] += r.get("insertions") or 0
        a["deletions"] += r.get("deletions") or 0
        a["chi"] = r.get("chi", a["chi"])
        a["subjects"] += r.get("subjects") or []
    lines = [f"{name}: {a['commits']} commits, +{a['insertions']}/-{a['deletions']} lines, χ={a['chi']}"
             + (f" — {'; '.join(a['subjects'][:5])}" if a["subjects"] else "")
             for name, a in sorted(agg.items(), key=lambda kv: -kv[1]["commits"])]
    return ToolResult(summary=f"{sum(a['commits'] for a in agg.values())} commits in {len(agg)} repos",
                      text=_cap("\n".join(lines) or "no repo history yet (first pass pending)"),
                      sources=[{"kind": "repo", "ref": n, "title": n} for n in list(agg)[:12]])


@tool("repo_refresh", "Pull his active repos now and re-measure them.", {}, writes=True)
async def repo_refresh() -> ToolResult:
    from backend.repos.service import REPOS
    REPOS.refresh()
    return ToolResult(summary="repo pass started")


@tool("repo_facts", "Facts about all his GitHub repos (counts, languages, descriptions).", {"question": "the question"})
async def repo_facts(question: str) -> ToolResult:
    from backend.routes import facts
    d = await facts.answer_facts(question)
    return ToolResult(summary=(d.get("answer") or "")[:120], text=_cap(str(d.get("answer", "")) + "\n"
                                                                     + "\n".join(map(str, d.get("rows", [])[:30]))))
