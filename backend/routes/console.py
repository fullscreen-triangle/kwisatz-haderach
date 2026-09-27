"""
The console's backend: runs, the live feed, full-text reading, repos.

  POST /agents/runs                {text}         start a run (command or dictation)
  GET  /agents/runs                               recent runs (no graphs)
  GET  /agents/runs/{id}                          one run with its graph, sources and answer
  GET  /agents/runs/{id}/stream                   SSE: the run as it grows
  GET  /console/feed                              the time-ordered list of everything that moved
  GET  /console/feed/stream                       SSE: the feed, pushed whenever any source moves
  GET  /console/read/{kind}/{ref}                 one item in full, as markdown
  GET  /console/repos                             active repos with their latest measurements
  POST /console/repos/refresh                     pull + measure now
  GET|PUT /console/repos/settings                 active window, include/exclude
"""

import asyncio
import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend import feed
from backend.agents.service import AGENTS
from backend.repos import service as repos_svc

agents = APIRouter()
console = APIRouter()

SSE_HEADERS = {"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}


class RunBody(BaseModel):
    text: str
    tool: str = ""          # set by the console's buttons: run exactly this tool, no planning
    args: dict = {}


@agents.post("/runs")
async def start_run(body: RunBody):          # async: the run is scheduled on this event loop
    text = body.text.strip()
    if not text:
        raise HTTPException(422, "Say or type a command first.")
    direct = {"tool": body.tool, "args": body.args} if body.tool else None
    return AGENTS.start(text[:4000], "button" if direct else "command", direct).to_json()


@agents.get("/runs")
def list_runs(limit: int = 50):
    return {"runs": AGENTS.recent(max(1, min(limit, 200))), "version": AGENTS.version}


@agents.get("/runs/{rid}")
def get_run(rid: str):
    run = AGENTS.get(rid)
    if run is None:
        raise HTTPException(404, "no such run")
    return run.to_json()


@agents.get("/runs/{rid}/stream")
async def stream_run(rid: str, request: Request):
    if AGENTS.get(rid) is None:
        raise HTTPException(404, "no such run")

    async def events():
        last = None
        while not await request.is_disconnected():
            seen = AGENTS.version
            snap = json.dumps(AGENTS.get(rid).to_json())
            if snap != last:
                last = snap
                yield f"event: run\ndata: {snap}\n\n"
            else:
                yield ": heartbeat\n\n"
            await AGENTS.wait_change(seen, 25)

    return StreamingResponse(events(), media_type="text/event-stream", headers=SSE_HEADERS)


@console.get("/feed")
def get_feed(limit: int = 80):
    return feed.build(limit)


@console.get("/feed/stream")
async def stream_feed(request: Request):
    async def events():
        last_v = None
        while not await request.is_disconnected():
            v = feed.version()
            if v != last_v:
                last_v = v
                yield f"event: feed\ndata: {json.dumps(feed.build(80))}\n\n"
            else:
                yield ": heartbeat\n\n"
            for _ in range(10):                   # poll the sources' versions every 2 s, 20 s heartbeat
                await asyncio.sleep(2)
                if feed.version() != last_v or await request.is_disconnected():
                    break

    return StreamingResponse(events(), media_type="text/event-stream", headers=SSE_HEADERS)


@console.get("/read/{kind}/{ref:path}")
async def read_item(kind: str, ref: str):
    doc = await feed.read(kind, ref)
    if doc is None:
        raise HTTPException(404, f"nothing to read for {kind} {ref}")
    return doc


@console.get("/repos")
def repos():
    return repos_svc.REPOS.snapshot()


@console.post("/repos/refresh")
def repos_refresh():
    repos_svc.REPOS.refresh()
    return {"queued": True}


@console.get("/repos/settings")
def repos_settings():
    return repos_svc.settings()


@console.put("/repos/settings")
def repos_settings_put(body: dict):
    return repos_svc.save_settings(body)
