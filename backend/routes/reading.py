"""
/reading — reading tasks: a witnessed knowledge graph (okgg) over chosen repos, read on the phone.

  GET    /reading                      tasks, with run state and progress
  POST   /reading                      {title, repos[], theta?, budget?} — creates and starts the first run
  PATCH  /reading/{id}                 {title?, repos?, theta?, budget?}
  DELETE /reading/{id}
  POST   /reading/{id}/run             {generator?: ollama|lexical} — rebuild the graph now
  GET    /reading/repos                the GitHub inventory to choose from
  GET    /reading/{id}/node[/{nid}]    a descent-tree node: label, children, its sections, progress
  GET    /reading/{id}/ideas           okgg's induced concepts, each with its sections and read share
  GET    /reading/{id}/section?key=&node=   one section's text, cue lines, permalink, next unread
  POST   /reading/{id}/read            {key, read}
"""

import asyncio
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.reading import index, runner, store

router = APIRouter()


def _with_progress(t: dict) -> dict:
    ix = index.index(t["id"])
    read = set(store.progress(t["id"]))
    return {**t, "sections": len(ix.keys) if ix else 0, "read": len(read & set(ix.keys)) if ix else 0, "ideas": len(ix.report.get("concepts", [])) if ix else 0}


def _start(tid: str, generator: str = "ollama") -> None:
    store.update(tid, {"run": {"state": "queued", "error": ""}})
    asyncio.get_running_loop().create_task(asyncio.to_thread(runner.run, tid, generator))


@router.get("")
@router.get("/")
def list_tasks():
    return {"tasks": [_with_progress(t) for t in store.tasks()], "okgg": bool(runner.okgg_bin())}


class NewTask(BaseModel):
    title: str
    repos: List[str]
    theta: float = 0.9
    budget: int = 20


@router.post("")
@router.post("/")
async def create_task(body: NewTask):
    try:
        t = store.create(body.title, body.repos, body.theta, body.budget)
    except ValueError as e:
        raise HTTPException(422, str(e))
    _start(t["id"])
    return t


@router.get("/repos")
def repos():
    from backend.repos import service as rs
    if not rs.inventory():
        try:
            rs.refresh_inventory()              # first use on a node: list the owner's repos from GitHub
        except Exception:
            pass
    inv = [{"name": r.get("name"), "description": r.get("description") or "", "pushed_at": r.get("pushed_at"),
            "language": r.get("language"), "private": r.get("private")}
           for r in rs.inventory() if r.get("name") and not r.get("fork") and not r.get("archived")]
    inv.sort(key=lambda r: r.get("pushed_at") or "", reverse=True)
    return {"repos": inv}


@router.patch("/{tid}")
def patch_task(tid: str, body: dict):
    try:
        return store.update(tid, body)
    except KeyError:
        raise HTTPException(404, "no such task")


@router.delete("/{tid}")
def delete_task(tid: str):
    store.delete(tid)
    return {"ok": True}


class RunBody(BaseModel):
    generator: str = "ollama"


@router.post("/{tid}/run")
async def run_task(tid: str, body: Optional[RunBody] = None):
    if store.get(tid) is None:
        raise HTTPException(404, "no such task")
    gen = (body.generator if body else "ollama")
    if gen not in ("ollama", "lexical"):
        raise HTTPException(422, "generator is ollama or lexical")
    _start(tid, gen)
    return {"queued": True}


@router.get("/{tid}/node")
@router.get("/{tid}/node/{nid}")
def node(tid: str, nid: str = ""):
    out = index.node_view(tid, nid)
    if out is None:
        raise HTTPException(404, "no such task or node — the graph may have been rebuilt; start from the top")
    return out


@router.get("/{tid}/ideas")
def ideas(tid: str):
    ix = index.index(tid)
    return {"ideas": ix.ideas(set(store.progress(tid))) if ix else []}


@router.get("/{tid}/section")
def section(tid: str, key: str, node: str = ""):
    out = index.section_view(tid, key, node)
    if out is None:
        raise HTTPException(404, "no such section in this task's graph")
    return out


class ReadBody(BaseModel):
    key: str
    read: bool = True


@router.post("/{tid}/read")
def mark_read(tid: str, body: ReadBody):
    if store.get(tid) is None:
        raise HTTPException(404, "no such task")
    repo = index.split_key(body.key)[0]
    store.mark(tid, body.key, body.read, runner.head_of(repo))
    return {"ok": True}
