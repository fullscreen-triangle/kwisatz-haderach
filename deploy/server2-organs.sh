#!/usr/bin/env bash
#
# Agent Smith on server-2 — build and install the organs the inbox and console use. Idempotent.
#
#   spraypaint  (graffiti/spraypaint) — search over the mail mirror. CLI only
#               (--no-default-features: no bundled UI, no `serve`), /usr/local/bin.
#   purpose     (semantics/purpose, purpose-cli) and tracker (bloodhound/thrust/tracker) —
#               the console's repo pass: clone, `tracker drift`, χ history. /usr/local/bin.
#   chigutiro   (semantics/purpose/chigutiro) — the personal memory service, as a
#               systemd unit on 127.0.0.1:8740, data in /var/lib/chigutiro.
#
# All are built inside the official Rust image (docker is already on this host), so the
# box needs no toolchain. Sources are uploaded by the laptop as tarballs to
# /root/agent-smith-upload/{spraypaint,purpose,tracker,chigutiro}-src.tgz before running:
#     ssh olduvai 'bash -s' < deploy/server2-organs.sh
#
# chigutiro's key and token come only from the KeePassXC vault
# (python -m tools.keeper add-chigutiro, then push). Until they arrive the unit exits
# cleanly with a note in the journal instead of crash-looping.

set -euo pipefail

UP=/root/agent-smith-upload
SRC=/srv/src
U=smith
say() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }

unpack() {  # $1 = name
  if [ -f "$UP/$1-src.tgz" ]; then
    rm -rf "$SRC/$1" && mkdir -p "$SRC/$1"
    tar -xzf "$UP/$1-src.tgz" -C "$SRC/$1" && rm "$UP/$1-src.tgz"
  fi
  # a tarball made from the parent repo carries a leading "<name>/" — flatten it
  if [ ! -f "$SRC/$1/Cargo.toml" ] && [ -f "$SRC/$1/$1/Cargo.toml" ]; then
    mv "$SRC/$1/$1" "$SRC/$1.tmp" && rm -rf "$SRC/$1" && mv "$SRC/$1.tmp" "$SRC/$1"
  fi
  [ -f "$SRC/$1/Cargo.toml" ] || { echo "no $1 source in $SRC/$1 — upload $1-src.tgz first" >&2; exit 1; }
}

say "spraypaint"
unpack spraypaint
docker run --rm -v "$SRC/spraypaint:/src" -v agent-smith-cargo:/usr/local/cargo/registry -w /src \
  rust:1-bookworm cargo build --release --locked --no-default-features 2>&1 | tail -3
install -m 755 "$SRC/spraypaint/target/release/spraypaint" /usr/local/bin/spraypaint
/usr/local/bin/spraypaint --version

say "purpose"          # the definition index the tracker shells out to (must be on PATH)
unpack purpose
docker run --rm -v "$SRC/purpose:/src" -v agent-smith-cargo:/usr/local/cargo/registry -w /src \
  rust:1-bookworm cargo build --release -p purpose-cli 2>&1 | tail -3
install -m 755 "$SRC/purpose/target/release/purpose" /usr/local/bin/purpose
/usr/local/bin/purpose --version 2>/dev/null || /usr/local/bin/purpose --help | head -1

say "tracker"          # bloodhound thrust/tracker — the repo-federation χ the console's repo pass reads
unpack tracker
docker run --rm -v "$SRC/tracker:/src" -v agent-smith-cargo:/usr/local/cargo/registry -w /src \
  rust:1-bookworm cargo build --release 2>&1 | tail -3
install -m 755 "$SRC/tracker/target/release/tracker" /usr/local/bin/tracker
/usr/local/bin/tracker --version 2>/dev/null || /usr/local/bin/tracker --help | head -1
install -d -m 755 -o $U -g $U /var/lib/agent-smith/repos

say "chigutiro"
unpack chigutiro
docker build -q -t chigutiro:local "$SRC/chigutiro" >/dev/null
cid=$(docker create chigutiro:local)
docker cp "$cid:/usr/local/bin/chigutiro" /usr/local/bin/chigutiro
docker rm "$cid" >/dev/null
/usr/local/bin/chigutiro --version 2>/dev/null || /usr/local/bin/chigutiro --help | head -1
install -d -m 700 -o $U -g $U /var/lib/chigutiro

cat > /etc/systemd/system/chigutiro.service <<'UNIT'
[Unit]
Description=chigutiro — personal memory service (records from Agent Smith)
After=network-online.target ollama.service

[Service]
Type=simple
User=smith
Group=smith
EnvironmentFile=-/var/lib/agent-smith/env
Environment=CHIGUTIRO_DATA=/var/lib/chigutiro
Environment=CHIGUTIRO_HOST=127.0.0.1
Environment=CHIGUTIRO_PORT=8740
Environment=CHIGUTIRO_OLLAMA_URL=http://127.0.0.1:11434
Environment=CHIGUTIRO_OLLAMA_MODEL=llama3.2:3b
Environment=CHIGUTIRO_OWNER=Kundai
# A kill (deploy, OOM) leaves LOCK behind holding a dead PID; clear it only when that PID is gone.
ExecStartPre=/bin/sh -c 'l=/var/lib/chigutiro/LOCK; if [ -f "$$l" ] && [ ! -d "/proc/$$(cat $$l)" ]; then rm -f "$$l"; fi'
# No key yet (vault not pushed): say so and stop cleanly rather than crash-loop.
ExecStart=/bin/sh -c 'if [ -z "$${CHIGUTIRO_KEY:-}" ]; then echo "no CHIGUTIRO_KEY yet: python -m tools.keeper add-chigutiro, then push"; exit 0; fi; exec /usr/local/bin/chigutiro serve'
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/chigutiro

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable chigutiro >/dev/null 2>&1
systemctl restart chigutiro
sleep 2
systemctl status chigutiro --no-pager -n 3 | tail -4 || true   # inactive (no key yet) exits 3
