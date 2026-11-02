"""
Fillable PDFs (AcroForm): read the fields, write values into them.

A field has a name (the form's own key), a label (its tooltip /TU when the form has one —
usually the question as printed), a kind (text, checkbox, choice) and, for a checkbox or a
choice, its options. Filling writes only the values given; every other field is left as
the form shipped it. NeedAppearances is set so viewers redraw the filled text.

A PDF without AcroForm fields (a scan, a printed form) has nothing to fill: the caller then
works from a field list and hands back a value sheet instead.
"""

from __future__ import annotations

import io
from typing import Dict, List

from pypdf import PdfReader, PdfWriter

TRUE = {"yes", "ja", "x", "true", "1", "on", "✓", "checked", "zutreffend"}


def fields(data: bytes) -> List[dict]:
    reader = PdfReader(io.BytesIO(data))
    out = []
    for name, f in (reader.get_fields() or {}).items():
        ft = f.get("/FT")
        if ft not in ("/Tx", "/Btn", "/Ch"):
            continue                                     # signatures, push buttons' parents …
        states = [s for s in (f.get("/_States_") or []) if s != "/Off"]
        kind = "text" if ft == "/Tx" else "choice" if ft == "/Ch" else "checkbox"
        if kind == "checkbox" and not states:
            continue                                     # a push button
        options = ([str(o[1] if isinstance(o, list) else o) for o in (f.get("/Opt") or [])] if kind == "choice"
                   else [s.lstrip("/") for s in states] if kind == "checkbox" else [])
        label = str(f.get("/TU") or "").strip() or name
        out.append({"name": name, "label": label, "kind": kind, "options": options,
                    "current": str(f.get("/V") or "").lstrip("/")})
    return out


def _checkbox_state(value: str, options: List[str]) -> str:
    v = value.strip()
    if v in options:
        return "/" + v
    if v.lower() in TRUE and options:
        return "/" + options[0]
    return "/Off"


def fill(data: bytes, values: Dict[str, str]) -> bytes:
    """The PDF with `values` (field name → value) written into its fields."""
    kinds = {f["name"]: f for f in fields(data)}
    writer = PdfWriter(clone_from=PdfReader(io.BytesIO(data)))
    out: Dict[str, str] = {}
    for name, value in values.items():
        f = kinds.get(name)
        if f is None:
            continue
        out[name] = _checkbox_state(value, f["options"]) if f["kind"] == "checkbox" else value
    for page in writer.pages:
        if "/Annots" in page:
            writer.update_page_form_field_values(page, out, auto_regenerate=False)
    writer.set_need_appearances_writer(True)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()
