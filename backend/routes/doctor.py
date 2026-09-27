"""
doctor — Agent Smith's self-diagnosis. "Is this node actually able to answer?"

The problem this solves is the one that keeps wasting utterances: you say a command, it
travels phone → Tailnet → node, and only THEN do you learn the integration was dead —
Ollama wasn't serving, the `spraypaint` index was never built, an organ isn't on PATH,
or the node is headless so "search Google in Chrome" can never open a window. Each of
those is a silent 502/504 on a spent command. The credential strip (secrets.py) already
answers this for *keys*; doctor answers it for *capability*.

The design is lifted from the Agent-Reach idea of a `doctor` subcommand that PROBES
rather than assumes: don't report "purpose: installed" because a file exists — resolve
the binary AND run a tiny real query and see if it comes back non-empty. A probe that
actually exercises the path is the only report worth trusting before you commit a command
to it.

Like secrets.status(), this is value-free and read-only in the Agent-Smith sense: it
commits an act (the count increments in intent.py) but stores nothing and mutates no
state — every check is a fresh probe (Inv 3). It never returns file contents, credential
values, or query results — only, per capability, whether it works and a one-line reason.

Slice shape (consumed by the /command render + the PWA):
  {"kind":"doctor", "answer":.., "ok":bool, "n_ok":int, "n_total":int,
   "checks":[{"name":.., "ok":bool, "detail":.., "critical":bool}, ...]}
"""

import os
import shutil
import asyncio
import platform
from pathlib import Path
from typing import Dict, Any, List, Optional

import httpx

ROOT = Path(__file__).parent.parent.parent

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")


# --------------------------------------------------------------------------- helpers

def _resolve_bin(name: str) -> Optional[str]:
    """Find a tool binary the way intent.py does: PATH first, then ~/.cargo/bin (+ .exe),
    which is not on the non-interactive shell PATH. Returns the path, or None if unresolved.
    Unlike intent._resolve_bin this never raises — a missing organ is a check result, not
    a request failure."""
    found = shutil.which(name)
    if found:
        return found
    cargo = Path.home() / ".cargo" / "bin" / name
    for candidate in (cargo, cargo.with_suffix(".exe")):
        if candidate.exists():
            return str(candidate)
    return None


