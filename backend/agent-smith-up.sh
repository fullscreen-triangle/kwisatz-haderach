#!/usr/bin/env bash
# Agent Smith — one-shot bring-up + self-diagnosis for the Chromebook node.
#
# Run on the Chromebook (Crostini Linux terminal) from the repo:
#     bash backend/agent-smith-up.sh
#
# It diagnoses everything the phone round-trip needs, fixes what it can, then
# starts FastAPI bound to 0.0.0.0 (Tailnet-reachable) and self-tests /intent
# before handing you the exact URL to point the phone at. No Cloudflare, no
# Railway — Option A (phone talks to this node directly over Tailscale).

set -uo pipefail

# --- pretty helpers ----------------------------------------------------------
c_ok()   { printf '\033[32m  OK\033[0m  %s\n' "$1"; }
c_bad()  { printf '\033[31m FAIL\033[0m  %s\n' "$1"; }
c_warn() { printf '\033[33m WARN\033[0m  %s\n' "$1"; }
c_info() { printf '\033[36m INFO\033[0m  %s\n' "$1"; }
hr()     { printf '\033[90m%s\033[0m\n' "----------------------------------------------------------------"; }

PORT="${PORT:-8000}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
FAIL=0

echo
printf '\033[1m Agent Smith — node bring-up\033[0m\n'
echo " repo: $REPO   port: $PORT"
hr

# --- 1. Tailscale IP (how the phone will reach us) ---------------------------
TS_IP=""
if command -v tailscale >/dev/null 2>&1; then
  TS_IP="$(tailscale ip -4 2>/dev/null | head -1)"
fi
if [ -z "$TS_IP" ]; then
  # fall back to the 100.64.0.0/10 CGNAT range Tailscale uses
  TS_IP="$(ip -4 addr 2>/dev/null | grep -oE '100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.[0-9]+\.[0-9]+' | head -1)"
fi
if [ -n "$TS_IP" ]; then
  c_ok "Tailscale IP: $TS_IP"
else
  c_warn "Could not detect a Tailscale IP. Is tailscale up on this Chromebook?"
  c_info "Try: sudo tailscale up    (then re-run this script)"
fi

# --- 2. Is something already listening on our port? --------------------------
LISTEN_LINE="$( (ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null) | grep -E "[:.]$PORT\b" | head -1 )"
if [ -n "$LISTEN_LINE" ]; then
  c_info "Port $PORT already in use:"
  echo "        $LISTEN_LINE"
  if echo "$LISTEN_LINE" | grep -qE '127\.0\.0\.1:'"$PORT"; then
    c_warn "It is bound to 127.0.0.1 (localhost only) — the phone cannot reach it."
    c_info "This script will stop it and re-bind to 0.0.0.0."
    # kill uvicorn on that port so we can rebind
    pkill -f "uvicorn.*:$PORT" 2>/dev/null && sleep 1 || true
  elif echo "$LISTEN_LINE" | grep -qE '(0\.0\.0\.0|\*|\[::\]):'"$PORT"; then
    c_ok "Already bound to all interfaces (0.0.0.0). Good."
  fi
else
  c_info "Nothing listening on port $PORT yet."
fi

# --- 3. Python venv + deps ---------------------------------------------------
VENV="$REPO/.venv"
if [ ! -d "$VENV" ]; then
  c_info "Creating virtualenv at $VENV ..."
  python3 -m venv "$VENV" || { c_bad "venv creation failed — is python3-venv installed? (sudo apt install python3-venv)"; FAIL=1; }
fi
# shellcheck disable=SC1091
source "$VENV/bin/activate" 2>/dev/null || { c_bad "could not activate venv"; FAIL=1; }
if python -c "import fastapi, uvicorn, httpx, pydantic, multipart" 2>/dev/null; then
  c_ok "Core deps present (fastapi, uvicorn, httpx, pydantic, python-multipart)."
else
  # Install the CORE set only — it is the minimum the /intent round-trip needs
  # and it excludes optional desk packages that have no wheel on this platform.
  REQ_CORE="$REPO/backend/requirements-core.txt"
  REQ_FULL="$REPO/backend/requirements.txt"
  REQ="$REQ_CORE"; [ -f "$REQ" ] || REQ="$REQ_FULL"
  c_info "Installing core backend requirements from $(basename "$REQ") ..."
  python -m pip install -q --upgrade pip >/dev/null 2>&1 || true
  if pip install -q -r "$REQ"; then
    c_ok "Core requirements installed."
  else
    c_bad "pip install failed even for the core set. Last lines:"
    pip install -r "$REQ" 2>&1 | tail -8
    FAIL=1
  fi
fi

