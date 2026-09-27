"""
One command -> one Run.

  1. route   an existing /intent rule that fits one routine (facts, pm, plan, doctor, the
             search organs) runs as a single agent — no model call, instant.
  2. plan    otherwise the local model decomposes the command into ≤ MAX_SUBTASKS subtasks
             ({id, goal, tool, args, needs}); a plan naming unknown tools, cycles or
             dangling dependencies is rejected. Two failures — or a command starting with
             `deep:` — escalate the plan to Claude, if a live key exists.
  3. run     subtasks become agents, each started once everything it `needs` is done
             (independent ones in parallel). An argument may reference an earlier result:
             {{s1}} = its first source (e.g. an email key), {{s1.text}} = its text.
  4. answer  one synthesis step writes the answer in markdown, citing sources as [n].

Every change is written to the Run and bumps the service version, so the console redraws
the graph (command → subtasks → agents → sources → answer) as it grows.
"""

from __future__ import annotations

import asyncio
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, ValidationError, field_validator

from backend.agents import llm
from backend.agents.tools import REGISTRY, ToolResult, catalogue

MAX_SUBTASKS = 8
FAST_ROUTES = {"facts", "pm", "plan", "doctor", "purpose", "spraypaint"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ----------------------------------------------------------------- plan shape

class Arg(BaseModel):
    name: str
    value: str


class Subtask(BaseModel):
    id: str
    goal: str
    tool: str
    args: List[Arg] = []
    needs: List[str] = []

    @field_validator("tool")
    @classmethod
    def known_tool(cls, v):
        if v not in REGISTRY:
            raise ValueError(f"unknown tool {v}")
        return v


class Plan(BaseModel):
    subtasks: List[Subtask] = Field(min_length=1, max_length=MAX_SUBTASKS)

    def check(self) -> "Plan":
        ids = [s.id for s in self.subtasks]
        if len(ids) != len(set(ids)):
            raise ValueError("duplicate subtask ids")
        for s in self.subtasks:
            for n in s.needs:
                if n not in ids or n == s.id:
                    raise ValueError(f"{s.id} needs unknown {n}")
        seen, stack = set(), set()             # cycle check

        def visit(i):
            if i in stack:
                raise ValueError("dependency cycle")
            if i in seen:
                return
            stack.add(i)
            for n in next(s for s in self.subtasks if s.id == i).needs:
                visit(n)
            stack.discard(i)
            seen.add(i)
        for i in ids:
            visit(i)
        return self


def plan_schema() -> dict:
    return {
        "type": "object", "additionalProperties": False, "required": ["subtasks"],
        "properties": {"subtasks": {"type": "array", "items": {
            "type": "object", "additionalProperties": False, "required": ["id", "goal", "tool", "args", "needs"],
            "properties": {
                "id": {"type": "string"}, "goal": {"type": "string"},
                "tool": {"type": "string", "enum": sorted(REGISTRY)},
                "args": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                                                    "required": ["name", "value"],
                                                    "properties": {"name": {"type": "string"},
                                                                   "value": {"type": "string"}}}},
                "needs": {"type": "array", "items": {"type": "string"}}}}}}}


def planner_prompt() -> str:
    now = datetime.now().astimezone()
    return (
        "You break Kundai Sachikonye's command into the fewest subtasks that fully perform it, each done by "
        f"one tool. It is {now:%A %d %B %Y %H:%M}. Tools:\n{catalogue()}\n\n"
        "Rules: ids are s1, s2, …; `needs` lists subtasks that must finish first; use as few subtasks as the "
        "command needs (a simple question is ONE subtask). To use an earlier result as an argument write "
        "{{s1}} (its first source, e.g. an email key) or {{s1.text}} (its text). Only use tools marked "
        "[changes things] when the command asks for that change. Answer with the JSON plan only.")


# ----------------------------------------------------------------- run state

