"""
/forms — filling in documents (backend/forms).

  GET  /forms                       your forms
  POST /forms                       {title, pdf_b64? | labels?} → the form
  GET  /forms/{id}                  fields with status, value, leader, margin, quotes
  POST /forms/{id}/sources          {name, data_b64, ctype?} | {laptop_path}
  POST /forms/{id}/read             {allow_cloud?} — a model proposes values with quotes (background)
  POST /forms/{id}/answer           {field, value | null, remember?}
  GET  /forms/{id}/filled           the PDF with solved fields written (or a value sheet)
"""

from __future__ import annotations

import asyncio
import base64
import binascii
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from backend.forms.service import service

router = APIRouter()


class NewForm(BaseModel):
    title: str = ""
    pdf_b64: Optional[str] = None
    labels: Optional[List[str]] = None


class Source(BaseModel):
    name: str = ""
    data_b64: Optional[str] = None
    ctype: str = ""
    laptop_path: Optional[str] = None


class Read(BaseModel):
    allow_cloud: bool = False


class Answer(BaseModel):
    field: str
    value: Optional[str] = None
    remember: bool = True


def _b64(s: str) -> bytes:
    try:
        return base64.b64decode(s.split(",", 1)[-1], validate=False)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "the file is not valid base64")


def _view(fid: str) -> dict:
    try:
        return service().view(fid)
    except KeyError:
        raise HTTPException(404, "no such form")


@router.get("")
def forms():
    return service().recent()


@router.post("")
def create(body: NewForm):
    try:
        f = service().create(body.title, _b64(body.pdf_b64) if body.pdf_b64 else None, body.labels)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return service().view(f["id"])


@router.get("/{fid}")
def view(fid: str):
    return _view(fid)


@router.post("/{fid}/sources")
async def add_source(fid: str, body: Source):
    _view(fid)
    try:
        if body.laptop_path:
            await service().add_laptop_source(fid, body.laptop_path)
        elif body.data_b64:
            service().add_source(fid, body.name or "document", _b64(body.data_b64), body.ctype)
        else:
            raise HTTPException(400, "give data_b64 or laptop_path")
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:                       # the laptop node is off, the path is wrong …
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(502, f"could not fetch the document: {type(e).__name__}: {e}"[:300])
    return _view(fid)


@router.post("/{fid}/read")
async def read(fid: str, body: Read):
    _view(fid)
    asyncio.get_running_loop().create_task(service().read(fid, allow_cloud=body.allow_cloud))
    await asyncio.sleep(0)                       # let it mark the form as reading before we answer
    return _view(fid)


@router.post("/{fid}/answer")
def answer(fid: str, body: Answer):
    try:
        return service().answer(fid, body.field, body.value, body.remember)
    except KeyError:
        raise HTTPException(404, "no such form or field")


@router.post("/{fid}/confirm-quoted")
def confirm_quoted(fid: str):
    try:
        return service().confirm_quoted(fid)
    except KeyError:
        raise HTTPException(404, "no such form")


@router.get("/{fid}/filled")
def filled(fid: str):
    _view(fid)
    data, name, ctype = service().filled(fid)
    return Response(data, media_type=ctype, headers={"Content-Disposition": f'attachment; filename="{name}"'})
