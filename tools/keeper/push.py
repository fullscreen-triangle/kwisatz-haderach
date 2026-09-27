"""
Stream the rendered bundle to the server over SSH — as a tar on stdin, so no credential
touches this machine's disk or appears in a process list — then restart the services
and read back the keeper's value-free verdict.
"""

from __future__ import annotations

import json
import os
import subprocess

from tools.keeper.render import SERVER_STATE, Bundle, tarball

DEFAULT_HOST = os.environ.get("KEEPER_HOST", "olduvai")   # ~/.ssh/config alias for server-2
SERVICES = ("chigutiro", "agent-smith-backend", "agent-smith-web")

# Runs on the server as root. Extracts into the state dir, hands it to the smith user,
# restarts whichever services exist, waits for the backend, and asks the keeper to probe.
REMOTE = f"""
set -e
D={SERVER_STATE}
id smith >/dev/null 2>&1 || {{ echo "no 'smith' user on this host — run deploy/server2-services.sh first" >&2; exit 3; }}
install -d -m 700 -o smith -g smith "$D"
tar -xf - -C "$D" --no-same-owner
chown -R smith:smith "$D"
for u in {' '.join(SERVICES)}; do
  if systemctl cat "$u" >/dev/null 2>&1; then systemctl restart "$u"; echo "restarted $u" >&2; fi
done
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:8000/ping >/dev/null 2>&1 && break; sleep 1; done
curl -fsS -X POST http://127.0.0.1:8000/keeper/check >/dev/null 2>&1 || true
sleep 12
curl -fsS http://127.0.0.1:8000/keeper/status || echo '{{"error":"backend not answering on 127.0.0.1:8000"}}'
"""


def push(bundle: Bundle, host: str = DEFAULT_HOST) -> dict:
    proc = subprocess.run(["ssh", "-o", "BatchMode=yes", host, REMOTE],
                          input=tarball(bundle), capture_output=True, timeout=180)
    for line in proc.stderr.decode(errors="replace").splitlines():
        print(f"  server: {line}")
    if proc.returncode != 0:
        raise SystemExit(f"push failed (ssh exit {proc.returncode})")
    try:
        return json.loads(proc.stdout.decode(errors="replace"))
    except ValueError:
        return {"error": "server returned no status"}
