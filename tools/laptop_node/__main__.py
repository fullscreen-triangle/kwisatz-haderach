"""
python -m tools.laptop_node <command>

  serve        run the API on the laptop's Tailscale address (what the Startup shortcut runs)
  index        rebuild the filename index now and print its size
  install      make the token, add the Startup-folder shortcut, (re)start it (idempotent, no admin)
  uninstall    remove the shortcut and stop the node (the token and index stay)
  status       is it installed, is the node answering, how big is the index
  search Q     try a search locally, as the phone would see it (no network)

Run it with the interpreter that has tools/laptop_node/requirements.txt installed; the
shortcut uses that interpreter's pythonw.exe, so no console window ever appears.
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


def startup_link() -> Path:
    """The per-user Startup folder: runs at logon, needs no administrator rights (a logon
    scheduled task does — schtasks answers "Zugriff verweigert" without elevation)."""
    import os
    return (Path(os.environ["APPDATA"]) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
            / f"{TASK}.lnk")


def _ps(script: str) -> subprocess.CompletedProcess:
    return subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
                          capture_output=True, text=True, creationflags=NO_WINDOW)


def _stop_running() -> bool:
    """Stop a node started earlier (its PID is in <state>/laptop-node.pid)."""
    pid_file = config.state_dir() / "laptop-node.pid"
    try:
        pid = int(pid_file.read_text().strip())
    except (OSError, ValueError):
        return False
    r = subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True, creationflags=NO_WINDOW)
    pid_file.unlink(missing_ok=True)
    return r.returncode == 0


def _start() -> None:
    launcher = REPO / "tools" / "laptop_node" / "run.pyw"
    flags = getattr(subprocess, "DETACHED_PROCESS", 0) | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) | NO_WINDOW
    subprocess.Popen([_pythonw(), str(launcher)], cwd=str(REPO), creationflags=flags, close_fds=True,
                     stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def cmd_install(a):
    config.token(create=True)
    launcher = REPO / "tools" / "laptop_node" / "run.pyw"
    link = startup_link()
    q = lambda x: str(x).replace("'", "''")
    r = _ps(f"$s = (New-Object -ComObject WScript.Shell).CreateShortcut('{q(link)}'); "
            f"$s.TargetPath = '{q(_pythonw())}'; $s.Arguments = '\"{q(launcher)}\"'; "
            f"$s.WorkingDirectory = '{q(REPO)}'; $s.WindowStyle = 7; "
            f"$s.Description = 'Agent Smith: laptop files for the phone, over Tailscale'; $s.Save()")
    if r.returncode != 0 or not link.exists():
        raise SystemExit(f"could not create the Startup shortcut: {(r.stderr or r.stdout).strip()}")
    subprocess.run(["schtasks", "/Delete", "/TN", TASK, "/F"], capture_output=True, creationflags=NO_WINDOW)
    _stop_running()
    _start()
    print(f"Starts at every logon (Startup folder: {link.name}); started now.")
    print(f"Token: {config.token_path()} (not shown). Next: python -m tools.keeper add-laptop  (then push)")


def cmd_uninstall(a):
    startup_link().unlink(missing_ok=True)
    print("removed from Startup" + ("; stopped the running node" if _stop_running() else ""))


def cmd_status(a):
    import urllib.request
    from tools.laptop_node import index, server
    print(f"startup   {'yes' if startup_link().exists() else 'NOT installed'} ({startup_link().name})")
    print(f"token     {'present' if config.token() else 'MISSING'} ({config.token_path()})")
    try:
        ip = server.tailscale_ip(wait=0)
        url = f"http://{ip}:{config.settings()['port']}"
        with urllib.request.urlopen(f"{url}/health", timeout=5) as resp:
            h = json.loads(resp.read())
        print(f"node      answering at {url} — {h.get('files')} files indexed")
    except BaseException as e:                      # SystemExit from tailscale_ip too
        print(f"node      not answering ({type(e).__name__}) — see {config.state_dir() / 'laptop-node.log'}")
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
