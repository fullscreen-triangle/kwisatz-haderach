"""
Desk backend — FastAPI server.
Runs on Chromebook (primary) or Codespaces (overflow).
Exposes all Python tool results as HTTP endpoints for Vercel to call.
"""

import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add repo root to path so tools/ is importable
ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from backend.routes import health, grocery, chat, bank, jobcenter, intent

app = FastAPI(title="Desk Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to your Vercel domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router,     prefix="/health",     tags=["health"])
app.include_router(grocery.router,    prefix="/grocery",    tags=["grocery"])
app.include_router(chat.router,       prefix="/chat",       tags=["chat"])
app.include_router(bank.router,       prefix="/bank",       tags=["bank"])
app.include_router(jobcenter.router,  prefix="/jobcenter",  tags=["jobcenter"])
app.include_router(intent.router,     prefix="/intent",     tags=["intent"])


@app.get("/")
def root():
    return {"status": "ok", "service": "desk-backend"}


@app.get("/ping")
def ping():
    """Used by the Railway router to check if this node is alive."""
    return {"alive": True}
