"""
nav — Agent Smith's stateful filesystem navigation + read routine.

The readfile routine (in facts.py) was stateless: it tried to turn a whole spoken
sentence into a path in one shot, which is fragile ("the borgia readme" → glob for a
file containing the word "the" → nothing). This module replaces blind file-finding with
the way a person actually navigates: one step at a time, always relative to "where am I".

    "what folders are in my documents"      -> ls the Documents root
    "open bioinformatics"                   -> cd into it (fuzzy-matched to the listing)
    "open borgia"                           -> cd deeper
    "open publication"                      -> cd deeper
    "read cheminformatics-engine.pdf and summarise it"  -> read (PDF-aware) + Ollama summary

The cursor (current working directory) is a single value persisted on disk — one user,
one node, so no per-session multiplexing. It is *always* confined to a whitelist of roots;
any attempt to escape (`..` past a root, a symlink out) snaps back and is refused. Listing
and reading never leave the whitelist.

Verbs are matched deterministically here — navigation must work with Ollama down. Only the
optional summary line needs the model.

Returns slices shaped like the other routines so /command renders them uniformly:
  {"kind":"nav", "action":"ls"|"cd"|"up"|"home", "cwd":.., "entries":[..]}
  {"kind":"readfile", "path":.., "answer":.., "excerpt":.., ...}
"""

import os
import re
import json
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import HTTPException

from backend.routes.facts import ROOT, READ_CAP_BYTES, _summarize

# Roots the cursor may sit under. The repo, plus the user's Documents — under BOTH the
# English and German-locale names, since the node is a German-locale Crostini box where
# ~/Documents may actually be ~/Dokumente. Extra roots via NAV_ROOTS (os.pathsep-separated).
_DEFAULT_ROOTS = [
    ROOT,
    Path.home() / "Documents",
    Path.home() / "Dokumente",
]
for _p in os.getenv("NAV_ROOTS", "").split(os.pathsep):
    if _p.strip():
        _DEFAULT_ROOTS.append(Path(_p.strip()).expanduser())

NAV_ROOTS: List[Path] = []
for _r in _DEFAULT_ROOTS:
    try:
        rr = _r.resolve()
        if rr.is_dir() and rr not in NAV_ROOTS:
            NAV_ROOTS.append(rr)
    except OSError:
        pass

# Where the cursor is remembered between utterances (next to the committed-count file).
_STATE_DIR = ROOT / "backend" / ".agent_smith"
_CWD_FILE = _STATE_DIR / "nav_cwd"

# Directories we never list or descend into — noise, huge, or not the user's content.
_SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", ".cargo",
              "target", ".next", "dist", "build", ".spraypaint", ".purpose",
              ".agent_smith", "site-packages"}

# Extensions we can read as text/PDF for the read verb.
_TEXT_EXT = {".md", ".txt", ".py", ".rs", ".js", ".ts", ".tsx", ".json", ".toml",
             ".yaml", ".yml", ".tex", ".html", ".css", ".sh", ".cfg", ".ini", ".csv"}


# ------------------------------------------------------------------------- whitelist

def _within_roots(p: Path) -> bool:
    """True iff p is inside one of the whitelist roots (after resolving symlinks)."""
    try:
        rp = p.resolve()
    except OSError:
        return False
    for base in NAV_ROOTS:
        try:
            rp.relative_to(base)
            return True
        except ValueError:
            continue
    return False


def _default_root() -> Path:
    """Where 'home' / a fresh cursor starts: the user's Documents if present, else repo."""
    for base in NAV_ROOTS:
        if base.name.lower() in ("documents", "dokumente"):
            return base
    return NAV_ROOTS[0] if NAV_ROOTS else ROOT


def _get_cwd() -> Path:
    """Read the persisted cursor. Snaps back to a root if it's gone or escaped."""
    try:
        raw = _CWD_FILE.read_text(encoding="utf-8").strip()
        p = Path(raw)
        if p.is_dir() and _within_roots(p):
            return p.resolve()
    except (FileNotFoundError, OSError):
        pass
    return _default_root()


def _set_cwd(p: Path) -> None:
    _STATE_DIR.mkdir(parents=True, exist_ok=True)
    _CWD_FILE.write_text(str(p.resolve()), encoding="utf-8")


# ------------------------------------------------------------------------- listing

def _list_dir(d: Path) -> Dict[str, Any]:
    """List the immediate children of d, folders first, skipping noise dirs."""
    folders, files = [], []
    try:
        for entry in sorted(d.iterdir(), key=lambda e: e.name.lower()):
            name = entry.name
            if name.startswith(".") and name not in (".env",):
                continue
            try:
                if entry.is_dir():
                    if name in _SKIP_DIRS:
                        continue
                    folders.append({"name": name, "type": "dir"})
                elif entry.is_file():
                    files.append({"name": name, "type": "file",
                                  "size": entry.stat().st_size})
            except OSError:
                continue
    except PermissionError:
        raise HTTPException(status_code=403, detail=f"Can't read {d} (permission).")
    return {"folders": folders, "files": files}