class Run:
    def __init__(self, text: str, origin: str = "command", direct: Optional[dict] = None):
        self.direct = direct                     # {tool, args}: a button press — run exactly this tool
        self.id = f"{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"
        self.text = text.strip()
        self.origin = origin
        self.created = _now()
        self.updated = self.created
        self.status = "planning"                 # planning | running | done | failed
        self.brain = ""                          # rule | local | claude
        self.note = ""
        self.subtasks: List[dict] = []
        self.results: Dict[str, ToolResult] = {}
        self.sources: List[dict] = []            # numbered for citations
        self.answer = ""
        self.error = ""
        self.nodes: Dict[str, dict] = {"cmd": {"id": "cmd", "kind": "command", "label": self.text[:80]}}
        self.links: List[dict] = []

    # graph helpers ---------------------------------------------------------
    def node(self, nid: str, **attrs) -> None:
        self.nodes[nid] = {**self.nodes.get(nid, {"id": nid}), **attrs}

    def link(self, s: str, t: str, kind: str) -> None:
        if not any(l["source"] == s and l["target"] == t for l in self.links):
            self.links.append({"source": s, "target": t, "kind": kind})

    def source_index(self, src: dict) -> int:
        for i, s in enumerate(self.sources, 1):
            if s["kind"] == src["kind"] and s["ref"] == src["ref"]:
                return i
        self.sources.append(src)
        return len(self.sources)

    def to_json(self, full: bool = True) -> dict:
        d = {"id": self.id, "text": self.text, "origin": self.origin, "created": self.created,
             "updated": self.updated, "status": self.status, "brain": self.brain, "note": self.note,
             "answer": self.answer, "error": self.error,
             "subtasks": [{k: v for k, v in s.items()} for s in self.subtasks]}
        if full:
            d.update(sources=self.sources, graph={"nodes": list(self.nodes.values()), "links": self.links})
        return d

    @staticmethod
    def from_json(d: dict) -> "Run":
        r = Run(d["text"], d.get("origin", "command"))
        r.id, r.created, r.updated = d["id"], d["created"], d.get("updated", d["created"])
        r.status, r.brain, r.note = d.get("status", "done"), d.get("brain", ""), d.get("note", "")
        r.answer, r.error, r.subtasks, r.sources = d.get("answer", ""), d.get("error", ""), d.get("subtasks", []), d.get("sources", [])
        g = d.get("graph") or {}
        r.nodes = {n["id"]: n for n in g.get("nodes", [])} or r.nodes
        r.links = g.get("links", [])
        if r.status in ("planning", "running"):  # the process died mid-run
            r.status, r.error = "failed", "interrupted by a restart"
        return r


# ----------------------------------------------------------------- execution

async def make_plan(run: Run, changed) -> Optional[Plan]:
    deep = run.text.lower().startswith("deep:")
    text = run.text[5:].strip() if deep else run.text
    errors = []
    if deep and not llm.claude_available():      # asked for Claude, none to be had: do it here, say so
        deep = False
        run.note = "deep: asked for Claude, but there is no live Anthropic key — planned locally instead"
    if not deep:
        for _ in range(2):
            try:
                plan = Plan.model_validate(await llm.local_json(planner_prompt(), text, plan_schema())).check()
                run.brain = "local"
                return plan
            except (llm.BrainError, ValidationError, ValueError) as e:
                errors.append(str(e)[:160])
    if llm.claude_available():
        try:
            plan = Plan.model_validate(await llm.claude_json(planner_prompt(), text, plan_schema())).check()
            run.brain = "claude"
            run.note = "planned by Claude" + (" (asked with deep:)" if deep else " (the local model's plans failed)")
            return plan
        except (llm.BrainError, ValidationError, ValueError) as e:
            errors.append(f"Claude: {str(e)[:160]}")
    else:
        errors.append("Claude escalation unavailable (no live Anthropic key in the vault)")
    run.error = "could not plan this command — " + "; ".join(errors)
    return None


def _fill(value: str, run: Run) -> str:
    def sub(m):
        sid, part = m.group(1), m.group(2)
        res = run.results.get(sid)
        if res is None:
            return ""
        if part == ".text":
            return res.text[:3000]
        return res.sources[0]["ref"] if res.sources else res.summary
    return re.sub(r"\{\{\s*(s\d+)(\.text)?\s*\}\}", sub, value)


async def run_subtask(run: Run, st: dict, changed) -> None:
    sid = st["id"]
    tool = REGISTRY[st["tool"]]
    st["status"], st["started"] = "running", _now()
    run.node(sid, status="running")
    run.node(f"agent:{sid}", kind="agent", label=tool.name, status="running")
    run.link(sid, f"agent:{sid}", "performs")
    changed()
    args = {a["name"]: _fill(a["value"], run) for a in st.get("args", [])}
    params = set(tool.args) | ({"notes"} if tool.name == "plan_add" else set())
    try:
        res = await asyncio.wait_for(tool.fn(**{k: v for k, v in args.items() if k in params}), timeout=900)
    except asyncio.TimeoutError:
        res = ToolResult(summary="timed out", ok=False)
    except Exception as e:
        res = ToolResult(summary=f"{type(e).__name__}: {str(e)[:160]}", ok=False)
    run.results[sid] = res
    st.update(status="done" if res.ok else "failed", summary=res.summary, finished=_now())
    run.node(sid, status=st["status"], summary=res.summary)
    run.node(f"agent:{sid}", status=st["status"])
    for src in res.sources[:12]:
        n = run.source_index(src)
        nid = f"src:{src['kind']}:{src['ref']}"
        run.node(nid, kind=src["kind"], label=src["title"][:60], ref=src["ref"], cite=n)
        run.link(f"agent:{sid}", nid, "cites")
    changed()


