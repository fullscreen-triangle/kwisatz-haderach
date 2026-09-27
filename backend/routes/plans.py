"""
/plans — long-horizon plans (backend/plans).

  GET    /plans                every node + its effective status and blockers, plus milestones
  POST   /plans                {title, parent?, when?, minutes?, every?, cost?, requires?, ...}
  PATCH  /plans/{id}           any subset of the fields
  POST   /plans/{id}/done      {done: true|false}
  DELETE /plans/{id}           the node and its subtree
  POST   /plans/import         {nodes: [...]} — merge a seed (existing ids are left alone)

The plan is shown only in the PWA timeline (/desk/brief) — nothing goes to an external calendar.
"""

from typing import List
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.planner.service import PLANNER
from backend.plans.model import PlanNode, blockers, effective, milestones
from backend.plans.store import PLANS

router = APIRouter()


def _tz():
    return ZoneInfo(PLANNER.settings["timezone"])


def view() -> dict:
    nodes = PLANS.nodes()
    out = []
    for n in nodes.values():
        d = n.model_dump(exclude_none=True)
        d["effective"] = effective(n, nodes)
        d["blocked_by"] = blockers(n, nodes) if d["effective"] == "blocked" else []
        d["children"] = [k for k, c in nodes.items() if c.parent == n.id]
        out.append(d)
    ms = milestones(nodes, _tz())
    for m in ms:
        m["start"], m["end"] = m["start"].isoformat(), m["end"].isoformat()
    return {"version": PLANS.version, "nodes": out, "milestones": sorted(ms, key=lambda m: m["start"])}


@router.get("")
@router.get("/")
def list_plans():
    return view()


@router.post("")
@router.post("/")
def add_plan(node: PlanNode):
    try:
        return PLANS.add(node).model_dump(exclude_none=True)
    except KeyError as e:
        raise HTTPException(404, f"no such parent: {e}")


@router.patch("/{nid}")
def patch_plan(nid: str, body: dict):
    try:
        return PLANS.update(nid, body).model_dump(exclude_none=True)
    except KeyError as e:
        raise HTTPException(404, f"no such plan: {e}")
    except ValueError as e:
        raise HTTPException(422, str(e))


class DoneBody(BaseModel):
    done: bool = True


@router.post("/{nid}/done")
def done_plan(nid: str, body: DoneBody):
    try:
        return PLANS.update(nid, {"status": "done" if body.done else "active"}).model_dump(exclude_none=True)
    except KeyError:
        raise HTTPException(404, "no such plan")


@router.delete("/{nid}")
def delete_plan(nid: str):
    try:
        return {"removed": PLANS.delete(nid)}
    except KeyError:
        raise HTTPException(404, "no such plan")


class ImportBody(BaseModel):
    nodes: List[dict]


@router.post("/import")
def import_plans(body: ImportBody):
    return PLANS.import_nodes(body.nodes)
