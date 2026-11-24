"""
/tasks — give the desk a job in plain words (backend/tasks).

  POST /tasks                 {text, model?} → the task (runs in the background)
  GET  /tasks                 recent tasks
  GET  /tasks/{id}            one task: steps, graph, forms, files, report
  GET  /tasks/{id}/stream     the same over Server-Sent Events, as it grows
  POST /tasks/{id}/plans/{pid}/preview   preview a file plan the agent wrote, again (changes nothing)
  POST /tasks/{id}/plans/{pid}/run       run it on the laptop as last previewed (Kundai's button)
"""

from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.tasks.service import service

router = APIRouter()
SSE_HEADERS = {"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}


class TaskBody(BaseModel):
    text: str = Field(min_length=1, max_length=8000)
    model: Optional[str] = None


@router.post("")
async def start(body: TaskBody):
    return service().start(body.text.strip(), body.model or None)


class ResumeBody(BaseModel):
    text: str = Field(default="", max_length=8000)


@router.post("/{tid}/continue")
async def resume(tid: str, body: ResumeBody):
    try:
        return service().resume(tid, body.text)
    except KeyError:
        raise HTTPException(404, "no such task")


@router.post("/{tid}/plans/{pid}/{action}")
async def plan(tid: str, pid: str, action: str):
    from backend import laptop
    if action not in ("preview", "run"):
        raise HTTPException(404, "unknown plan action")
    try:
        return await service().plan(tid, pid, action)
    except KeyError:
        raise HTTPException(404, "no such task or plan")
    except ValueError as e:
        raise HTTPException(409, str(e))
    except laptop.LaptopOffline as e:
        raise HTTPException(503, str(e))
    except laptop.LaptopRefused as e:
        raise HTTPException(409, str(e))


@router.get("")
def recent(limit: int = 30):
    return service().recent(limit)


@router.get("/{tid}")
def one(tid: str):
    t = service().get(tid)
    if t is None:
        raise HTTPException(404, "no such task")
    return t


@router.get("/{tid}/stream")
async def stream(tid: str, request: Request):
    svc = service()
    if svc.get(tid) is None:
        raise HTTPException(404, "no such task")

    async def events():
        last = None
        while not await request.is_disconnected():
            seen = svc.version
            snap = json.dumps(svc.get(tid), ensure_ascii=False)
            if snap != last:
                last = snap
                yield f"event: task\ndata: {snap}\n\n"
                if svc.get(tid)["status"] != "running":
                    return
            else:
                yield ": heartbeat\n\n"
            await svc.wait_change(seen, 25)

    return StreamingResponse(events(), media_type="text/event-stream", headers=SSE_HEADERS)
