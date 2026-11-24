#!/usr/bin/env bash
#
# Agent Smith on server-2 — build and install `decisions` (physics/stella-lorraine/decisions),
# the tool the desk asks for estimates of time and resources (backend/estimate.py,
# /estimate). Idempotent.
#
# Built inside the official Rust image, like the other organs (server2-organs.sh,
# server2-okgg.sh), so the box needs no toolchain. The laptop uploads the source first.
# rust-toolchain.toml is left out, so the image's own toolchain builds it (the crate's
# minimum is Rust 1.85); paper/, notebooks/ and the build output are not needed:
#     tar czf - --exclude=target --exclude=.venv --exclude=paper --exclude=notebooks \
#               --exclude=reports --exclude=tools --exclude=rust-toolchain.toml \
#               -C <stella-lorraine> decisions \
#       | ssh olduvai 'mkdir -p /root/agent-smith-upload && cat > /root/agent-smith-upload/decisions-src.tgz'
#     ssh olduvai 'bash -s' < deploy/server2-decisions.sh
#
# The backend files that ask it (backend/estimate.py, backend/routes/estimate.py) and the
# web route (web/pages/api/desk/estimate) go to the node with deploy/desk-tools.sh. Until
# this script has run there, tasks run without a forecast and /estimate answers 501.

set -euo pipefail

UP=/root/agent-smith-upload
SRC=/srv/src/decisions
say() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }

if [ -f "$UP/decisions-src.tgz" ]; then
  rm -rf "$SRC" && mkdir -p "$SRC"
  tar -xzf "$UP/decisions-src.tgz" -C "$SRC" && rm "$UP/decisions-src.tgz"
fi
# a tarball of the parent directory carries a leading "decisions/" — flatten it
if [ ! -f "$SRC/Cargo.toml" ] && [ -f "$SRC/decisions/Cargo.toml" ]; then
  mv "$SRC/decisions" "$SRC.tmp" && rm -rf "$SRC" && mv "$SRC.tmp" "$SRC"
fi
[ -f "$SRC/Cargo.toml" ] || { echo "no decisions source in $SRC — upload decisions-src.tgz first" >&2; exit 1; }

say "decisions"
docker run --rm -v "$SRC:/src" -v agent-smith-cargo:/usr/local/cargo/registry -w /src \
  rust:1-bookworm cargo build --release --locked -p decisions-tool 2>&1 | tail -3
install -m 755 "$SRC/target/release/decisions" /usr/local/bin/decisions
/usr/local/bin/decisions --version

# The tool must be the build that estimates: a step-4 or step-5 binary has no such operation.
/usr/local/bin/decisions estimate three-point '{"optimistic": 1, "likely": 2, "pessimistic": 4}' --compact \
  | grep -q '"basis":"declared"' || { echo "this decisions build has no estimate operation" >&2; exit 1; }
say "decisions estimates"
