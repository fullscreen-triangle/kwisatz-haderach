"""
AI chat route — queries Ollama (local) with desk data as context.
Ollama must be running: `ollama serve` and model pulled: `ollama pull llama3.2:3b`
"""

import os
import json
import httpx
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()
ROOT = Path(__file__).parent.parent.parent

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

SYSTEM_PROMPT = """You are a personal assistant embedded in Kundai's desk dashboard in Munich.
You have access to his data: health metrics, grocery prices, job applications, bank transactions, and government deadlines.
When asked a question, answer concisely and factually using the context provided.
If data is missing, say so clearly. Do not make up numbers.
Respond in the same language the user writes in (English or German).
"""


class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None  # caller can inject relevant data


class ChatResponse(BaseModel):
    reply: str
    model: str


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    context_block = ""
    if req.context:
        context_block = "\n\n[Current data context]\n" + json.dumps(req.context, indent=2, ensure_ascii=False)

    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT + context_block},
            {"role": "user", "content": req.message},
        ],
        "stream": False,
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
            resp.raise_for_status()
            data = resp.json()
            reply = data["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Ollama not running. Start it with: ollama serve"
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    return ChatResponse(reply=reply, model=OLLAMA_MODEL)


@router.get("/models")
async def list_models():
    """List models available in Ollama."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            return resp.json()
    except Exception:
        return {"models": [], "error": "Ollama not reachable"}
