"""
python -m tools.laptop_node <command>

  serve        run the API on the laptop's Tailscale address (what the logon task runs)
  index        rebuild the filename index now and print its size
  install      make the token, register the logon task, start it (idempotent)
  uninstall    remove the logon task (the token and index stay)
  status       is the task registered, is the node answering, how big is the index
  search Q     try a search locally, as the phone would see it (no network)

Run it with the interpreter that has tools/laptop_node/requirements.txt installed; the
logon task uses that interpreter's pythonw.exe, so no console window ever appears.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from tools.laptop_node import config

TASK = "Agent Smith laptop node"
REPO = Path(__file__).resolve().parents[2]
NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)


def cmd_serve(a):
    import uvicorn
    from tools.laptop_node import server
    if not config.token():
        raise SystemExit("No token yet — run: python -m tools.laptop_node install")
    host = a.host or server.tailscale_ip()
    server.start_indexer()
    uvicorn.run(server.app, host=host, port=config.settings()["port"], log_level="warning",
                access_log=False)


def cmd_index(a):
    from tools.laptop_node import index
    n = index.rebuild()
    print(f"indexed {n} files under {', '.join(str(r) for r in config.roots())}")


def _pythonw() -> str:
    exe = Path(sys.executable)
    w = exe.with_name("pythonw.exe")
    return str(w if w.exists() else exe)


def cmd_install(a):
    config.token(create=True)
    launcher = REPO / "tools" / "laptop_node" / "run.pyw"
    tr = f'"{_pythonw()}" "{launcher}"'
    r = subprocess.run(["schtasks", "/Create", "/TN", TASK, "/TR", tr, "/SC", "ONLOGON", "/RL", "LIMITED", "/F"],
                       capture_output=True, text=True, creationflags=NO_WINDOW)
    if r.returncode != 0:
        raise SystemExit(f"could not register the logon task: {(r.stderr or r.stdout).strip()}")
    subprocess.run(["schtasks", "/End", "/TN", TASK], capture_output=True, creationflags=NO_WINDOW)
    subprocess.run(["schtasks", "/Run", "/TN", TASK], capture_output=True, creationflags=NO_WINDOW)
    print(f"Logon task '{TASK}' registered and started.")
    print(f"Token: {config.token_path()} (not shown). Next: python -m tools.keeper add-laptop  (then push)")


def cmd_uninstall(a):
    subprocess.run(["schtasks", "/End", "/TN", TASK], capture_output=True, creationflags=NO_WINDOW)
    r = subprocess.run(["schtasks", "/Delete", "/TN", TASK, "/F"], capture_output=True, text=True,
                       creationflags=NO_WINDOW)
    print("removed" if r.returncode == 0 else (r.stderr or r.stdout).strip())


def cmd_status(a):
    import urllib.request
    from tools.laptop_node import index, server
    r = subprocess.run(["schtasks", "/Query", "/TN", TASK, "/FO", "LIST"], capture_output=True, text=True,
                       creationflags=NO_WINDOW)
    state = next((l.split(":", 1)[1].strip() for l in r.stdout.splitlines() if l.startswith(("Status", "Status:"))), "")
    print(f"task      {'registered' if r.returncode == 0 else 'NOT registered'} {state}")
    print(f"token     {'present' if config.token() else 'MISSING'} ({config.token_path()})")
    try:
        ip = server.tailscale_ip(wait=0)
        url = f"http://{ip}:{config.settings()['port']}"
        with urllib.request.urlopen(f"{url}/health", timeout=5) as resp:
            h = json.loads(resp.read())
        print(f"node      answering at {url} — {h.get('files')} files indexed")
    except BaseException as e:                      # SystemExit from tailscale_ip too
        print(f"node      not answering ({type(e).__name__})")
    print(f"index     {index.stats()}")


def cmd_search(a):
    from tools.laptop_node import server
    for r in server.search(a.q, k=a.k, content=True)["results"]:
        print(f"{r['where']:13} {r['path']}")


def main(argv=None):
    p = argparse.ArgumentParser(prog="python -m tools.laptop_node")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("serve")
    s.add_argument("--host", default="", help="bind address (default: this laptop's Tailscale IPv4)")
    s.set_defaults(fn=cmd_serve)
    sub.add_parser("index").set_defaults(fn=cmd_index)
    sub.add_parser("install").set_defaults(fn=cmd_install)
    sub.add_parser("uninstall").set_defaults(fn=cmd_uninstall)
    sub.add_parser("status").set_defaults(fn=cmd_status)
    q = sub.add_parser("search")
    q.add_argument("q")
    q.add_argument("-k", type=int, default=10)
    q.set_defaults(fn=cmd_search)
    a = p.parse_args(argv)
    a.fn(a)


if __name__ == "__main__":
    main()
