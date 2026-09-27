#!/usr/bin/env bash
#
# Agent Smith — one-shot VM installer.
#
# Your friend pastes ONE line into a fresh Ubuntu/Debian VM (as root or with sudo):
#
#     curl -fsSL https://raw.githubusercontent.com/fullscreen-triangle/kwisatz-haderach/main/deploy/vm-install.sh | sudo bash
#
# That's it. No flags, no questions, no choices. It:
#   - installs Python + git
#   - creates a dedicated 'smith' user
#   - clones the repo
#   - builds the venv from the CORE requirements only
#   - installs a systemd service that survives reboots and crashes
#   - starts it, bound to 0.0.0.0:8000
#
# When it finishes it prints the URL to hand back. Done.
#
# Deliberately NOT here (nobody has to think about them): Rust search organs,
# Ollama, model tiers, reverse proxy, TLS, domains. The /intent round-trip,
# facts, web links and the doctor self-check all work without any of them.

set -euo pipefail

REPO_URL="https://github.com/fullscreen-triangle/kwisatz-haderach.git"
APP_USER="smith"
APP_HOME="/home/${APP_USER}"
APP_DIR="${APP_HOME}/kwisatz-haderach"
PORT="8000"
SERVICE="agent-smith"

say() { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Run this as root or with sudo:  curl -fsSL <url> | sudo bash" >&2
  exit 1
fi

say "Installing base packages (python, git)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip git curl ca-certificates >/dev/null

say "Creating '${APP_USER}' service user..."
if ! id "${APP_USER}" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "${APP_USER}" >/dev/null
fi

say "Fetching the code..."
if [ -d "${APP_DIR}/.git" ]; then
  sudo -u "${APP_USER}" git -C "${APP_DIR}" pull --ff-only
else
  sudo -u "${APP_USER}" git clone --depth 1 "${REPO_URL}" "${APP_DIR}"
fi

say "Building the Python environment..."
sudo -u "${APP_USER}" bash -lc "
  set -e
  cd '${APP_DIR}'
  python3 -m venv .venv
  ./.venv/bin/pip install --quiet --upgrade pip
  ./.venv/bin/pip install --quiet -r backend/requirements-core.txt
  PYTHONPATH='${APP_DIR}' ./.venv/bin/python -c 'import backend.main; print(\"  imports OK\")'
"

say "Installing the systemd service..."
cat >"/etc/systemd/system/${SERVICE}.service" <<UNIT
[Unit]
Description=Agent Smith backend (FastAPI / uvicorn)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=PYTHONPATH=${APP_DIR}
ExecStart=${APP_DIR}/.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port ${PORT}
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=${APP_DIR}/backend/.agent_smith

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now "${SERVICE}" >/dev/null

say "Waiting for it to answer..."
for _ in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:${PORT}/ping" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

IP="$(curl -fsS https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}')"

echo
echo "======================================================================"
say  "Agent Smith is running."
echo
echo "  Local check : curl http://127.0.0.1:${PORT}/ping        -> {\"alive\":true}"
echo "  Public URL  : http://${IP}:${PORT}"
echo
echo "  Give Kundai this URL:  http://${IP}:${PORT}"
echo
echo "  Live logs   : journalctl -u ${SERVICE} -f"
echo "  Restart     : sudo systemctl restart ${SERVICE}"
echo "======================================================================"
