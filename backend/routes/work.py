"""
/work — Kundai's work desk (backend/work), read only.

  GET  /work                 the latest snapshot (projects, brief, threads, plan, decisions …)
  POST /work/refresh         read the desk again now; returns the new snapshot
  GET  /work/file?doc=       one desk document (.md / .toml), e.g. a project's status or a brief
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.work.service import WORK

router = APIRouter()


@router.get("")
def snapshot():
    return WORK.snapshot()


@router.post("/refresh")
async def refresh():
    if WORK.running:
        return {**WORK.snapshot(), "note": "a read is already running"}
    return await WORK.run_pass()


@router.get("/file")
async def file(doc: str):
    from backend import laptop
    try:
        text = await WORK.file(doc)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except laptop.LaptopOffline as e:
        raise HTTPException(503, str(e))
    if text is None:
        raise HTTPException(404, "no such desk document")
    return {"doc": doc, "text": text}
