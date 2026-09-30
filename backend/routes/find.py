"""
/find — search everywhere (laptop, mail, web) as a Harare run; see backend/find.py.

  POST /find           {query} -> {run}
  GET  /find/{run}     per source: state, spraypaint verdict, passages (poll until quiescent)
  GET  /find           recent searches
"""

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend import find

router = APIRouter()


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=30)


def _subject(key: str):
    try:
        from backend.mail.service import MAIL
        m = MAIL.store.get_message(key)
        return m.subject if m else None
    except Exception:
        return None


class FindBody(BaseModel):
    query: str


async def start(query: str) -> str:
    from backend.mail.service import MAIL
    async with _client() as c:
        return await find.start(c, query, str(MAIL.store.md_root))


@router.post("")
@router.post("/")
async def create(body: FindBody):
    q = body.query.strip()
    if not q:
        raise HTTPException(422, "empty query")
    try:
        return {"run": await start(q), "query": q}
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Harare is not answering on this node ({type(e).__name__})")


@router.get("")
@router.get("/")
async def recent():
    try:
        async with _client() as c:
            return {"runs": (await find.runs(c))[:30]}
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Harare is not answering on this node ({type(e).__name__})")


@router.get("/{run}")
async def get(run: str):
    try:
        async with _client() as c:
            rep = await find.report(c, run)
    except httpx.HTTPStatusError as e:
        raise HTTPException(404 if e.response.status_code == 404 else 502, "no such search")
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Harare is not answering on this node ({type(e).__name__})")
    return find.shape(rep, _subject)
