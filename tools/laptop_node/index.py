"""
A filename index of the served folders: one SQLite table, rebuilt by a full walk (≈70k
files in ≈7 s on this laptop), so there is no watcher to go stale.

Search is on the path, not the content (content comes from Windows Search, winsearch.py).
A query is folded (lowercase, accents stripped, stopwords dropped) into terms, each with
its German transliteration as an alternative ("Dörr" matches "dorr" and "doerr"). A term
scores its rarity (IDF over the index) — 3× in the file's name, 1× elsewhere in its path —
so "airbus cover letter" ranks the one Airbus file above every cover letter. A file needs
at least ⌊n/2⌋ of the n terms, and is nudged up by being a document and by being recent.
"""

from __future__ import annotations

import math
import os
import re
import sqlite3
import threading
import time
import unicodedata
from pathlib import Path
from typing import List, Optional

from tools.laptop_node import config

STOP = {"a", "an", "the", "my", "me", "i", "of", "for", "to", "in", "on", "and", "or", "with", "from",
        "file", "files", "document", "doc", "find", "open", "show", "where", "is", "that", "this", "about",
        "laptop", "on", "please", "der", "die", "das", "den", "dem", "ein", "eine", "mein", "meine", "und",
        "von", "zu", "im", "auf", "fur", "datei"}
# LaTeX/build by-products: never what anyone is looking for, and they crowd the results.
NOISE_EXT = {".aux", ".log", ".out", ".toc", ".bbl", ".blg", ".fls", ".fdb_latexmk", ".synctex", ".gz",
             ".nav", ".snm", ".vrb", ".lof", ".lot", ".pyc", ".map", ".lock", ".tmp", ".bak"}
DOC_EXT = {".pdf": 1.0, ".docx": 1.0, ".doc": 0.8, ".md": 0.6, ".tex": 0.6, ".txt": 0.5, ".odt": 0.8,
           ".pptx": 0.8, ".xlsx": 0.7, ".csv": 0.4}

_lock = threading.Lock()


def fold(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[\\/_\-.\s]+", " ", s).strip()


GERMAN = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})


def terms(q: str) -> List[tuple]:
    """Each query word as (folded, transliterated) variants; stopwords dropped."""
    out = []
    for w in re.split(r"[\\/_\-.\s]+", q.lower()):
        f = fold(w)
        if not f or f in STOP or len(f) < 2:
            continue
        g = fold(w.translate(GERMAN))
        out.append((f,) if g == f else (f, g))
    return out


def words(q: str) -> List[str]:
    """The raw query words (umlauts kept) minus stopwords — for Windows Search."""
    return [w for w in re.findall(r"\w+", q.lower()) if fold(w) not in STOP and len(w) > 1]


def _db() -> sqlite3.Connection:
    db = sqlite3.connect(config.state_dir() / "laptop-index.db", check_same_thread=False)
    db.execute("CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, name TEXT, ext TEXT, size INT,"
               " mtime REAL, norm TEXT, fname TEXT)")
    db.execute("CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)")
    return db


def walk() -> List[tuple]:
    rows = []
    for root in config.roots():
        stack = [root]
        while stack:
            d = stack.pop()
            try:
                it = os.scandir(d)
            except OSError:
                continue
            with it:
                for e in it:
                    try:
                        if e.is_dir(follow_symlinks=False):
                            if e.name not in config.SKIP_DIRS and e.name not in config.DENY_DIRS:
                                stack.append(e.path)
                            continue
                        p = Path(e.path)
                        if p.suffix.lower() in NOISE_EXT or e.name.startswith("~$") or config.denied(p):
                            continue
                        st = e.stat(follow_symlinks=False)
                    except OSError:
                        continue
                    rel = os.path.relpath(e.path, config.HOME)
                    rows.append((e.path, e.name, p.suffix.lower(), st.st_size, st.st_mtime,
                                 fold(rel), fold(p.stem)))
    return rows


def rebuild() -> int:
    t = time.time()
    rows = walk()
    with _lock:
        db = _db()
        with db:
            db.execute("DELETE FROM files")
            db.executemany("INSERT OR REPLACE INTO files VALUES (?,?,?,?,?,?,?)", rows)
            db.execute("INSERT OR REPLACE INTO meta VALUES ('indexed_at', ?)", (str(time.time()),))
            db.execute("INSERT OR REPLACE INTO meta VALUES ('took', ?)", (f"{time.time() - t:.1f}",))
        db.close()
    return len(rows)


def stats() -> dict:
    with _lock:
        db = _db()
        n = db.execute("SELECT COUNT(*) FROM files").fetchone()[0]
        meta = dict(db.execute("SELECT k, v FROM meta").fetchall())
        db.close()
    return {"files": n, "indexed_at": float(meta["indexed_at"]) if "indexed_at" in meta else None,
            "took_s": meta.get("took")}


def search(q: str, k: int = 20, under: Optional[str] = None) -> List[dict]:
    ts = terms(q)
    if not ts:
        return []
    need = max(1, len(ts) // 2)                 # 1 of 2-3 terms, 2 of 4-5: rarity does the ranking
    variants = [v for t in ts for v in t]
    where = " OR ".join("norm LIKE ?" for _ in variants)
    args: list = [f"%{v}%" for v in variants]
    if under:
        where = f"({where}) AND path LIKE ?"
        args.append(str(Path(under)) + "%")
    with _lock:
        db = _db()
        total = db.execute("SELECT COUNT(*) FROM files").fetchone()[0] or 1
        rows = db.execute(f"SELECT path, name, ext, size, mtime, norm, fname FROM files WHERE {where}"
                          " ORDER BY mtime DESC LIMIT 20000", args).fetchall()
        db.close()

    def has(t: tuple, text: str) -> bool:
        return any(v in text for v in t)

    # squared: one rare term (airbus) must outweigh two common ones (cover, letter)
    idf = [math.log(1 + total / (1 + sum(1 for r in rows if has(t, r[5])))) ** 2 for t in ts]
    now = time.time()
    out = []
    for path, name, ext, size, mtime, norm, fname in rows:
        hit = [i for i, t in enumerate(ts) if has(t, norm)]
        if len(hit) < need:
            continue
        score = sum(idf[i] * (3.0 if has(ts[i], fname) else 1.0) for i in hit)
        score += DOC_EXT.get(ext, 0.0)
        score += 1.0 / (1.0 + (now - mtime) / (30 * 86400))       # a month ago weighs half
        out.append({"path": path, "name": name, "size": size, "mtime": mtime,
                    "score": round(score, 3), "where": "name"})
    out.sort(key=lambda r: r["score"], reverse=True)
    return out[:k]


def loop(every: int = 15 * 60) -> None:
    """Rebuild now and then every `every` seconds (a daemon thread in the server)."""
    while True:
        try:
            rebuild()
        except Exception:
            pass
        time.sleep(every)
