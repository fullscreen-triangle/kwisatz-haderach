#!/usr/bin/env bash
#
# Agent Smith on server-2 — install/refresh the two systemd services. Idempotent.
#
# Run from the laptop (the repo code must already be in /srv/agent-smith):
#     ssh olduvai 'bash -s' < deploy/server2-services.sh
#
# What it does, and deliberately does NOT do:
#   - builds the Python venv + web app, writes agent-smith-backend.service (uvicorn on
#     127.0.0.1:8000, loopback ONLY: the nav/readfile/secrets routes have no auth) and
#     points agent-smith-web.service at the same EnvironmentFile.
#   - it never writes credentials. Those arrive only from the KeePassXC vault via
#     `python -m tools.keeper push`, into /var/lib/agent-smith/env (0600, owner smith) —
#     outside the repo tree, so no voice command can browse to them.

set -euo pipefail

APP=/srv/agent-smith
STATE=/var/lib/agent-smith
ENVF=$STATE/env
U=smith

say() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }

[ -d "$APP/backend" ] || { echo "no code at $APP — upload the repo first" >&2; exit 1; }
id "$U" >/dev/null 2>&1 || useradd --system --create-home --home-dir /home/$U --shell /usr/sbin/nologin $U
install -d -m 700 -o $U -g $U "$STATE"
chown -R $U:$U "$APP"

say "Python environment"
[ -x "$APP/.venv/bin/python" ] || sudo -u $U python3 -m venv "$APP/.venv"
sudo -u $U "$APP/.venv/bin/pip" install -q -r "$APP/backend/requirements.txt" -r "$APP/backend/requirements-core.txt"
sudo -u $U env PYTHONPATH=$APP "$APP/.venv/bin/python" -c 'import backend.main' && echo "  backend imports OK"

say "systemd units"
cat > /etc/systemd/system/agent-smith-backend.service <<UNIT
[Unit]
Description=Agent Smith backend (FastAPI: /intent orchestrator + credential keeper)
After=network-online.target ollama.service
Wants=network-online.target

[Service]
Type=simple
User=$U
Group=$U
WorkingDirectory=$APP
Environment=PYTHONPATH=$APP
Environment=HOME=/home/$U
Environment=AGENT_SMITH_STATE=$STATE
# Credentials, pushed from the KeePassXC vault by tools/keeper. '-' = start even before
# the first push; the keeper then reports every credential as "not set".
EnvironmentFile=-$ENVF
# Loopback only — the Next.js app is the only thing that talks to this.
ExecStart=$APP/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=$APP $STATE

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/systemd/system/agent-smith-web.service <<UNIT
[Unit]
Description=Agent Smith web (Next.js PWA)
After=network.target agent-smith-backend.service

[Service]
Type=simple
User=$U
Group=$U
WorkingDirectory=$APP/web
Environment=NODE_ENV=production
Environment=NEXT_TELEMETRY_DISABLED=1
Environment=AGENT_SMITH_STATE=$STATE
EnvironmentFile=-$ENVF
ExecStart=$APP/web/node_modules/.bin/next start -H 127.0.0.1 -p 3002
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=$APP $STATE

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload

say "Web build"
cd "$APP/web"
sudo -u $U npm ci --no-audit --no-fund --loglevel=error
# Build through systemd so NEXT_PUBLIC_* come from the env file parsed exactly as the
# service parses it — never by shell-sourcing a file of secrets.
systemd-run --quiet --wait --pipe --collect -p User=$U -p Group=$U \
  -p WorkingDirectory=$APP/web -p EnvironmentFile=-$ENVF \
  -E NEXT_TELEMETRY_DISABLED=1 -E HOME=/home/$U \
  $APP/web/node_modules/.bin/next build --no-lint 2>&1 | tail -4

say "Start"
systemctl enable agent-smith-backend agent-smith-web >/dev/null 2>&1
systemctl restart agent-smith-backend agent-smith-web
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:8000/ping >/dev/null 2>&1 && break; sleep 1; done
systemctl is-active agent-smith-backend agent-smith-web
ss -tlnp | grep -E '127\.0\.0\.1:(8000|3002) ' || { echo "a service is not on loopback as expected" >&2; exit 1; }
say "Keeper (value-free):"
curl -fsS http://127.0.0.1:8000/keeper/status | python3 -c '
import json, sys
d = json.load(sys.stdin)
for c in d["credentials"]:
    print("  %-8s %-16s %s" % (c["state"], c["title"], c["detail"][:90]))'
