"""
The laptop node's HTTP API. Every route but /health needs `Authorization: Bearer <token>`;
every path goes through config.servable (inside a served root, never a credential).

  GET /health                       alive, how many files are indexed, when
  GET /search?q=&k=&content=1       filename hits (+ Windows Search content hits)
  GET /list?path=                   a folder's entries
  GET /read?path=&max=              a file's text (PDF/Word/HTML/text), for reading and summaries
  GET /file?path=                   the file's bytes, for opening on the phone or attaching to mail
"""

from __future__ import annotations

import hmac
import mimetypes
import socket
import threading
import time
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import FileResponse

from tools.laptop_node import config, index, winsearch

MAX_FILE = 100 * 1024 * 1024
MAX_READ = 30 * 1024 * 1024

app = FastAPI(title="laptop node", docs_url=None, redoc_url=None, openapi_url=None)


def auth(authorization: str = Header(default="")) -> None:
    want = config.token()
    got = authorization.removeprefix("Bearer ").strip()
    if not want or not hmac.compare_digest(got.encode(), want.encode()):
        raise HTTPException(401, "unauthorized")


def _path(raw: str) -> Path:
    try:
        return config.servable(raw)
    except ValueError as e:
        raise HTTPException(404 if "no such" in str(e) else 403, str(e))


def _entry(p: Path) -> dict:
    st = p.stat()
    return {"path": str(p), "name": p.name, "dir": p.is_dir(), "size": st.st_size, "mtime": st.st_mtime}


@app.get("/health")
def health():
    return {"ok": True, "host": socket.gethostname(), **index.stats()}   # no token: nothing about paths


@app.get("/search", dependencies=[Depends(auth)])
def search(q: str, k: int = Query(20, ge=1, le=100), content: bool = True, under: str = ""):
    names = index.search(q, k, under or None)
    found = {r["path"]: r for r in names}
    if content:
        for r in winsearch.search(q, k):
            if r["path"] in found:
                found[r["path"]]["where"] = "name+content"
            else:
                found[r["path"]] = r
    results = sorted(found.values(), key=lambda r: (r["where"] == "name+content", r.get("score", 0)),
                     reverse=True)
    # interleave so a strong content hit isn't buried under twenty filename matches
    named = [r for r in results if r["where"] != "content"]
    content_only = [r for r in results if r["where"] == "content"]
    merged = []
    while named or content_only:
        merged += named[:3]
        named = named[3:]
        merged += content_only[:1]
        content_only = content_only[1:]
    return {"query": q, "results": merged[:k]}


@app.get("/list", dependencies=[Depends(auth)])
def listing(path: str = ""):
    if not path:
        return {"path": "", "entries": [{**_entry(r), "dir": True} for r in config.roots()]}
    d = _path(path)
    if not d.is_dir():
        raise HTTPException(400, "not a folder")
    entries = []
    for c in sorted(d.iterdir(), key=lambda c: (not c.is_dir(), c.name.lower())):
        if config.denied(c) or (c.is_dir() and c.name in config.DENY_DIRS):
            continue
        try:
            entries.append(_entry(c))
        except OSError:
            continue
    return {"path": str(d), "entries": entries[:500], "truncated": len(entries) > 500}


@app.get("/read", dependencies=[Depends(auth)])
def read(path: str, max: int = Query(200_000, ge=1000, le=200_000)):
    from backend.text_extract import text_of
    p = _path(path)
    if p.is_dir():
        raise HTTPException(400, "that is a folder — use /list")
    size = p.stat().st_size
    if size > MAX_READ:
        return {**_entry(p), "text": "", "note": f"too large to read ({size // 1024 // 1024} MB)"}
    ctype = mimetypes.guess_type(p.name)[0] or ""
    text = text_of(p.read_bytes(), ctype, p.name)
    return {**_entry(p), "type": ctype, "text": text[:max], "truncated": len(text) > max,
            "note": "" if text else "no text in this file (image, binary, or a scan without OCR)"}


@app.get("/file", dependencies=[Depends(auth)])
def file(path: str):
    p = _path(path)
    if p.is_dir():
        raise HTTPException(400, "that is a folder")
    if p.stat().st_size > MAX_FILE:
        raise HTTPException(413, "file larger than 100 MB")
    return FileResponse(p, filename=p.name, content_disposition_type="inline",
                        media_type=mimetypes.guess_type(p.name)[0] or "application/octet-stream")


def start_indexer() -> None:
    threading.Thread(target=index.loop, name="laptop-index", daemon=True).start()


def tailscale_ip(wait: float = 300) -> str:
    """The laptop's tailnet IPv4. Waits for Tailscale to come up (it starts after logon)."""
    import subprocess
    deadline = time.time() + wait
    while True:
        try:
            r = subprocess.run([str(config.TAILSCALE), "ip", "-4"], capture_output=True, text=True, timeout=10,
                               creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            ip = (r.stdout or "").strip().splitlines()[0] if r.returncode == 0 and r.stdout.strip() else ""
            if ip.startswith("100."):
                return ip
        except (OSError, subprocess.TimeoutExpired, IndexError):
            pass
        if time.time() > deadline:
            raise SystemExit("Tailscale has no IPv4 address — is it logged in?")
        time.sleep(10)
