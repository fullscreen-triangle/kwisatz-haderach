#!/usr/bin/env bash
#
# Agent Smith on server-2 — build and install okgg (greifswald/conspirator/okgg), the
# ontological knowledge graph generator the reading tasks run (backend/reading). Idempotent.
#
# Built inside the official Rust image, like the other organs (server2-organs.sh), so the box
# needs no toolchain. The laptop uploads the source first:
#     tar czf - --exclude=target --exclude=.okgg -C <conspirator>/conspirator okgg \
#       | ssh olduvai 'mkdir -p /root/agent-smith-upload && cat > /root/agent-smith-upload/okgg-src.tgz'
#     ssh olduvai 'bash -s' < deploy/server2-okgg.sh

set -euo pipefail

UP=/root/agent-smith-upload
SRC=/srv/src/okgg
say() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }

if [ -f "$UP/okgg-src.tgz" ]; then
  rm -rf "$SRC" && mkdir -p "$SRC"
  tar -xzf "$UP/okgg-src.tgz" -C "$SRC" && rm "$UP/okgg-src.tgz"
fi
# a tarball of the parent directory carries a leading "okgg/" — flatten it
if [ ! -f "$SRC/Cargo.toml" ] && [ -f "$SRC/okgg/Cargo.toml" ]; then
  mv "$SRC/okgg" "$SRC.tmp" && rm -rf "$SRC" && mv "$SRC.tmp" "$SRC"
fi
[ -f "$SRC/Cargo.toml" ] || { echo "no okgg source in $SRC — upload okgg-src.tgz first" >&2; exit 1; }

say "okgg"
docker run --rm -v "$SRC:/src" -v agent-smith-cargo:/usr/local/cargo/registry -w /src \
  rust:1-bookworm cargo build --release 2>&1 | tail -3
install -m 755 "$SRC/target/release/okgg" /usr/local/bin/okgg
/usr/local/bin/okgg --version
install -d -m 755 -o smith -g smith /var/lib/agent-smith/reading
