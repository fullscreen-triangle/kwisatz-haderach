"""
/mail — the unified inbox's backend (all accounts, extracted).

  GET  /mail/messages          list: ?account= &category= &needs_action=1 &include_done=0 &limit=
  GET  /mail/messages/{key}    one message: full text + extraction + where the planner put it
  POST /mail/messages/{key}/done   {done: bool} — "dealt with" (never touches the provider)
  GET  /mail/status            accounts (value-free), counts, what is being extracted now
  GET  /mail/stream            SSE: status now, then on every fetch/extraction
  POST /mail/sync              poll every account now
  GET  /mail/search?q=&k=      spraypaint over the markdown mirror (one scene per account)
  GET  /mail/memory?q=         chigutiro's graded answer over mail + everything else it holds
"""

import asyncio
import json

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.mail import memory, search
from backend.mail.service import MAIL

router = APIRouter()


def _placements(key: str) -> list:
    try:
        from backend.planner.service import PLANNER
    except ImportError:
        return []
    return PLANNER.blocks_for_source(key)


@router.get("/messages")
def list_messages(account: str = "", category: str = "", needs_action: bool = False,
                  include_done: bool = True, limit: int = 200, since: str = ""):
    items = MAIL.store.list(account=account, category=category, needs_action=needs_action,
                            include_done=include_done, limit=max(1, min(limit, 1000)), since=since)
    for it in items:
        it["scheduled"] = _placements(it["key"])
    return {"messages": items, **MAIL.snapshot()}


@router.get("/messages/{key}")
def get_message(key: str):
    m = MAIL.store.get_message(key)
    if not m:
        raise HTTPException(404, "no such message")
    ex = MAIL.store.extraction(key) or {}
    return {"key": m.key, "account": m.account, "folder": m.folder, "date": m.date.isoformat(),
            "from_name": m.from_name, "from_addr": m.from_addr, "to": m.to, "cc": m.cc,
            "subject": m.subject, "text": m.text, "bulk": m.bulk, "owner": m.owner,
            "status": ex.get("status"), "triage": ex.get("triage"), "extraction": ex.get("data"),
            "error": ex.get("error"), "scheduled": _placements(key)}


class DoneBody(BaseModel):
    done: bool = True


@router.post("/messages/{key}/done")
async def set_done(key: str, body: DoneBody):
    if not MAIL.store.set_done(key, body.done):
        raise HTTPException(404, "no such message")
    MAIL._notify_listeners()        # its tasks leave (or re-enter) the plan
    await MAIL.bump()
    return {"ok": True}


@router.get("/status")
def status():
    return MAIL.snapshot()


@router.post("/sync")
def sync():
    MAIL.sync_now()
    return {"queued": True}


@router.get("/stream")
async def stream(request: Request):
    async def events():
        seen = -1
        while not await request.is_disconnected():
            if MAIL.version != seen:
                seen = MAIL.version
                yield f"event: status\ndata: {json.dumps(MAIL.snapshot())}\n\n"
            else:
                yield ": heartbeat\n\n"
            await MAIL.wait_change(seen, 25)

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"})


@router.get("/search")
async def mail_search(q: str, k: int = 12, scenes: str = ""):
    if not q.strip():
        raise HTTPException(422, "empty query")
    result = await asyncio.to_thread(search.ask, MAIL.store.md_root, q, max(1, min(k, 50)),
                                     [s for s in scenes.split(",") if s] or None)
    # Map each passage back to its message so the page can open it.
    for r in result.get("results", []):
        stem = r.get("path", "").rsplit("/", 1)[-1].removesuffix(".md")
        acct = r.get("path", "").split("/", 1)[0]
        r["key"] = f"{acct}:{stem}" if stem else None
    return result


@router.get("/memory")
async def mail_memory(q: str, budget: int = 8):
    if not memory.configured(MAIL.env):
        raise HTTPException(503, "chigutiro is not configured on the node (CHIGUTIRO_TOKEN)")
    try:
        async with httpx.AsyncClient() as client:
            return await memory.ask(client, MAIL.env, q, budget)
    except httpx.HTTPError as e:
        raise HTTPException(502, f"chigutiro unreachable ({type(e).__name__})")