# --- 4. Ollama (required: powers tool-choice refinement + readfile summaries) ----
# Facts and raw file-reads still work with the model down, but summaries and semantic
# repo search need it — so we now INSTALL + START + block until the model answers,
# instead of treating it as best-effort. Only a genuine install/pull failure downgrades
# to a WARN (the round-trip itself never depends on the model).
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2:3b}"
OLLAMA_EMBED_MODEL="${OLLAMA_EMBED_MODEL:-nomic-embed-text}"

if ! command -v ollama >/dev/null 2>&1; then
  c_warn "Ollama not installed — installing it now (summaries + semantic search need it)."
  if curl -fsSL https://ollama.com/install.sh | sh; then
    c_ok "Ollama installed."
  else
    c_bad "Ollama install failed. facts/readfile raw-reads still work; summaries won't."
  fi
fi

if command -v ollama >/dev/null 2>&1; then
  if ! pgrep -x ollama >/dev/null 2>&1; then
    c_info "Starting Ollama daemon..."
    (ollama serve >/tmp/ollama.log 2>&1 &)
  fi
  # Poll /api/tags up to ~30s instead of a fixed sleep — the daemon takes a variable
  # moment to bind :11434 on first start.
  OLLAMA_UP=0
  for i in $(seq 1 30); do
    if curl -s --max-time 3 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
      OLLAMA_UP=1; break
    fi
    sleep 1
  done
  if [ "$OLLAMA_UP" = "1" ]; then
    c_ok "Ollama is responding on :11434 (after ${i}s)."
    # Chat model — required for tool-choice refinement + readfile summaries. Block on pull.
    if ollama list 2>/dev/null | grep -q "${OLLAMA_MODEL%%:*}"; then
      c_ok "Chat model $OLLAMA_MODEL present."
    else
      c_info "Pulling chat model $OLLAMA_MODEL (~2 GB, first run only)..."
      ollama pull "$OLLAMA_MODEL" && c_ok "Pulled $OLLAMA_MODEL." \
        || c_warn "Pull of $OLLAMA_MODEL failed — routing still deterministic; summaries off."
    fi
    # Embedding model — powers semantic 'which repo is about X'. Keyword fallback if absent,
    # so this is a best-effort pull (don't hard-block the whole bring-up on it).
    if ollama list 2>/dev/null | grep -q "${OLLAMA_EMBED_MODEL%%:*}"; then
      c_ok "Embedding model $OLLAMA_EMBED_MODEL present."
    else
      c_info "Pulling embedding model $OLLAMA_EMBED_MODEL (small; enables semantic repo search)..."
      ollama pull "$OLLAMA_EMBED_MODEL" && c_ok "Pulled $OLLAMA_EMBED_MODEL." \
        || c_warn "Embedding pull failed — semantic repo search falls back to keyword match."
    fi
  else
    c_warn "Ollama daemon didn't answer within 30s — /intent still routes deterministically;"
    c_warn "summaries + semantic search are off until it's up. Check /tmp/ollama.log."
  fi
fi

# --- 5. Search tools on PATH (the 'hands' /intent shells out to) -------------
# These live in OTHER repos (semantics/purpose, semantics/graffiti/spraypaint)
# and are not part of this repo. Missing them does NOT block bring-up — the
# round-trip (phone -> node -> /intent -> response) still proves out; the tool
# simply reports it is not installed yet. Installing them is a later errand.
TOOLS_FOUND=0
[ -d "$HOME/.cargo/bin" ] && export PATH="$HOME/.cargo/bin:$PATH"
for tool in purpose spraypaint; do
  if command -v "$tool" >/dev/null 2>&1; then
    c_ok "$tool found: $(command -v "$tool")"; TOOLS_FOUND=$((TOOLS_FOUND+1))
  else
    c_info "$tool not installed on this node yet (round-trip still works; slice will note it)."
  fi
done
[ "$TOOLS_FOUND" = "0" ] && c_info "No search tools yet — that's fine for proving the pipe today."

hr
if [ "$FAIL" = "1" ]; then
  c_bad "One or more hard prerequisites failed above. Fix those, then re-run."
  exit 1
fi

# --- 6. Launch FastAPI bound to 0.0.0.0, in the background -------------------
c_info "Starting FastAPI (uvicorn) on 0.0.0.0:$PORT ..."
cd "$REPO"
export PYTHONPATH="$REPO"
# stop any stale instance we didn't catch above
pkill -f "uvicorn backend.main:app" 2>/dev/null && sleep 1 || true
nohup uvicorn backend.main:app --host 0.0.0.0 --port "$PORT" >/tmp/desk-backend.log 2>&1 &
BPID=$!

# --- 7. Wait for it to answer, then self-test the round-trip -----------------
c_info "Waiting for the backend to come up..."
UP=0
for i in $(seq 1 20); do
  if curl -s --max-time 3 "http://127.0.0.1:$PORT/ping" >/dev/null 2>&1; then UP=1; break; fi
  sleep 1
