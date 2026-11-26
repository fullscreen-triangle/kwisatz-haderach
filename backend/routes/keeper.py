"""
/keeper — the credential dashboard's backend.

  GET  /keeper/status  value-free snapshot of every credential (state, expiry, detail)
  GET  /keeper/stream  Server-Sent Events: the snapshot now, then again on every change,
                       with a comment heartbeat so proxies don't drop an idle stream
  POST /keeper/check   probe everything now (the dashboard's "check now" button)

Renewing on the desk (backend/keeper/desk.py) — values in, never out:
  GET  /keeper/desk               what can be renewed here, and with which fields
  POST /keeper/renew/{id}         {values}: checked with the provider, kept only if accepted
  POST /keeper/setting            {name, value}: home city and coordinates
  POST /keeper/mint/{id}          {password, otp?, user?}: Gitea makes a new token (password not kept)
  POST /keeper/rotate/{id}        GitLab renews the token with itself (the keeper also does it by itself)
  POST /keeper/google/client      {text}: a new Gmail OAuth client JSON
  POST /keeper/google/client-fields {client_id, client_secret, kind}: the same, typed or pasted
  POST /keeper/google/start       a Google sign-in link
  POST /keeper/google/finish      {code, state} or {pasted}: the new Gmail token
  POST /keeper/desk/absorbed      {values: {name: ""}}: keeper pull has them in the vault

Nothing here ever returns a credential value — see backend/keeper/service.py.
"""

import json
from typing import Dict

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

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


# ------------------------------------------------------------- renewing on the desk (desk.py)
# Values go in, never out: every answer is value-free.

class Renewal(BaseModel):
    values: Dict[str, str] = Field(default_factory=dict)


class Setting(BaseModel):
    name: str
    value: str = Field(max_length=80)


class ClientJson(BaseModel):
    text: str = Field(min_length=10, max_length=20_000)


class Mint(BaseModel):
    password: str = Field(min_length=1, max_length=500)
    otp: str = Field(default="", max_length=12)
    user: str = Field(default="", max_length=100)


class ClientFields(BaseModel):
    client_id: str = Field(min_length=10, max_length=300)
    client_secret: str = Field(min_length=4, max_length=300)
    kind: str = Field(default="web", pattern="^(web|installed)$")


class Finish(BaseModel):
    code: str = Field(default="", max_length=2000)
    state: str = Field(default="", max_length=200)
    pasted: str = Field(default="", max_length=4000)


@router.get("/desk")
def desk_status():
    from backend.keeper.desk import DESK
    return {**DESK.status(), "fields": {cid: DESK.fields(cid) for cid in KEEPER.rows if DESK.fields(cid)},
            "actions": {cid: DESK.actions(cid) for cid in KEEPER.rows if DESK.actions(cid)},
            "callback": DESK.callback_url()}


@router.post("/renew/{cred_id}")
async def renew(cred_id: str, body: Renewal):
    from backend.keeper.desk import DESK
    try:
        return await DESK.renew(cred_id, body.values)
    except KeyError:
        raise HTTPException(404, "no such credential")
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/mint/{cred_id}")
async def mint(cred_id: str, body: Mint):
    from backend.keeper.desk import DESK
    try:
        return await DESK.mint(cred_id, body.password, otp=body.otp, user=body.user)
    except KeyError:
        raise HTTPException(404, "no such credential")
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/rotate/{cred_id}")
async def rotate(cred_id: str):
    from backend.keeper.desk import DESK
    try:
        return await DESK.rotate(cred_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/setting")
def setting(body: Setting):
    from backend.keeper.desk import DESK
    try:
        return DESK.set_setting(body.name, body.value)
    except ValueError as e:
        raise HTTPException(400, str(e) or "not a number")


@router.post("/google/client")
def google_client(body: ClientJson):
    from backend.keeper.desk import DESK
    try:
        return DESK.google_client(body.text)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/google/client-fields")
def google_client_fields(body: ClientFields):
    from backend.keeper.desk import DESK
    try:
        return DESK.google_client_fields(body.client_id, body.client_secret, body.kind)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/google/start")
def google_start():
    from backend.keeper.desk import DESK
    try:
        return DESK.google_start()
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/google/finish")
async def google_finish(body: Finish):
    from backend.keeper.desk import DESK
    try:
        return await DESK.google_finish(code=body.code, state=body.state, pasted=body.pasted)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/desk/absorbed")
def desk_absorbed(body: Renewal):
    """`keeper pull` brought these names into the vault: drop the desk copies (values ignored)."""
    from backend.keeper.desk import DESK
    names = [n for n in body.values if n in DESK.meta()]
    if names:
        DESK.drop(names, "brought into the vault by keeper pull")
    return {"dropped": names}


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
