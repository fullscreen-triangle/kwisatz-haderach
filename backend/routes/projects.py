"""
Projects route — CRUD over the Project Manager tracker (tools/project_manager).

Mirrors jobcenter.py's shape: thin FastAPI endpoints over a JSON store, no
business logic here beyond translating HTTP <-> tracker calls. All status is
manually logged, never auto-probed (see tools/project_manager/README.md for
why: the tracked sub-tools are separate repos run remotely).
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from tools.project_manager import tracker

router = APIRouter()


class LogEntry(BaseModel):
    text: str


class StatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None


@router.get("/")
def list_projects():
    projects = tracker.list_projects()
    return {"projects": [tracker.project_report(p["id"]) for p in projects]}


@router.get("/{project_id}")
def get_project(project_id: str):
    try:
        project = tracker.get_project(project_id)
        report = tracker.project_report(project_id)
    except tracker.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {**project, "report": report}


@router.post("/{project_id}/log")
def add_log_entry(project_id: str, entry: LogEntry):
    try:
        result = tracker.add_log_entry(project_id, entry.text)
    except tracker.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    return result


@router.patch("/{project_id}/milestones/{milestone_id}")
def update_milestone(project_id: str, milestone_id: str, update: StatusUpdate):
    try:
        result = tracker.set_milestone_status(project_id, milestone_id, update.status, update.notes)
    except tracker.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return result


@router.patch("/{project_id}/subtools/{subtool_id}")
def update_subtool(project_id: str, subtool_id: str, update: StatusUpdate):
    try:
        result = tracker.set_subtool_status(project_id, subtool_id, update.status)
    except tracker.NotFound as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    return result
