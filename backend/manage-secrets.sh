#!/usr/bin/env bash
# Agent Smith — manage node credentials (the fix for "my API keys are expired").
#
# The backend reads every credential with os.getenv(...). On the Chromebook there's no
# Render to export them, so they read as empty and every integration looks dead. This CLI
# stores them in backend/.agent_smith/secrets.env (chmod 600, gitignored); the backend
# loads that file into os.environ at startup (backend/routes/secrets.py::load_into_environ).
#
# Usage (run on the node, from the repo root):
#     bash backend/manage-secrets.sh list                 # status of every known key (no values)
#     bash backend/manage-secrets.sh set GARMIN_EMAIL      # prompts hidden; value never echoed
#     bash backend/manage-secrets.sh set GITHUB_TOKEN
#     bash backend/manage-secrets.sh delete AMAZON_ACCESS_KEY
#     bash backend/manage-secrets.sh path                  # print the secrets file path
#
# Secrets are NEVER printed back. `list` shows only set/missing + value length. After
# changing a key, restart the backend so it reloads:  pkill -f 'uvicorn backend.main:app'
# then  bash backend/agent-smith-up.sh
#
# Note: `set` reads the value from a hidden prompt (read -s), so the secret never appears
# on screen, in your shell history, or in the process list. Do NOT pass it as an argument.

set -uo pipefail

c_ok()   { printf '\033[32m  OK\033[0m  %s\n' "$1"; }
c_bad()  { printf '\033[31m FAIL\033[0m  %s\n' "$1"; }
c_warn() { printf '\033[33m WARN\033[0m  %s\n' "$1"; }
c_info() { printf '\033[36m INFO\033[0m  %s\n' "$1"; }

REPO="$(cd "$(dirname "$0")/.." && pwd)"
PYBIN="python3"; command -v python3 >/dev/null 2>&1 || PYBIN="python"

# Everything goes through backend/routes/secrets.py so the file format + registry live in
# ONE place. We call it with PYTHONPATH=$REPO so `import backend.routes.secrets` resolves.
run_py() {  # $1 = python snippet using the imported module as `s`
  PYTHONPATH="$REPO" "$PYBIN" - "$@" <<'PYEOF'
import sys
from backend.routes import secrets as s
cmd = sys.argv[1] if len(sys.argv) > 1 else ""
if cmd == "list":
    rows = s.status()
    width = max((len(r["key"]) for r in rows), default=10)
    print(f"\n  Secrets file: {s._SECRETS_FILE}")
    print(f"  ({'present' if s._SECRETS_FILE.exists() else 'not created yet'})\n")
    for r in rows:
        mark = "\033[32mset\033[0m   " if r["set"] else "\033[31mMISSING\033[0m"
        length = f"len={r['length']}" if r["set"] else "        "
        src = "" if not r["set"] else ("file" if r["in_file"] else "env ")
        extra = "" if r["known"] else "  (extra)"
        print(f"    {mark}  {r['key']:<{width}}  {length:<8} {src}  {r['desc']}{extra}")
    missing = [r["key"] for r in rows if r["known"] and not r["set"]]
    print()
    if missing:
        print(f"  \033[33m{len(missing)} known key(s) missing:\033[0m {', '.join(missing)}")
        print(f"  Set one with:  bash backend/manage-secrets.sh set {missing[0]}")
    else:
        print("  \033[32mAll known keys are set.\033[0m")
    print()
elif cmd == "set":
    key, val = sys.argv[2], sys.argv[3]
    s.write_secret(key, val)
    print(f"stored:{key}:{len(val)}")
elif cmd == "delete":
    key = sys.argv[2]
    print("deleted" if s.delete_secret(key) else "absent")
elif cmd == "path":
    print(s._SECRETS_FILE)
PYEOF
}

sub="${1:-}"
case "$sub" in
  list|"")
    run_py list
    ;;
  path)
    run_py path
    ;;
  set)
    KEY="${2:-}"
    [ -z "$KEY" ] && { c_bad "usage: bash backend/manage-secrets.sh set KEY"; exit 1; }
    printf '  Value for \033[1m%s\033[0m (input hidden, not echoed): ' "$KEY"
    IFS= read -rs VAL; echo
    [ -z "$VAL" ] && { c_bad "empty value — nothing stored."; exit 1; }
    OUT="$(run_py set "$KEY" "$VAL")"; VAL=""   # clear the value from the shell asap
    if printf '%s' "$OUT" | grep -q '^stored:'; then
      LEN="$(printf '%s' "$OUT" | cut -d: -f3)"
      c_ok "$KEY stored (length $LEN). Value not shown."
      c_info "Restart the backend to load it:  pkill -f 'uvicorn backend.main:app' ; bash backend/agent-smith-up.sh"
    else
      c_bad "store failed: $OUT"
    fi
    ;;
  delete|rm)
    KEY="${2:-}"
    [ -z "$KEY" ] && { c_bad "usage: bash backend/manage-secrets.sh delete KEY"; exit 1; }
    OUT="$(run_py delete "$KEY")"
    [ "$OUT" = "deleted" ] && c_ok "$KEY removed." || c_warn "$KEY was not set."
    ;;
  -h|--help|help)
    grep '^#' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *)
    c_bad "unknown command '$sub' — try: list | set KEY | delete KEY | path"
    exit 1
    ;;
esac
