"""
web — Agent Smith's "open a Google search in Chrome on the node" routine.

The ask: "search Google for X", "look up X on Google", "google X". Kundai's original
words were "command this machine to go onto Google Chrome and search for something." So
this routine does two things, in the "open on the node, link on the phone" shape he chose:

  1. LAUNCH on the node — open the real Chrome browser on the Chromebook, visibly, at
     https://www.google.com/search?q=<X>. No Selenium, no headless driver: just hand the
     URL to the OS/browser the way clicking a link would. If no browser can be launched
     (e.g. the backend is running on a headless Codespaces box, not the Chromebook), that
     is not an error — we just skip the launch and still return the link.
  2. RETURN the URL — so the phone that uttered the command gets a tappable link and can
     open the same search itself. The PWA renders this as a big "Open search ▸" button.

This is deliberately NOT a scraper. It does not fetch or parse Google's results — that
would be brittle, ToS-adjacent, and (per the plan) unnecessary. It opens the search; the
human reads it. It is read-only in the Agent-Smith sense: it commits an act (the count
increments in intent.py) but stores nothing and mutates no state.

Slice shape (consumed by the /command render + the PWA command page):
  {"kind":"web", "action":"search", "engine":"google", "query":.., "url":..,
   "launched":bool, "launch_detail":..}
"""

import os
import re
import shutil
import asyncio
import platform
import urllib.parse
from typing import Dict, Any, List, Optional

# Verbs that mean "run a web/Google search". Kept small and explicit; the router in
# intent.py gates on these same shapes before this module is ever called.
_SEARCH_LEADINS = (
    "search google for ", "google search for ", "search the web for ",
    "search for ", "google for ", "look up ", "search google ", "google ",
    "web search ", "search ",
)


def _extract_query(text: str) -> str:
    """Pull the search terms out of the utterance. Strips a leading search verb and any
    trailing 'on google / in chrome / on the web' tail, leaving just what to search for."""
    s = " ".join(text.strip().split())
    low = s.lower()
    for lead in _SEARCH_LEADINS:               # longest, most specific lead-ins first
        if low.startswith(lead):
            s = s[len(lead):]
            break
    # A bare "search"/"search for" lead-in can leave a target phrase like "the internet
    # for X" or "the web for X" — peel that engine-noun + "for" fragment off the front too.
    s = re.sub(r"^(the\s+)?(web|internet|google|online|net)\s+(for\s+|about\s+)?",
               "", s, flags=re.I).strip()
    # peel a trailing "... on google", "... in chrome", "... on the web"
    tail = s
    low = tail.lower()
    for suffix in (" on google", " in chrome", " on chrome", " on the web",
                   " in google", " on the internet", " online"):
        if low.endswith(suffix):
            tail = tail[: -len(suffix)]
            low = tail.lower()
    return tail.strip().strip('"').strip("'").strip()


def _search_url(query: str) -> str:
    """Build a Google search URL for the query (properly percent-encoded)."""
    return "https://www.google.com/search?q=" + urllib.parse.quote_plus(query)


def _chrome_candidates() -> List[str]:
    """Ways to launch a *visible* Chrome, best-first, across the platforms this node might
    run on. On the Chromebook (Crostini = Debian Linux) google-chrome / chromium is the hit;
    the Windows/macOS entries are for running the backend on Kundai's dev box."""
    names = [
        "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
        "chrome",
    ]
    found = [shutil.which(n) for n in names]
    cands = [f for f in found if f]
    system = platform.system()
    if system == "Windows":
        for p in (
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        ):
            if os.path.exists(p):
                cands.append(p)
    elif system == "Darwin":
        p = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        if os.path.exists(p):
            cands.append(p)
    return cands


async def _launch_on_node(url: str) -> Dict[str, Any]:
    """Try to open the URL in a visible browser on THIS machine. Best-effort: returns
    {launched, detail}. Never raises — a node that can't open a window (headless server)
    just reports launched=False and the caller still returns the link."""
    # Prefer a real Chrome if we can find one, so the window is actually Chrome as asked.
    for chrome in _chrome_candidates():
        try:
            # DISPLAY must be set for a GUI to appear on Linux; if it isn't, the launch
            # will fail fast and we fall through to reporting launched=False.
            proc = await asyncio.create_subprocess_exec(
                chrome, "--new-window", url,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            # Don't await the browser (it stays open); give it a beat to fail on a bad DISPLAY.
            await asyncio.sleep(0.4)
            if proc.returncode not in (None, 0):
                continue
            return {"launched": True, "detail": f"opened Chrome ({os.path.basename(chrome)})"}
        except Exception:
            continue

    # No Chrome we could launch — fall back to the OS default handler, still on the node.
    system = platform.system()
    try:
        if system == "Linux":
            opener = shutil.which("xdg-open")
            if opener and os.environ.get("DISPLAY"):
                proc = await asyncio.create_subprocess_exec(
                    opener, url,
                    stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
                await asyncio.sleep(0.4)
                if proc.returncode in (None, 0):
                    return {"launched": True, "detail": "opened default browser (xdg-open)"}
        elif system == "Windows":
            # `start` is a cmd builtin; go through cmd so it resolves the default browser.
            proc = await asyncio.create_subprocess_exec(
                "cmd", "/c", "start", "", url,
                stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
            await asyncio.sleep(0.4)
            return {"launched": True, "detail": "opened default browser (start)"}
        elif system == "Darwin":
            proc = await asyncio.create_subprocess_exec(
                "open", url,
                stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
            await asyncio.sleep(0.4)
            return {"launched": True, "detail": "opened default browser (open)"}
    except Exception as e:
        return {"launched": False, "detail": f"no launch: {e}"}

    reason = "no DISPLAY (headless node)" if system == "Linux" else "no browser found"
    return {"launched": False, "detail": reason}


async def answer_web(text: str) -> Dict[str, Any]:
    """Handle one web-search utterance: open it in Chrome on the node, return the link."""
    query = _extract_query(text)
    if not query:
        return {
            "kind": "web", "action": "search", "engine": "google",
            "query": "", "url": None, "launched": False,
            "answer": "What should I search for? Try: “search Google for lipid rafts”.",
        }
    url = _search_url(query)
    launch = await _launch_on_node(url)
    if launch["launched"]:
        answer = f"Opened “{query}” in Chrome on your machine. Tap to open it here too."
    else:
        answer = f"Search link for “{query}” — the node couldn’t open a window ({launch['detail']})."
    return {
        "kind": "web", "action": "search", "engine": "google",
        "query": query, "url": url,
        "launched": launch["launched"], "launch_detail": launch["detail"],
        "answer": answer,
    }