def _rel(p: Path) -> str:
    """A short label for the cursor: path relative to its root, or the root's own name."""
    for base in NAV_ROOTS:
        try:
            r = p.resolve().relative_to(base)
            return f"{base.name}/{r}" if str(r) != "." else base.name
        except ValueError:
            continue
    return str(p)


def _ls_slice(d: Path, note: Optional[str] = None) -> Dict[str, Any]:
    listing = _list_dir(d)
    entries = listing["folders"] + listing["files"]
    nf, nfile = len(listing["folders"]), len(listing["files"])
    answer = f"{_rel(d)} — {nf} folder{'s'*(nf!=1)}, {nfile} file{'s'*(nfile!=1)}."
    if note:
        answer = f"{note} {answer}"
    return {"kind": "nav", "action": "ls", "cwd": str(d), "cwd_label": _rel(d),
            "answer": answer, "entries": entries,
            "n_folders": nf, "n_files": nfile}


# --------------------------------------------------------------------- name matching

def _match_child(d: Path, want: str, kind: Optional[str] = None) -> Optional[Path]:
    """Find a child of d that the user named. Exact (case-insensitive) first, then
    unique prefix, then unique substring. kind='dir'|'file'|None restricts the type."""
    want = want.strip().strip('"').strip("'").lower()
    if not want:
        return None
    cands: List[Path] = []
    try:
        for entry in d.iterdir():
            if kind == "dir" and not entry.is_dir():
                continue
            if kind == "file" and not entry.is_file():
                continue
            if entry.is_dir() and entry.name in _SKIP_DIRS:
                continue
            cands.append(entry)
    except OSError:
        return None

    names = {c.name.lower(): c for c in cands}
    if want in names:
        return names[want]
    # also tolerate the user saying the name without its extension
    stem = {c.stem.lower(): c for c in cands if c.is_file()}
    if want in stem:
        return stem[want]
    pref = [c for c in cands if c.name.lower().startswith(want)]
    if len(pref) == 1:
        return pref[0]
    sub = [c for c in cands if want in c.name.lower()]
    if len(sub) == 1:
        return sub[0]
    # multi-word: all tokens present in the name (e.g. "chem engine" -> chem*engine*)
    toks = [t for t in re.split(r"\s+", want) if t]
    if len(toks) > 1:
        multi = [c for c in cands if all(t in c.name.lower() for t in toks)]
        if len(multi) == 1:
            return multi[0]
    return None


# ------------------------------------------------------------------------- read (PDF-aware)

def _read_pdf(path: Path, cap: int) -> str:
    """Extract text from a PDF up to ~cap chars. Requires pypdf; raises 501 if absent."""
    try:
        from pypdf import PdfReader
    except ImportError:
        raise HTTPException(status_code=501,
                            detail="Reading PDFs needs pypdf. On the node: pip install pypdf")
    try:
        reader = PdfReader(str(path))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Couldn't open PDF: {e}")
    out: List[str] = []
    total = 0
    for page in reader.pages:
        try:
            txt = page.extract_text() or ""
        except Exception:
            txt = ""
        out.append(txt)
        total += len(txt)
        if total >= cap:
            break
    text = "\n".join(out).strip()
    return text[:cap]


def _read_any(path: Path) -> Dict[str, Any]:
    """Read a text or PDF file, capped. Returns content + whether it was truncated."""
    ext = path.suffix.lower()
    size = path.stat().st_size
    if ext == ".pdf":
        content = _read_pdf(path, READ_CAP_BYTES)
        truncated = True  # we cap by extracted chars; assume there may be more
    elif ext in _TEXT_EXT or size < READ_CAP_BYTES:
        raw = path.read_bytes()[:READ_CAP_BYTES]
        content = raw.decode("utf-8", "replace")
        truncated = size > READ_CAP_BYTES
    else:
        raise HTTPException(status_code=415,
                            detail=f"{path.name} isn't a readable text/PDF file.")
    return {"content": content, "truncated": truncated, "size": size}


# ------------------------------------------------------------------------- verb parsing

# Which navigation verb is this utterance? Order matters (read before open, up before ls).
_V_UP = re.compile(r"\b(go )?(up|back|parent)\b|\bone level up\b", re.I)
_V_HOME = re.compile(r"\b(go )?home\b|\bstart over\b|\breset\b|\btop\b|\broot\b", re.I)
_V_LS = re.compile(r"\b(what|which|list|show|contents?|folders?|files?)\b|"
                   r"\bwhere am i\b|\bwhat'?s here\b|\bwhat is in\b|\bwhat'?s in\b", re.I)