done

if [ "$UP" != "1" ]; then
  c_bad "Backend did not answer on :$PORT. Last log lines:"
  tail -25 /tmp/desk-backend.log
  exit 1
fi
c_ok "Backend is live (pid $BPID). Log: /tmp/desk-backend.log"

# local /intent smoke test — proves the whole pipe (choose tool -> shell -> respond).
# Capture BODY and HTTP status separately so we can tell the states apart.
c_info "Self-testing /intent locally..."
# -L so curl follows FastAPI's trailing-slash 307 (POST /intent -> /intent/);
# without it the redirect looks like an empty-body error but never reaches the handler.
RESP="$(curl -sL --max-time 60 -w $'\n%{http_code}' -X POST "http://127.0.0.1:$PORT/intent" \
  -H 'Content-Type: application/json' \
  -d '{"text":"where is the tick loop"}' 2>/dev/null)"
CODE="$(echo "$RESP" | tail -1)"
BODY="$(echo "$RESP" | sed '$d')"
if echo "$BODY" | grep -q '"tool"'; then
  c_ok "/intent returned a full slice — the pipe works end to end:"
  echo "        $(echo "$BODY" | head -c 300)"
elif [ "$CODE" = "501" ] || echo "$BODY" | grep -qi 'not installed'; then
  c_ok "PIPE VERIFIED: /intent ran, chose a tool, and correctly reported the search"
  c_ok "organ isn't installed on this node yet (HTTP 501). This is expected today —"
  c_ok "dictation -> node -> response is proven. Install purpose/spraypaint later"
  c_ok "to get real slices back."
elif [ "$CODE" = "503" ] || echo "$BODY" | grep -qi 'ollama'; then
  c_ok "PIPE VERIFIED: /intent ran and reached the tool-choice step, but Ollama isn't"
  c_ok "up on this node (HTTP 503). dictation -> node -> handler is proven. Start"
  c_ok "Ollama (ollama serve + a small model) to get real tool-choice + slices back."
else
  c_warn "/intent returned HTTP $CODE with an unexpected body:"
  echo "        $(echo "$BODY" | head -c 400)"
  c_info "Server is up regardless; check /tmp/desk-backend.log."
fi

# facts smoke test — the headline new routine, answered from disk with NO model needed.
# "how many github repositories do I have" should route to facts and return the count (63).
c_info "Self-testing the facts routine (works with Ollama down)..."
FRESP="$(curl -sL --max-time 30 -w $'\n%{http_code}' -X POST "http://127.0.0.1:$PORT/intent/" \
  -H 'Content-Type: application/json' \
  -d '{"text":"how many github repositories do I have"}' 2>/dev/null)"
FCODE="$(echo "$FRESP" | tail -1)"
FBODY="$(echo "$FRESP" | sed '$d')"
if echo "$FBODY" | grep -q '"kind":"facts"' || echo "$FBODY" | grep -q '"kind": "facts"'; then
  ANS="$(echo "$FBODY" | grep -oE '"answer":"[^"]*"' | head -1 | sed 's/"answer":"//; s/"$//')"
  c_ok "FACTS ROUTINE LIVE: \"how many repos\" -> ${ANS:-answered from desk-index.json}"
elif [ "$FCODE" = "501" ]; then
  c_warn "facts routine reached but no repo index on this node (docs/data/desk-index.json)."
  c_info "It ships with the repo — check it exists: ls docs/data/desk-index.json"
else
  c_info "facts self-test returned HTTP $FCODE. $(echo "$FBODY" | head -c 200)"
fi

# --- 8. Verify Tailnet-reachability on the real IP (not just localhost) ------
if [ -n "$TS_IP" ]; then
  if curl -s --max-time 5 "http://$TS_IP:$PORT/ping" >/dev/null 2>&1; then
    c_ok "Reachable over Tailscale at http://$TS_IP:$PORT  ← this is what the phone uses."
  else
    c_warn "Bound to 0.0.0.0 but not reachable at $TS_IP:$PORT from this host."
    c_info "On Crostini this can need the container's port exposed. Tell Claude if you see this."
  fi
fi

hr
printf '\033[1m Done.\033[0m\n'
if [ -n "$TS_IP" ]; then
  printf ' Point the phone PWA at:  \033[36mhttp://%s:%s\033[0m\n' "$TS_IP" "$PORT"
  printf ' (Set NEXT_PUBLIC_BACKEND_URL to that, or open it directly.)\n'
fi
echo " To stop the backend later:  pkill -f 'uvicorn backend.main:app'"
echo " To watch logs:              tail -f /tmp/desk-backend.log"
echo
