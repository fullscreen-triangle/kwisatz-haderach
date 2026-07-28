#!/usr/bin/env bash
# Agent Smith — install the search organs (purpose, spraypaint) on this node.
#
# Run on the Chromebook (Crostini Linux terminal) from the kwisatz-haderach repo:
#     bash backend/install-organs.sh
#
# It clones (or pulls) the two source repos, builds their Rust binaries into
# ~/.cargo/bin — exactly where backend/routes/intent.py::_resolve_bin looks —
# then builds each tool's index against THIS repo so /intent returns real slices
# about this codebase. Idempotent: re-running just updates + rebuilds.
#
# After this, re-run backend/agent-smith-up.sh (or just hit /intent) and the
# round-trip returns ranked results instead of "not installed".

set -uo pipefail

c_ok()   { printf '\033[32m  OK\033[0m  %s\n' "$1"; }
c_bad()  { printf '\033[31m FAIL\033[0m  %s\n' "$1"; }
c_warn() { printf '\033[33m WARN\033[0m  %s\n' "$1"; }
c_info() { printf '\033[36m INFO\033[0m  %s\n' "$1"; }
hr()     { printf '\033[90m%s\033[0m\n' "----------------------------------------------------------------"; }

REPO="$(cd "$(dirname "$0")/.." && pwd)"        # kwisatz-haderach (what we'll index)
# Clone the source repos as siblings of the portfolio dir, mirroring the dev layout.
SRC_ROOT="$(cd "$REPO/../.." && pwd)/semantics" # ~/Documents/semantics
PURPOSE_DIR="$SRC_ROOT/purpose"
GRAFFITI_DIR="$SRC_ROOT/graffiti"               # spraypaint lives inside graffiti
CARGO_BIN="$HOME/.cargo/bin"
FAIL=0

echo
printf '\033[1m Agent Smith — install search organs\033[0m\n'
echo " index target: $REPO"
echo " source root:  $SRC_ROOT"
hr

# --- 0. Rust toolchain -------------------------------------------------------
if ! command -v cargo >/dev/null 2>&1; then
  [ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"
fi
if ! command -v cargo >/dev/null 2>&1; then
  c_warn "cargo not found — installing the Rust toolchain (rustup, non-interactive)."
  if command -v curl >/dev/null 2>&1; then
    curl -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable \
      && . "$HOME/.cargo/env" \
      && c_ok "Rust toolchain installed." \
      || { c_bad "rustup install failed."; FAIL=1; }
  else
    c_bad "curl missing — install it first: sudo apt install curl"; FAIL=1
  fi
else
  c_ok "cargo present: $(cargo --version 2>/dev/null)"
fi
export PATH="$CARGO_BIN:$PATH"
[ "$FAIL" = "1" ] && { c_bad "Cannot build without cargo. Fix the above and re-run."; exit 1; }

# --- 1. git (needed to clone) ------------------------------------------------
if ! command -v git >/dev/null 2>&1; then
  c_warn "git missing — installing."
  sudo apt-get update -qq && sudo apt-get install -y -qq git \
    && c_ok "git installed." || { c_bad "git install failed."; exit 1; }
fi

# --- helper: clone-or-pull a repo -------------------------------------------
sync_repo() {  # $1 = dir, $2 = url, $3 = label
  local dir="$1" url="$2" label="$3"
  if [ -d "$dir/.git" ]; then
    c_info "$label already cloned — pulling latest..."
    git -C "$dir" pull --ff-only 2>/dev/null && c_ok "$label up to date." \
      || c_warn "$label pull skipped (local changes or offline) — building what's here."
  else
    c_info "Cloning $label ..."
    mkdir -p "$(dirname "$dir")"
    git clone --depth 1 "$url" "$dir" \
      && c_ok "$label cloned to $dir" \
      || { c_bad "clone of $label failed ($url)"; return 1; }
  fi
}

mkdir -p "$SRC_ROOT"

# --- 2. purpose --------------------------------------------------------------
hr
if sync_repo "$PURPOSE_DIR" "https://github.com/fullscreen-triangle/purpose.git" "purpose"; then
  PURPOSE_CLI="$PURPOSE_DIR/mechanistic-synthesis/implementation/crates/purpose-cli"
  if [ -d "$PURPOSE_CLI" ]; then
    c_info "Building purpose (cargo install --path purpose-cli)..."
    if cargo install --path "$PURPOSE_CLI" --force 2>&1 | tail -3; then
      command -v purpose >/dev/null 2>&1 && c_ok "purpose installed: $(command -v purpose)" \
        || c_warn "purpose built but not on PATH — check $CARGO_BIN"
    else
      c_bad "purpose build failed."; FAIL=1
    fi
  else
    c_bad "purpose-cli crate not found at $PURPOSE_CLI"; FAIL=1
  fi
fi

# --- 3. spraypaint (nested in graffiti) --------------------------------------
hr
if sync_repo "$GRAFFITI_DIR" "https://github.com/fullscreen-triangle/graffiti.git" "graffiti"; then
  SPRAY_DIR="$GRAFFITI_DIR/spraypaint"
  if [ -f "$SPRAY_DIR/Cargo.toml" ]; then
    c_info "Building spraypaint (cargo install --path spraypaint)..."
    if cargo install --path "$SPRAY_DIR" --force 2>&1 | tail -3; then
      command -v spraypaint >/dev/null 2>&1 && c_ok "spraypaint installed: $(command -v spraypaint)" \
        || c_warn "spraypaint built but not on PATH — check $CARGO_BIN"
    else
      c_bad "spraypaint build failed."; FAIL=1
    fi
  else
    c_bad "spraypaint crate not found at $SPRAY_DIR"; FAIL=1
  fi
fi

# --- 4. Build the indexes against THIS repo ----------------------------------
# /intent shells the tool with cwd = kwisatz-haderach root, so index there.
hr
cd "$REPO"
if command -v purpose >/dev/null 2>&1; then
  c_info "Indexing this repo with purpose (once; re-run if symbols look stale)..."
  purpose index 2>&1 | tail -2 && c_ok "purpose index built." || c_warn "purpose index reported an issue."
fi
if command -v spraypaint >/dev/null 2>&1; then
  c_info "Indexing this repo with spraypaint..."
  # spraypaint's index subcommand; if the name differs it'll no-op-warn, harmless.
  spraypaint index 2>&1 | tail -2 && c_ok "spraypaint index built." \
    || c_warn "spraypaint index step skipped — check 'spraypaint --help' for the index verb."
fi

# --- 5. Verify intent.py can resolve them ------------------------------------
hr
c_info "Verifying the two organs are where intent.py looks (~/.cargo/bin or PATH)..."
for t in purpose spraypaint; do
  if command -v "$t" >/dev/null 2>&1; then
    c_ok "$t -> $(command -v "$t")"
  elif [ -x "$CARGO_BIN/$t" ]; then
    c_ok "$t -> $CARGO_BIN/$t (intent.py resolves this path)"
  else
    c_bad "$t not resolvable — /intent will still 501 for it."; FAIL=1
  fi
done

hr
if [ "$FAIL" = "1" ]; then
  c_warn "Some organs didn't install. The round-trip still works; missing tools 501."
else
  printf '\033[1m Done.\033[0m Both organs installed + indexed.\n'
  echo " Now re-run:  bash backend/agent-smith-up.sh"
  echo " /intent will return real slices about this repo instead of 'not installed'."
fi
echo