_V_OPEN = re.compile(r"\b(open|go (in)?to|enter|cd|into|navigate to|move to)\b", re.I)
# These are the read/summarise verbs nav actually receives. "what does X say" is NOT here
# on purpose: intent.py routes that phrasing to spraypaint (its `what does .* say` rule
# matches before any nav rule), so it never reaches nav — no need to parse it here.
_V_READ = re.compile(r"\b(read|summari[sz]e|summary of|open (and|then) (read|summari)|"
                     r"tldr)\b", re.I)


def _strip_verb(text: str, verb: re.Pattern) -> str:
    """Remove the verb + common filler, leaving the target name.

    Handles both orders of the read phrasing — "read X.pdf and summarise it" and
    "summarise the X pdf" — and removes any dangling conjunction the verb/filler
    removal leaves behind (e.g. "X.pdf and" -> "X.pdf"), which was the bug that made
    'read cheminformatics-engine.pdf and summarise it' match nothing.
    """
    s = verb.sub(" ", text)
    # Remove every read/summarise-related verb anywhere (order-independent), so a
    # second verb in "read X and summarise it" doesn't survive as filler.
    s = _V_READ.sub(" ", s)
    s = re.sub(r"\b(the|a|an|my|this|that|folder|directory|dir|file|please|"
               r"for me|it|called|named|and|then|also|too|contents?( of)?)\b",
               " ", s, flags=re.I)
    # Collapse whitespace, then peel any leftover leading/trailing conjunction/punct.
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^(and|then|of|in|to)\b\s*", "", s, flags=re.I)
    s = re.sub(r"\s*\b(and|then)$", "", s, flags=re.I)
    return s.strip().strip('"').strip("'").strip()


def wants_read(text: str) -> bool:
    return bool(_V_READ.search(text))


# ------------------------------------------------------------------------- entry point

async def answer_nav(text: str, want_summary: bool) -> Dict[str, Any]:
    """Handle one navigation/read step, relative to the persisted cursor."""
    cwd = _get_cwd()

    # read / summarise a file in the current folder (most specific — check first)
    if _V_READ.search(text):
        name = _strip_verb(text, _V_READ)
        target = _match_child(cwd, name, kind="file") if name else None
        if target is None:
            # maybe they named a folder to enter and then read — but keep it simple:
            # if we can't find a file, tell them what files are here.
            listing = _list_dir(cwd)
            files = [e["name"] for e in listing["files"]]
            raise HTTPException(status_code=404, detail=(
                f"No file matching “{name}” in {_rel(cwd)}. "
                + (f"Files here: {', '.join(files[:12])}" if files else "No files here.")))
        return await _read_slice(target, text, want_summary)

    # up / back
    if _V_UP.search(text):
        parent = cwd.parent
        if not _within_roots(parent):
            return _ls_slice(cwd, note="Already at the top —")
        _set_cwd(parent)
        return _ls_slice(parent, note="Went up.")

    # home / reset
    if _V_HOME.search(text) and not _V_OPEN.search(text):
        root = _default_root()
        _set_cwd(root)
        return _ls_slice(root, note="Back to the top.")

    # open / cd into a named child (check before ls: "open X" contains no ls words but
    # "go into X" shouldn't be caught by ls; explicit open verb wins)
    if _V_OPEN.search(text):
        name = _strip_verb(text, _V_OPEN)
        child = _match_child(cwd, name, kind="dir") if name else None
        if child is None:
            listing = _list_dir(cwd)
            folders = [e["name"] for e in listing["folders"]]
            raise HTTPException(status_code=404, detail=(
                f"No folder matching “{name}” in {_rel(cwd)}. "
                + (f"Folders here: {', '.join(folders[:12])}" if folders
                   else "No sub-folders here.")))
        _set_cwd(child)
        return _ls_slice(child, note=f"Opened {child.name}.")

    # default: list where we are (also catches "ls", "what's here", "what folders…")
    return _ls_slice(cwd)


async def _read_slice(target: Path, request: str, want_summary: bool) -> Dict[str, Any]:
    if not _within_roots(target):
        raise HTTPException(status_code=403, detail=f"{target.name} is outside allowed roots.")
    data = _read_any(target)
    answer = None
    if want_summary:
        answer = await _summarize(request, data["content"])
    return {"kind": "readfile", "path": _rel(target), "name": target.name,
            "answer": answer, "excerpt": data["content"][:2000],
            "truncated": data["truncated"], "bytes": data["size"],
            "is_pdf": target.suffix.lower() == ".pdf"}
