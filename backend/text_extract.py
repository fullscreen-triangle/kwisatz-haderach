"""
Text out of a document's bytes — PDF, Word, HTML, plain text. Shared by the mail pipeline
(attachments) and the laptop node (files on the laptop), so it imports nothing from the
node: only pypdf / python-docx, loaded when a file of that kind turns up. No OCR.
"""

from __future__ import annotations

import io

MAX_TEXT = 200_000
TEXT_SUFFIXES = (".txt", ".md", ".csv", ".tsv", ".json", ".ics", ".tex", ".bib", ".py", ".rs", ".ts",
                 ".tsx", ".js", ".jsx", ".toml", ".yaml", ".yml", ".xml", ".rst", ".org", ".log", ".sql",
                 ".r", ".jl", ".sh", ".ps1", ".css", ".scss", ".ini", ".cfg")


def is_texty(name: str) -> bool:
    low = name.lower()
    return low.endswith(TEXT_SUFFIXES + (".pdf", ".docx", ".html", ".htm"))


def text_of(data: bytes, ctype: str, name: str) -> str:
    low = name.lower()
    try:
        if ctype == "application/pdf" or low.endswith(".pdf"):
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(data))
            return "\n\n".join((p.extract_text() or "") for p in reader.pages)[:MAX_TEXT]
        if low.endswith(".docx") or ctype.endswith("wordprocessingml.document"):
            import docx  # python-docx
            doc = docx.Document(io.BytesIO(data))
            parts = [p.text for p in doc.paragraphs]
            for t in doc.tables:
                for row in t.rows:
                    parts.append(" | ".join(c.text for c in row.cells))
            return "\n".join(parts)[:MAX_TEXT]
        if ctype.startswith("text/html") or low.endswith((".html", ".htm")):
            from backend.mail.parse import html_to_text
            return html_to_text(data.decode("utf-8", "replace"))[:MAX_TEXT]
        if ctype.startswith("text/") or low.endswith(TEXT_SUFFIXES):
            return data.decode("utf-8", "replace")[:MAX_TEXT]
    except Exception as e:                  # a broken file must not break whoever asked
        return f"(could not extract text: {type(e).__name__})"
    return ""
