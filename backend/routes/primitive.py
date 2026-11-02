"""
/primitive — models inside the desk (backend/primitive).

  GET  /primitive/models               providers (usable or why not), the pool by specialty
  POST /primitive/tasks                {task, model?, depth?, attempts?, budget?, crowd?} → the task
  GET  /primitive/tasks                recent tasks
  GET  /primitive/tasks/{id}           one task: settings, status, the trie
  GET  /primitive/tasks/{id}/stream    the same over Server-Sent Events, as it grows
"""

from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.primitive.service import service

router = APIRouter()
SSE_HEADERS = {"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}


class TaskBody(BaseModel):
    task: str = Field(min_length=1, max_length=20000)
    model: Optional[str] = None
    depth: Optional[int] = None
    attempts: Optional[int] = None
    budget: Optional[int] = None
    crowd: Optional[int] = None


@router.get("/models")
async def models():
    return await service().models()


@router.post("/tasks")
async def start(body: TaskBody):                 # async: the run is scheduled on this loop
    return service().start(body.task.strip(), model=body.model or None, depth=body.depth,
                           attempts=body.attempts, budget=body.budget, crowd=body.crowd)


@router.get("/tasks")
def tasks(limit: int = 50):
    return service().recent(limit)


@router.get("/tasks/{tid}")
def task(tid: str):
    t = service().get(tid)
    if t is None:
        raise HTTPException(404, "no such task")
    return t


@router.get("/tasks/{tid}/stream")
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
            else:
                yield ": heartbeat\n\n"
            await svc.wait_change(seen, 25)

    return StreamingResponse(events(), media_type="text/event-stream", headers=SSE_HEADERS)
