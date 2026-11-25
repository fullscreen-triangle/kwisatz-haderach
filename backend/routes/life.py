"""
/life — the facts about Kundai the desk keeps current from mail (backend/life).

  GET  /life                 every slot by topic: known / to confirm / unknown, with its quotes
  POST /life/confirm         {slot, value}: your word on a fact (value null = does not apply)
  POST /life/read            read new mail for facts now (otherwise every 15 minutes)
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.life.service import LIFE

router = APIRouter()


@router.get("")
def view():
    return LIFE.view()


class Confirm(BaseModel):
    slot: str = Field(min_length=1, max_length=64)
    value: Optional[str] = Field(default=None, max_length=200)


@router.post("/confirm")
def confirm(c: Confirm):
    try:
        return LIFE.confirm(c.slot, c.value)
    except KeyError:
        raise HTTPException(404, "no such fact")
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/read")
def read_now():
    LIFE.refresh()
    return {"ok": True, "running": LIFE.running}
