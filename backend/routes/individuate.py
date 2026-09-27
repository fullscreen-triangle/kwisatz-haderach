"""
/individuate — the depth dial (backend/individuate).

  GET  /individuate/node/{id}?   one node of the descent tree: its label (the distinction its
                                 members share), children, items, regime and target; no id =
                                 the root. Coarser = breadcrumb, finer = a child.
  GET  /individuate/status       θ, value V, pair counts, committed facets, recent grow runs
  PUT  /individuate/theta        {theta} — how completely things must be told apart
  POST /individuate/grow         re-read the corpus now (and grow if θ still demands it)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.individuate.service import INDIVIDUATOR

router = APIRouter()


@router.get("/node")
@router.get("/node/{node_id}")
def node(node_id: str = ""):
    out = INDIVIDUATOR.node(node_id)
    if out is None:
        if not node_id:
            return {"node": None, "children": [], "items": [], "breadcrumb": [],
                    "growing": INDIVIDUATOR.growing, "error": INDIVIDUATOR.error}
        raise HTTPException(404, "no such node — the tree was rebuilt; start from the root")
    return out


@router.get("/status")
def status():
    return INDIVIDUATOR.status()


class ThetaBody(BaseModel):
    theta: float


@router.put("/theta")
def set_theta(body: ThetaBody):
    try:
        theta = INDIVIDUATOR.set_theta(body.theta)
    except ValueError as e:
        raise HTTPException(422, str(e))
    INDIVIDUATOR.rebuild()                      # re-target now; growing follows in the loop
    return {"theta": theta, "V": INDIVIDUATOR.tree.get("V")}


@router.post("/grow")
def grow():
    INDIVIDUATOR.request()
    return {"queued": True, "growing": INDIVIDUATOR.growing}