async def _run(args: List[str], timeout: int = 15) -> Dict[str, Any]:
    """Run a probe command and capture its outcome. Returns {ok, code, out, err}. The `ok`
    here is only 'did it exit 0'; the caller decides what a healthy result looks like
    (e.g. non-empty stdout). Never raises — a probe that can't start is just ok=False."""
    try:
        proc = await asyncio.create_subprocess_exec(
            *args,
            cwd=str(ROOT),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        out, err = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError:
        return {"ok": False, "code": None, "out": "", "err": f"timed out after {timeout}s"}
    except Exception as e:
        return {"ok": False, "code": None, "out": "", "err": f"failed to start: {e}"}
    return {
        "ok": proc.returncode == 0,
        "code": proc.returncode,
        "out": out.decode("utf-8", "replace").strip(),
        "err": err.decode("utf-8", "replace").strip(),
    }


def _check(name: str, ok: bool, detail: str, critical: bool = True) -> Dict[str, Any]:
    return {"name": name, "ok": bool(ok), "detail": detail, "critical": bool(critical)}


# --------------------------------------------------------------------------- probes

async def _probe_ollama() -> Dict[str, Any]:
    """Is the local model actually serving? Hit /api/tags and check the configured model is
    pulled. Not critical: the router works with Ollama down (deterministic rules); only the
    summary sentence and semantic ranking need it. Reported so you know WHY a summary was
    missing before you blame the file-read."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{OLLAMA_URL}/api/tags")
            resp.raise_for_status()
            tags = resp.json().get("models", [])
    except httpx.ConnectError:
        return _check("ollama", False, "not running — start with `ollama serve`", critical=False)
    except Exception as e:
        return _check("ollama", False, f"unreachable: {e}", critical=False)
    names = [m.get("name", "") for m in tags]
    # model names carry a :tag; match on the stem so llama3.2:3b matches llama3.2:3b-instruct
    stem = OLLAMA_MODEL.split(":")[0]
    have = any(n == OLLAMA_MODEL or n.split(":")[0] == stem for n in names)
    if have:
        return _check("ollama", True, f"serving · {OLLAMA_MODEL} pulled", critical=False)
    return _check(
        "ollama", False,
        f"serving but {OLLAMA_MODEL} not pulled — `ollama pull {OLLAMA_MODEL}`",
        critical=False,
    )


async def _probe_organ(name: str, smoke_query: str, json_flag: bool) -> Dict[str, Any]:
    """Resolve a search organ AND run a tiny real query — the Agent-Reach 'probe, don't
    assume' rule. A binary that resolves but returns nonzero (most often: no index built)
    is NOT healthy, and we say which so you don't waste a command discovering it."""
    binary = _resolve_bin(name)
    if not binary:
        return _check(name, False, "not installed (not on PATH or ~/.cargo/bin)")
    args = [binary, "ask", smoke_query]
    if json_flag:
        args.append("--json")
    res = await _run(args, timeout=15)
    if not res["ok"]:
        # surface the organ's own stderr — usually "no index; run `<organ> index`"
        reason = res["err"] or f"exited {res['code']} with no output"
        return _check(name, False, f"installed but query failed — {reason[:160]}")
    if not res["out"]:
        return _check(name, False, "installed, index present, but query returned nothing "
                                   "(empty index?)")
    return _check(name, True, "installed · index built · smoke query returned results")


def _probe_display() -> Dict[str, Any]:
    """Can the node open a visible browser window? 'search Google in Chrome' needs a GUI:
    on Linux that means DISPLAY is set AND a chrome binary exists. A headless Codespaces/
    Render box legitimately can't — that's not a fault, but the web routine will only return
    a link, never open a window, and you should know that up front. Not critical."""
    system = platform.system()
    chrome_names = ("google-chrome", "google-chrome-stable", "chromium",
                    "chromium-browser", "chrome")
    has_chrome = any(shutil.which(n) for n in chrome_names)
    if system == "Linux":
        if not os.environ.get("DISPLAY"):
            return _check("display", False,
                          "headless node (no DISPLAY) — web search returns a link, "
                          "won't open a window", critical=False)
        if not has_chrome:
            return _check("display", False,
                          "DISPLAY set but no Chrome/Chromium found", critical=False)
        return _check("display", True, "DISPLAY set · Chrome available — web search opens a window",
                      critical=False)
    # On Windows/macOS a default-browser launch is always available via start/open.
    detail = "desktop OS — web search opens the default browser"
    return _check("display", True, detail, critical=False)


# --------------------------------------------------------------------------- entrypoint

async def answer_doctor(text: str = "") -> Dict[str, Any]:
    """Probe the node's real capability and return a value-free health slice. Runs the
    organ smoke tests concurrently with the Ollama probe so the whole check stays fast."""
    ollama, purpose_c, spraypaint_c = await asyncio.gather(
        _probe_ollama(),
        _probe_organ("purpose", "main", json_flag=False),
        _probe_organ("spraypaint", "the", json_flag=True),
    )
    checks: List[Dict[str, Any]] = [purpose_c, spraypaint_c, ollama, _probe_display()]

    n_total = len(checks)
    n_ok = sum(1 for c in checks if c["ok"])
    # "healthy" = every CRITICAL check passes. Non-critical failures (Ollama, headless
    # display) degrade gracefully and don't flip the node to red.
    critical_bad = [c for c in checks if c["critical"] and not c["ok"]]
    ok = not critical_bad

    if ok and n_ok == n_total:
        answer = f"Node healthy — all {n_total} checks pass."
    elif ok:
        soft = ", ".join(c["name"] for c in checks if not c["ok"])
        answer = (f"Node ready — search organs live ({n_ok}/{n_total} checks). "
                  f"Degraded (non-blocking): {soft}.")
    else:
        names = ", ".join(c["name"] for c in critical_bad)
        answer = f"Node NOT ready — {names} failing. Commands routed there will error."

    return {
        "kind": "doctor",
        "answer": answer,
        "ok": ok,
        "n_ok": n_ok,
        "n_total": n_total,
        "checks": checks,
    }
