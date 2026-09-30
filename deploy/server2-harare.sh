#!/usr/bin/env bash
#
# Agent Smith on server-2 — Harare (kwisatz-haderach/harare): build the engine and the
# TypeScript modules, and run `harare serve` as a service. Idempotent.
#
# The laptop uploads the source first (no node_modules, target or dist):
#     tar czf - --exclude=node_modules --exclude=target --exclude=dist --exclude=.harare harare \
#       | ssh olduvai 'mkdir -p /root/agent-smith-upload && cat > /root/agent-smith-upload/harare-src.tgz'
#     ssh olduvai 'bash -s' < deploy/server2-harare.sh
#
# harare serve listens on 127.0.0.1:7470 only: its API starts processes. The desk backend
# (backend/find.py) is its only client. Web search needs the SearXNG tunnel
# (searxng-tunnel.service, 127.0.0.1:8888; deploy/server3-searxng.sh is the other end).

set -euo pipefail

UP=/root/agent-smith-upload
APP=/srv/agent-smith/harare
STATE=/var/lib/agent-smith/harare
U=smith
say() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }

if [ -f "$UP/harare-src.tgz" ]; then
  say "source"
  rm -rf "$APP.new" && mkdir -p "$APP.new"
  tar -xzf "$UP/harare-src.tgz" -C "$APP.new" && rm "$UP/harare-src.tgz"
  [ -d "$APP.new/harare" ] && { mv "$APP.new/harare" "$APP.tmp"; rm -rf "$APP.new"; mv "$APP.tmp" "$APP.new"; }
  # keep the built node_modules across uploads; npm ci refreshes them below
  [ -d "$APP/node_modules" ] && mv "$APP/node_modules" "$APP.new/node_modules"
  rm -rf "$APP" && mv "$APP.new" "$APP"
fi
[ -f "$APP/harare.server2.toml" ] || { echo "no harare source at $APP — upload harare-src.tgz first" >&2; exit 1; }
chown -R $U:$U "$APP"

say "engine"
docker run --rm -v "$APP/engine:/src" -v agent-smith-cargo:/usr/local/cargo/registry -w /src \
  rust:1-bookworm cargo build --release --locked 2>&1 | tail -2
install -m 755 "$APP/engine/target/release/harare" /usr/local/bin/harare
rm -rf "$APP/engine/target"

say "modules (TypeScript)"
sudo -u $U bash -c "cd '$APP' && npm ci --silent --no-audit --no-fund && npm run --silent build"
# `npm test` passes quoted globs to `node --test`, which only Node >= 21 expands; the
# server has Node 20, so let bash expand them.
sudo -u $U bash -c "cd '$APP' && node --test sdk-ts/dist/test/*.test.js modules/*/dist/test/*.test.js metro/dist/test/*.test.js 2>&1 | grep -E '^ℹ (pass|fail)' || true"

install -d -m 750 -o $U -g $U "$STATE" "$STATE/corpora"
sudo -u $U harare check --config "$APP/harare.server2.toml" | sed 's/^/  /'

say "service"
cat > /etc/systemd/system/harare.service <<UNIT
[Unit]
Description=Harare runtime graph (search everywhere: laptop, mail, web)
After=network-online.target searxng-tunnel.service
Wants=network-online.target

[Service]
Type=simple
User=$U
Group=$U
WorkingDirectory=$APP
Environment=HOME=/home/$U
Environment=HARARE_CORPORA=$STATE/corpora
Environment=SEARXNG_URL=http://127.0.0.1:8888
# LAPTOP_NODE_URL / LAPTOP_NODE_TOKEN come from the vault push, like the desk's.
EnvironmentFile=-/var/lib/agent-smith/env
ExecStart=/usr/local/bin/harare serve --config $APP/harare.server2.toml --state $STATE --addr 127.0.0.1:7470
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable harare >/dev/null 2>&1
systemctl restart harare
sleep 2
systemctl is-active harare
curl -fsS http://127.0.0.1:7470/api/health; echo
