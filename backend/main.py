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
from fastapi.responses import HTMLResponse

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


# --- Same-origin dictation page ---------------------------------------------
# Served straight from this node so the phone can reach it over plain HTTP on the
# Tailnet (http://<tailscale-ip>:8000/command) with NO mixed-content block — the
# page and the /intent call it makes share this exact origin. This is the
# Option-A round-trip surface: open it on the phone, tap the field, dictate with
# the keyboard mic, hit Run. It POSTs to /intent/ (trailing slash — no redirect).
COMMAND_PAGE = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<title>Agent Smith</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font:16px/1.5 -apple-system,system-ui,sans-serif;
         background:#0b0d10; color:#e8eaed; padding:max(16px,env(safe-area-inset-top)) 16px 16px; }
  h1 { font-size:15px; font-weight:600; letter-spacing:.02em; color:#8ab4f8; margin:0 0 14px; }
  textarea { width:100%; min-height:120px; padding:14px; font-size:17px; border-radius:12px;
             border:1px solid #2a2f36; background:#14171b; color:#e8eaed; resize:vertical; }
  textarea:focus { outline:2px solid #8ab4f8; border-color:transparent; }
  button { width:100%; margin-top:12px; padding:15px; font-size:17px; font-weight:600;
           border:0; border-radius:12px; background:#8ab4f8; color:#0b0d10; }
  button:active { background:#6ea0f0; }
  button:disabled { opacity:.5; }
  .hint { font-size:13px; color:#7a828c; margin:8px 2px 0; }
  pre { white-space:pre-wrap; word-break:break-word; background:#14171b; border:1px solid #2a2f36;
        border-radius:12px; padding:14px; margin-top:16px; font-size:14px; overflow-x:auto; }
  .meta { display:flex; gap:14px; font-size:13px; color:#9aa0a6; margin-top:12px; }
  .meta b { color:#e8eaed; font-weight:600; }
  .err { color:#f28b82; }
</style></head><body>
<h1>AGENT SMITH · say a command</h1>
<textarea id="t" placeholder="Tap here, then the mic on your keyboard. e.g. where is the tick loop"></textarea>
<button id="go">Run</button>
<div class="hint">Uses your keyboard's dictation. Nothing leaves your Tailnet.</div>
<div id="meta" class="meta" hidden></div>
<pre id="out" hidden></pre>
<script>
const t=document.getElementById('t'), go=document.getElementById('go'),
      out=document.getElementById('out'), meta=document.getElementById('meta');
async function run(){
  const text=t.value.trim(); if(!text) return;
  go.disabled=true; go.textContent='Running…'; out.hidden=false; meta.hidden=true;
  out.className=''; out.textContent='…';
  try{
    // trailing slash -> hits the handler directly, no 307 redirect
    const r=await fetch('/intent/',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text})});
    const body=await r.text(); let j; try{j=JSON.parse(body);}catch{ j=null; }
    if(!r.ok){
      out.className='err';
      out.textContent='HTTP '+r.status+'\\n'+(j?(j.detail||body):body);
    } else {
      const s=j.slice||{};
      out.textContent = s.kind==='purpose'
        ? (s.text||'(no results)')
        : JSON.stringify(s.results||s,null,2);
      meta.hidden=false;
      meta.innerHTML='tool <b>'+j.tool+'</b>'+'&nbsp;·&nbsp;query <b>'+j.query+'</b>'
                    +'&nbsp;·&nbsp;m <b>'+j.m+'</b>';
    }
  }catch(e){ out.className='err'; out.textContent='Network error: '+e.message
      +'\\n\\nIs the backend up and are you on the Tailnet?'; }
  go.disabled=false; go.textContent='Run';
}
go.onclick=run;
t.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&e.key==='Enter') run(); });
</script>
</body></html>"""


@app.get("/command", response_class=HTMLResponse)
def command_page():
    """The phone-facing dictation surface (same-origin, plain HTTP, no build step)."""
    return COMMAND_PAGE