async def synthesize(run: Run) -> str:
    parts = []
    for st in run.subtasks:
        res = run.results.get(st["id"])
        if res is None:
            continue
        cites = ", ".join(f"[{run.source_index(s)}] {s['title']}" for s in res.sources[:12])
        parts.append(f"## {st['id']} — {st['goal']} (tool {st['tool']}, {'ok' if res.ok else 'FAILED'})\n"
                     f"{res.text or res.summary}\n" + (f"Sources: {cites}\n" if cites else ""))
    system = ("You answer Kundai's command from the agents' results below — nothing else. Write clear, well "
              "structured markdown. Cite sources inline as [n] using the numbers given. If a tool changed "
              "something (plan item added, note or draft saved), say exactly what changed. If something "
              "failed or is missing, say so plainly.")
    user = f"Command: {run.text}\n\n" + "\n".join(parts)
    if run.brain == "claude" and llm.claude_available():
        try:
            return await llm.claude_text(system, user)
        except llm.BrainError as e:
            run.note += f" · synthesis fell back to local ({e})"
    return await llm.local_text(system, user[:24000])


async def execute(run: Run, changed) -> None:
    from backend.routes import intent as intent_mod
    try:
        route = None if run.text.lower().startswith("deep:") else intent_mod._keyword_route(run.text)
        if run.direct:
            if run.direct.get("tool") not in REGISTRY:
                raise ValueError(f"unknown tool {run.direct.get('tool')}")
            run.brain = "direct"
            st = {"id": "s1", "goal": run.text, "tool": run.direct["tool"], "needs": [], "status": "pending",
                  "args": [{"name": k, "value": str(v)} for k, v in (run.direct.get("args") or {}).items()]}
            run.subtasks = [st]
            run.node("s1", kind="subtask", label=run.text[:70], tool=st["tool"], status="pending")
            run.link("cmd", "s1", "decomposes")
            run.status = "running"
            changed()
            await run_subtask(run, st, changed)
            res = run.results["s1"]
            run.answer = res.text or res.summary
            if not res.ok:
                raise RuntimeError(res.summary)
        elif route in FAST_ROUTES:
            run.brain = "rule"
            run.subtasks = [{"id": "s1", "goal": run.text, "tool": f"route:{route}", "args": [], "needs": [],
                             "status": "running", "started": _now()}]
            run.node("s1", kind="subtask", label=route, status="running")
            run.link("cmd", "s1", "decomposes")
            run.status = "running"
            changed()
            slice_ = await intent_mod._dispatch(intent_mod.Choice(tool=route, query=run.text), True)
            run.answer = slice_.get("answer") or intent_mod._slice_for_answer(slice_) or "(no answer)"
            run.subtasks[0].update(status="done", summary=run.answer[:120], finished=_now())
            run.node("s1", status="done")
        else:
            plan = await make_plan(run, changed)
            if plan is None:
                run.status = "failed"
                changed()
                return
            run.subtasks = [{**s.model_dump(), "args": [a.model_dump() for a in s.args], "status": "pending"}
                            for s in plan.subtasks]
            for s in run.subtasks:
                run.node(s["id"], kind="subtask", label=s["goal"][:70], tool=s["tool"], status="pending")
                run.link("cmd", s["id"], "decomposes")
                for n in s["needs"]:
                    run.link(n, s["id"], "needs")
            run.status = "running"
            changed()
            done: set = set()
            pending = {s["id"]: s for s in run.subtasks}
            while pending:
                ready = [s for s in pending.values() if set(s["needs"]) <= done]
                if not ready:
                    break
                await asyncio.gather(*(run_subtask(run, s, changed) for s in ready))
                for s in ready:
                    done.add(s["id"])
                    pending.pop(s["id"])
            run.answer = await synthesize(run)
        run.node("answer", kind="result", label="answer", status="done")
        for s in run.subtasks:
            run.link(s["id"], "answer", "produces")
        run.status = "done"
    except Exception as e:
        run.status, run.error = "failed", f"{type(e).__name__}: {str(e)[:300]}"
    finally:
        run.updated = _now()
        changed()
