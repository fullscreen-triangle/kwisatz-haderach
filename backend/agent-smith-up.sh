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
if python -c "import fastapi, uvicorn, httpx" 2>/dev/null; then
  c_ok "Core deps present (fastapi, uvicorn, httpx)."
else
  c_info "Installing backend requirements (first run may take a minute)..."
  pip install -q -r "$REPO/backend/requirements.txt" \
    && c_ok "Requirements installed." \
    || { c_bad "pip install failed."; FAIL=1; }
fi

# --- 4. Ollama (the orchestrator model that /intent calls) -------------------
OLLAMA_MODEL="${OLLAMA_MODEL:-llama3.2:3b}"
if command -v ollama >/dev/null 2>&1; then
  if ! pgrep -x ollama >/dev/null 2>&1; then
    c_info "Starting Ollama daemon..."
    (ollama serve >/tmp/ollama.log 2>&1 &) ; sleep 3
  fi
  if curl -s --max-time 5 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    c_ok "Ollama is responding on :11434."
    if ollama list 2>/dev/null | grep -q "${OLLAMA_MODEL%%:*}"; then
      c_ok "Model $OLLAMA_MODEL present."
    else
      c_warn "Model $OLLAMA_MODEL not pulled yet."
      c_info "Pulling it now (~2 GB, first run only)..."
      ollama pull "$OLLAMA_MODEL" && c_ok "Pulled $OLLAMA_MODEL." || c_warn "Pull failed — /intent tool-choice will fall back to purpose."
    fi
  else
    c_warn "Ollama daemon not responding — /intent will fall back to purpose (still works)."
  fi
else
  c_warn "Ollama not installed — /intent falls back to purpose (no smart tool-choice)."
  c_info "Install later from https://ollama.com if you want spraypaint routing."
fi

# --- 5. Search tools on PATH (the 'hands' /intent shells out to) -------------
for tool in purpose spraypaint; do
  if command -v "$tool" >/dev/null 2>&1; then
    c_ok "$tool found: $(command -v "$tool")"
  elif [ -x "$HOME/.cargo/bin/$tool" ]; then
    c_ok "$tool found at ~/.cargo/bin (adding to PATH for this run)."
    export PATH="$HOME/.cargo/bin:$PATH"
  else
    c_warn "$tool not found — intents routed to it will error until it is installed."
  fi
done

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

# local /intent smoke test — proves the whole pipe (Ollama → tool → slice → m)
c_info "Self-testing /intent locally..."
RESP="$(curl -s --max-time 60 -X POST "http://127.0.0.1:$PORT/intent" \
  -H 'Content-Type: application/json' \
  -d '{"text":"where is the tick loop"}' 2>/dev/null)"
if echo "$RESP" | grep -q '"tool"'; then
  c_ok "/intent returned a slice:"
  echo "        $(echo "$RESP" | head -c 300)"
else
  c_warn "/intent did not return the expected shape. Raw response:"
  echo "        $(echo "$RESP" | head -c 400)"
  c_info "The server is up regardless; check /tmp/desk-backend.log if this looks wrong."
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
