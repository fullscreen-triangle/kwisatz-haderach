"""
Desk Router — runs on Railway (free tier, always-on).
Acts as a smart proxy: tries Chromebook first, falls back to Codespaces, then Render.
Vercel always points to this single stable URL — never needs updating.

Set these env vars on Railway:
  BACKEND_CHROMEBOOK=https://xxx.trycloudflare.com
  BACKEND_CODESPACES=https://xxx-8000.app.github.dev
  BACKEND_RENDER=https://desk-backend.onrender.com
"""

import os
import asyncio
import httpx
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Desk Router", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKENDS = [
    os.getenv("BACKEND_CHROMEBOOK", ""),
    os.getenv("BACKEND_CODESPACES", ""),
    os.getenv("BACKEND_RENDER", ""),
]

PING_TIMEOUT = 3.0   # seconds to wait for /ping response
PROXY_TIMEOUT = 55.0  # seconds for actual proxied requests


async def _ping(client: httpx.AsyncClient, url: str) -> bool:
    if not url:
        return False
    try:
        r = await client.get(f"{url}/ping", timeout=PING_TIMEOUT)
        return r.status_code == 200
    except Exception:
        return False


async def _pick_backend() -> str | None:
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[_ping(client, b) for b in BACKENDS])
    for backend, alive in zip(BACKENDS, results):
        if alive:
            return backend
    return None


@app.get("/")
def root():
    return {"service": "desk-router", "backends": [b for b in BACKENDS if b]}


@app.get("/status")
async def status():
    """Check which backends are currently alive."""
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[_ping(client, b) for b in BACKENDS])
    return {
        "chromebook": results[0] if len(results) > 0 else False,
        "codespaces": results[1] if len(results) > 1 else False,
        "render": results[2] if len(results) > 2 else False,
    }


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(path: str, request: Request):
    backend = await _pick_backend()
    if not backend:
        raise HTTPException(
            status_code=503,
            detail="All backends offline. Start Chromebook backend or spin up Codespaces."
        )

    url = f"{backend}/{path}"
    body = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)

    async with httpx.AsyncClient(timeout=PROXY_TIMEOUT) as client:
        try:
            resp = await client.request(
                method=request.method,
                url=url,
                params=dict(request.query_params),
                headers=headers,
                content=body,
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail=f"Backend {backend} timed out")
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=dict(resp.headers),
        media_type=resp.headers.get("content-type"),
    )
