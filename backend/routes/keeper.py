"""
/keeper — the credential dashboard's backend.

  GET  /keeper/status  value-free snapshot of every credential (state, expiry, detail)
  GET  /keeper/stream  Server-Sent Events: the snapshot now, then again on every change,
                       with a comment heartbeat so proxies don't drop an idle stream
  POST /keeper/check   probe everything now (the dashboard's "check now" button)

Nothing here ever returns a credential value — see backend/keeper/service.py.
"""

import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from backend.keeper.service import KEEPER

router = APIRouter()

HEARTBEAT = 25  # seconds; under the usual 30-60 s idle timeouts of proxies


@router.get("/status")
def keeper_status():
    return KEEPER.snapshot()


@router.post("/check")
def keeper_check():
    KEEPER.check_now()
    return {"queued": True}


@router.get("/stream")
async def keeper_stream(request: Request):
    async def events():
        seen = -1
        while not await request.is_disconnected():
            if KEEPER.version != seen:
                seen = KEEPER.version
                yield f"event: status\ndata: {json.dumps(KEEPER.snapshot())}\n\n"
            else:
                yield ": heartbeat\n\n"
            await KEEPER.wait_change(seen, HEARTBEAT)

    return StreamingResponse(events(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache, no-transform",
                                      "X-Accel-Buffering": "no"})
