"""
/planner — the schedule that covers every minute.

  GET  /planner?start=&end=   blocks in range (ISO), at-risk tasks, per-day allocation, now/next
  GET  /planner/stream        SSE: the snapshot now, then after every re-plan / calendar sync
  POST /planner/pin           {block_id?, start, end, title?, kind?} move a block or place one
  POST /planner/unpin         {pin_id}
  POST /planner/done          {block_id, done}
  GET  /planner/settings      pools, weights, workday, meals, sleep fallback
  PUT  /planner/settings      replace them (validated)
  POST /planner/replan        re-plan now
"""

import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.planner.service import PLANNER

router = APIRouter()


def _dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        d = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(422, f"not an ISO datetime: {s}")
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


@router.get("")
@router.get("/")
def get_plan(start: str = "", end: str = ""):
    return PLANNER.snapshot(_dt(start), _dt(end))


@router.get("/stream")
async def stream(request: Request, start: str = "", end: str = ""):
    s, e = _dt(start), _dt(end)

    async def events():
        seen = -1
        while not await request.is_disconnected():
            if PLANNER.version != seen:
                seen = PLANNER.version
                yield f"event: plan\ndata: {json.dumps(PLANNER.snapshot(s, e))}\n\n"
            else:
                yield ": heartbeat\n\n"
            await PLANNER.wait_change(seen, 25)

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})


class PinBody(BaseModel):
    block_id: Optional[str] = None
    start: str
    end: str
    title: Optional[str] = None
    kind: Optional[str] = None


@router.post("/pin")
def pin(body: PinBody):
    try:
        b = PLANNER.pin(block_id=body.block_id, start=_dt(body.start), end=_dt(body.end),
                        title=body.title, kind=body.kind)
    except KeyError:
        raise HTTPException(404, "no such block")
    except ValueError as e:
        raise HTTPException(422, str(e))
    return b.to_json()


class UnpinBody(BaseModel):
    pin_id: str


@router.post("/unpin")
def unpin(body: UnpinBody):
    if not PLANNER.unpin(body.pin_id):
        raise HTTPException(404, "no such pin")
    return {"ok": True}


class DoneBody(BaseModel):
    block_id: str
    done: bool = True


@router.post("/done")
def done(body: DoneBody):
    if not PLANNER.mark_done(body.block_id, body.done):
        raise HTTPException(404, "no such block")
    return {"ok": True}


@router.get("/settings")
def get_settings():
    return PLANNER.settings


@router.put("/settings")
def put_settings(body: dict):
    try:
        return PLANNER.save_settings(body)
    except (ValueError, KeyError, TypeError) as e:
        raise HTTPException(422, f"invalid settings: {e}")


@router.post("/replan")
def replan():
    PLANNER.request_replan()
    return {"queued": True}
