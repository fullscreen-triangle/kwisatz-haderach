"""
Where an okgg entity and its cues are, to the line.

okgg reports entities as `path#slug` (a section) or `path` (a whole file) and triples as a cue
word witnessed in a channel. It does not report line numbers, so they are recovered here by
repeating okgg's own rules exactly (conspirator/okgg/src/corpus.rs and text.rs):

  * sections: Markdown headings of level <= section_level outside fenced code; LaTeX
    \\section / \\subsection after \\begin{document}; text before the first heading is a
    section (slug "_") only when it has at least 20 words; duplicate slugs get -2, -3, ...;
  * slugify: lower-case, ASCII alphanumerics kept, any other run becomes one '-', trimmed;
  * words: identifiers split at case boundaries, lower-cased, ASCII alphanumeric runs,
    plural endings reduced (-ies -> -y, -sses -> -ss, final -s unless -ss/-us/-is).

A cue is located at the first line of its first contiguous occurrence inside the entity's
span — the text the witness read. If the port ever disagreed with okgg, the cue would simply
not be found in the span, and the reference says so (line None) rather than guessing.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

# ------------------------------------------------------------------ okgg text rules


def stem(t: str) -> str:
    n = len(t)
    if n > 4 and t.endswith("ies"):
        return t[:-3] + "y"
    if n > 4 and t.endswith("sses"):
        return t[:-2]
    if n > 3 and t.endswith("s") and not t.endswith(("ss", "us", "is")):
        return t[:-1]
    return t


def split_case(text: str) -> str:
    out = []
    for i, c in enumerate(text):
        if i > 0 and "A" <= c <= "Z":
            p = text[i - 1]
            nxt = text[i + 1] if i + 1 < len(text) else ""
            if ("a" <= p <= "z") or p.isdigit() and p.isascii() or (("A" <= p <= "Z") and "a" <= nxt <= "z"):
                out.append(" ")
        out.append(c)
    return "".join(out)


_RUN = re.compile(r"[a-z0-9]+")


def words(text: str) -> List[str]:
    return [stem(w) for w in _RUN.findall(split_case(text).lower())]


def slugify(h: str) -> str:
    out = []
    for c in h.lower():
        if c.isascii() and c.isalnum():
            out.append(c)
        elif out and out[-1] != "-":
            out.append("-")
    return "".join(out).rstrip("-")


_TEX_COMMENT = re.compile(r"(?m)(^|[^\\])%.*$")
_TEX_PREAMBLE = re.compile(r"(?m)^\s*\\(documentclass|usepackage|input|include|bibliography|bibliographystyle|"
                           r"newcommand|renewcommand|DeclareMathOperator|label|ref|cref|Cref|cite[a-z]*)\b.*$")
_TEX_CMD = re.compile(r"\\[a-zA-Z@]+\*?")


def detex(text: str) -> str:
    t = _TEX_COMMENT.sub(r"\1", text)
    t = _TEX_PREAMBLE.sub(" ", t)
    return _TEX_CMD.sub(" ", t)


# ------------------------------------------------------------------ sections with line spans


@dataclass
class Span:
    key: str
    heading: str
    start: int          # 1-based, inclusive (the heading line for a section)
    end: int            # 1-based, inclusive


def _md_heading(t: str) -> Optional[Tuple[int, str]]:
    n = len(t) - len(t.lstrip("#"))
    if 1 <= n <= 6 and t[n:n + 1] == " ":
        return n, t[n:].strip().rstrip("#").strip()
    return None


def _split_md(lines: List[str], level: int) -> List[Tuple[str, int, int]]:
    """(heading, start line, end line) per section, or [] when no heading starts one."""
    out: List[Tuple[str, int, int]] = []
    head, start, cur_words, started, fence = "", 1, 0, False, False
    for i, line in enumerate(lines, 1):
        t = line.lstrip()
        if t.startswith("```") or t.startswith("~~~"):
            fence = not fence
        if not fence:
            h = _md_heading(t)
            if h and h[0] <= level:
                if started or cur_words >= 20:
                    out.append((head, start, i - 1))
                head, start, cur_words, started = h[1], i, 0, True
                continue
        cur_words += len(line.split())
    if not started:
        return []
    out.append((head, start, len(lines)))
    return out


_TEX_SEC = re.compile(r"\\(section|subsection)\*?\{([^}]*)\}")


def _split_tex(text: str, level: int) -> List[Tuple[str, int, int]]:
    base = text.find("\\begin{document}")
    base = max(base, 0)
    body = text[base:]
    marks = [(m.start() + base, m.group(2)) for m in _TEX_SEC.finditer(body) if level >= 2 or m.group(1) == "section"]
    if not marks:
        return []
    line_of = lambda off: text.count("\n", 0, off) + 1
    out = []
    if len(detex(text[base:marks[0][0]]).split()) >= 20:
        out.append(("", line_of(base), line_of(marks[0][0]) - 1))
    for i, (off, h) in enumerate(marks):
        stop = line_of(marks[i + 1][0]) - 1 if i + 1 < len(marks) else text.count("\n") + 1
        out.append((detex(h), line_of(off), stop))
    return out


def sections(path: str, text: str, level: int = 2) -> List[Span]:
    """okgg's --unit section entities of one file, with their line spans."""
    lines = text.splitlines()
    ext = path.lower().rsplit(".", 1)[-1] if "." in path else ""
    parts = _split_md(lines, level) if ext in ("md", "markdown") else _split_tex(text, level) if ext == "tex" else []
    if not parts:
        return [Span(key=path, heading="", start=1, end=max(1, len(lines)))]
    seen: Dict[str, int] = {}
    out = []
    for h, s, e in parts:
        slug = slugify(h) or "_"
        seen[slug] = seen.get(slug, 0) + 1
        if seen[slug] > 1:
            slug = f"{slug}-{seen[slug]}"
        out.append(Span(key=f"{path}#{slug}", heading=h.strip(), start=s, end=max(s, e)))
    return out


def cue_line(lines: List[str], start: int, end: int, cue: str) -> Optional[int]:
    """First line (1-based) in [start, end] where the cue's words occur contiguously —
    across line breaks too, since the witness reads the section as one token stream."""
    want = words(cue)
    if not want:
        return None
    toks: List[Tuple[str, int]] = []
    for n in range(start, min(end, len(lines)) + 1):
        toks += [(w, n) for w in words(lines[n - 1])]
    k = len(want)
    for i in range(len(toks) - k + 1):
        if all(toks[i + j][0] == want[j] for j in range(k)):
            return toks[i][1]
    return None
