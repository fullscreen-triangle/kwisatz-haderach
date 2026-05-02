"""
Walks docs/ and extracts paper metadata from .tex and .pdf files.

Per paper, captures:
  - title
  - abstract
  - keywords
  - section headings (rough structure)
  - inferred domain (from directory)
  - file path, format, size
  - first ~3000 chars of body text (for keyword indexing later)

For .pdf files, uses `pdftotext -layout` (Poppler). For .tex files,
parses the relevant LaTeX commands directly.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import List, Optional


# ---------- LaTeX extraction ----------

# Match \title{...} including line breaks and escaped braces; greedy on outer
# braces is unsafe, so we walk braces manually.
def _extract_braced(text: str, start: int) -> Optional[tuple[str, int]]:
    """Given text and an index pointing to '{', return (inside, index_after_close)."""
    if start >= len(text) or text[start] != "{":
        return None
    depth = 0
    for i in range(start, len(text)):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start + 1:i], i + 1
    return None


def _find_command(text: str, command: str) -> Optional[str]:
    """Find first \\command{...} and return its argument."""
    pattern = re.compile(r"\\" + re.escape(command) + r"\s*\{")
    m = pattern.search(text)
    if not m:
        return None
    extracted = _extract_braced(text, m.end() - 1)
    if not extracted:
        return None
    inner, _ = extracted
    return _clean_latex(inner)


def _find_environment(text: str, env: str) -> Optional[str]:
    """Find \\begin{env}...\\end{env} and return the inner text, cleaned."""
    pattern = re.compile(
        r"\\begin\s*\{" + re.escape(env) + r"\}(.*?)\\end\s*\{" +
        re.escape(env) + r"\}",
        re.DOTALL,
    )
    m = pattern.search(text)
    if not m:
        return None
    return _clean_latex(m.group(1))


def _find_keywords(text: str) -> Optional[str]:
    """Find Keywords: line in the abstract or body."""
    m = re.search(
        r"\\textbf\{Keywords?:\}\s*(.*?)(?:\\end\{abstract\}|\n\n|\\section|$)",
        text, re.DOTALL | re.IGNORECASE,
    )
    if not m:
        m = re.search(
            r"Keywords?:\s*(.*?)(?:\\end\{abstract\}|\n\n|\\section|$)",
            text, re.DOTALL | re.IGNORECASE,
        )
    if not m:
        return None
    return _clean_latex(m.group(1))


def _find_sections(text: str) -> List[str]:
    """Return list of \\section{...} titles in document order."""
    pattern = re.compile(r"\\(?:section|chapter|part)\*?\s*\{")
    sections: List[str] = []
    for m in pattern.finditer(text):
        extracted = _extract_braced(text, m.end() - 1)
        if extracted:
            inner, _ = extracted
            sections.append(_clean_latex(inner))
    return sections


def _clean_latex(s: str) -> str:
    """Strip common LaTeX markup so the metadata is human-readable."""
    if not s:
        return ""
    # remove comments
    s = re.sub(r"(?<!\\)%.*?$", "", s, flags=re.MULTILINE)
    # \emph{x}, \textbf{x}, \textit{x}, \texttt{x} -> x
    for cmd in ("emph", "textbf", "textit", "texttt", "textrm", "mathrm"):
        s = re.sub(r"\\" + cmd + r"\s*\{([^{}]*)\}", r"\1", s)
    # \\, \linebreak, \newline, \quad -> space
    s = re.sub(r"\\(\\|linebreak|newline|quad|qquad|hspace\{[^}]*\})", " ", s)
    # remove other simple commands like \alpha, \pi (replace with name)
    s = re.sub(r"\\([a-zA-Z]+)\s*", r"\1 ", s)
    # remove leftover braces
    s = s.replace("{", " ").replace("}", " ")
    # collapse whitespace
    s = re.sub(r"\s+", " ", s).strip()
    # strip the U+FFFD replacement character that PDF extractors emit
    # when they can't decode a glyph; downstream consumers (Windows cp1252
    # consoles, ASCII-only logs) shouldn't have to handle it.
    s = s.replace("�", "")
    return s


# ---------- PDF extraction ----------

def _pdftotext_available() -> bool:
    return shutil.which("pdftotext") is not None


def _pdf_to_text(path: Path, max_pages: int = 12) -> str:
    """Extract first max_pages of a PDF as layout-preserved text."""
    if not _pdftotext_available():
        return ""
    try:
        result = subprocess.run(
            ["pdftotext", "-layout", "-f", "1", "-l", str(max_pages),
             str(path), "-"],
            capture_output=True, text=True, timeout=60, encoding="utf-8",
            errors="replace",
        )
        return result.stdout or ""
    except (subprocess.TimeoutExpired, OSError):
        return ""


def _strip_replacement_chars(s: str) -> str:
    return s.replace("�", "") if s else s


def _pdf_extract_metadata(text: str) -> dict:
    """Heuristically pull title/abstract/keywords from PDF-extracted text."""
    if not text:
        return {"title": "", "abstract": "", "keywords": "", "sections": []}
    text = _strip_replacement_chars(text)

    # Title: first non-empty line(s) before "Abstract" or author line
    lines = [ln.rstrip() for ln in text.splitlines() if ln.strip()]
    title_lines: List[str] = []
    for ln in lines[:25]:
        if re.match(r"^\s*Abstract\b", ln, re.IGNORECASE):
            break
        if re.match(r"^\s*Kundai", ln):
            break
        if re.match(r"^\s*\d+\s*$", ln):  # bare page numbers
            continue
        title_lines.append(ln.strip())
    title = " ".join(title_lines).strip()
    title = re.sub(r"\s+", " ", title)
    if len(title) > 300:
        title = title[:297] + "..."

    # Abstract: text between "Abstract" and "Keywords" / "Introduction" / first section heading
    abstract = ""
    m = re.search(
        r"Abstract[\s\.:]*\n?(.*?)(?:Keywords?\s*[:\.]|"
        r"\n\s*(?:1\s+Introduction|I\.\s+Introduction|Contents)\b)",
        text, re.DOTALL | re.IGNORECASE,
    )
    if m:
        abstract = re.sub(r"\s+", " ", m.group(1)).strip()
        if len(abstract) > 4000:
            abstract = abstract[:3997] + "..."

    # Keywords: "Keywords: ..." up to blank line or next section
    keywords = ""
    m = re.search(
        r"Keywords?\s*[:\.]\s*(.*?)(?:\n\s*\n|\n\s*(?:1\s+Introduction|"
        r"Contents|I\.\s+Introduction))",
        text, re.DOTALL | re.IGNORECASE,
    )
    if m:
        keywords = re.sub(r"\s+", " ", m.group(1)).strip()
        if len(keywords) > 600:
            keywords = keywords[:597] + "..."

    # Sections: lines starting with a digit then space then a capitalised word
    section_pat = re.compile(
        r"^\s*(\d+(?:\.\d+)*)\s+([A-Z][^\n]{3,120})$", re.MULTILINE,
    )
    sections = [f"{m.group(1)} {m.group(2).strip()}"
                for m in section_pat.finditer(text)]
    # dedupe while preserving order, cap at 40
    seen = set()
    out_sections = []
    for s in sections:
        if s in seen:
            continue
        seen.add(s)
        out_sections.append(s)
        if len(out_sections) >= 40:
            break

    return {
        "title": title,
        "abstract": abstract,
        "keywords": keywords,
        "sections": out_sections,
    }


# ---------- Public API ----------

@dataclass
class Paper:
    path: str
    domain: str
    format: str               # "tex" or "pdf"
    size_kb: int
    title: str
    abstract: str
    keywords: str
    sections: List[str]
    body_excerpt: str         # first ~3000 chars for downstream keyword work

    def short_id(self) -> str:
        return Path(self.path).stem


def _domain_from_path(rel_path: Path) -> str:
    parts = rel_path.parts
    # docs/<domain>/<file> -> domain
    if len(parts) >= 2 and parts[0] == "docs":
        return parts[1]
    if len(parts) >= 1:
        return parts[0]
    return "unknown"


def extract_tex(path: Path) -> Paper:
    raw = path.read_text(encoding="utf-8", errors="replace")
    title = _find_command(raw, "title") or ""
    # \title may be wrapped in \textbf or have line breaks; clean again
    title = re.sub(r"\s+", " ", title).strip()
    abstract = _find_environment(raw, "abstract") or ""
    keywords = _find_keywords(raw) or ""
    sections = _find_sections(raw)

    # Body excerpt: strip preamble (everything before \begin{document})
    body_start = raw.find("\\begin{document}")
    body = raw[body_start:] if body_start > -1 else raw
    body_excerpt = _clean_latex(body[:6000])[:3000]

    return Paper(
        path=str(path).replace("\\", "/"),
        domain=_domain_from_path(path.relative_to(path.parents[len(path.parents) - 2])
                                  if len(path.parents) >= 2 else Path()),
        format="tex",
        size_kb=int(path.stat().st_size / 1024),
        title=title,
        abstract=abstract,
        keywords=keywords,
        sections=sections,
        body_excerpt=body_excerpt,
    )


def extract_pdf(path: Path) -> Paper:
    text = _pdf_to_text(path)
    meta = _pdf_extract_metadata(text)
    body_excerpt = re.sub(r"\s+", " ", text[:6000]).strip()[:3000]

    return Paper(
        path=str(path).replace("\\", "/"),
        domain="",   # filled in by walk_docs
        format="pdf",
        size_kb=int(path.stat().st_size / 1024),
        title=meta["title"],
        abstract=meta["abstract"],
        keywords=meta["keywords"],
        sections=meta["sections"],
        body_excerpt=body_excerpt,
    )


def walk_docs(docs_root: Path) -> List[Paper]:
    """Walk the docs/ tree and extract metadata from every .tex and .pdf."""
    papers: List[Paper] = []
    for path in sorted(docs_root.rglob("*")):
        if path.is_dir():
            continue
        suffix = path.suffix.lower()
        rel = path.relative_to(docs_root.parent)
        try:
            if suffix == ".tex":
                # Re-do extraction with correct domain inference
                p = extract_tex(path)
                p.domain = _domain_from_path(rel)
                papers.append(p)
            elif suffix == ".pdf":
                p = extract_pdf(path)
                p.domain = _domain_from_path(rel)
                papers.append(p)
        except Exception as e:  # noqa: BLE001
            papers.append(Paper(
                path=str(path).replace("\\", "/"),
                domain=_domain_from_path(rel),
                format=suffix.lstrip("."),
                size_kb=int(path.stat().st_size / 1024),
                title=f"<extraction error: {e}>",
                abstract="",
                keywords="",
                sections=[],
                body_excerpt="",
            ))
    return papers


def write_inventory_json(papers: List[Paper], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = [asdict(p) for p in papers]
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def load_inventory_json(path: Path) -> List[Paper]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return [Paper(**d) for d in data]
