#!/bin/bash
# Run this on the Chromebook to start the full backend stack.
# Place in ~/kwisatz-haderach/ and run: bash backend/start.sh

set -e
REPO="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Desk Backend ==="
echo "Repo: $REPO"

# 1. Activate venv or create it
VENV="$REPO/.venv"
if [ ! -d "$VENV" ]; then
  echo "Creating virtual environment..."
  python3 -m venv "$VENV"
fi
source "$VENV/bin/activate"

# 2. Install deps
pip install -q -r "$REPO/backend/requirements.txt"

# 3. Start Ollama in background if not already running
if ! pgrep -x ollama > /dev/null; then
  echo "Starting Ollama..."
  ollama serve &
  sleep 2
fi

# 4. Pull default model if not present
if ! ollama list | grep -q "llama3.2:3b"; then
  echo "Pulling llama3.2:3b (first run only, ~2 GB)..."
  ollama pull llama3.2:3b
fi

# 5. Start Cloudflare tunnel in background
# Replace YOUR_TUNNEL_TOKEN with your actual token from: https://one.dash.cloudflare.com
CF_TOKEN="${CLOUDFLARE_TUNNEL_TOKEN:-}"
if [ -n "$CF_TOKEN" ]; then
  echo "Starting Cloudflare tunnel..."
  cloudflared tunnel --no-autoupdate run --token "$CF_TOKEN" &
else
  echo "WARNING: CLOUDFLARE_TUNNEL_TOKEN not set. Backend won't be reachable from Vercel."
  echo "Set it in your shell: export CLOUDFLARE_TUNNEL_TOKEN=your_token"
fi

# 6. Start FastAPI
echo "Starting FastAPI on :8000..."
cd "$REPO"
PYTHONPATH="$REPO" uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
