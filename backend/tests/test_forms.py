"""
Filling in documents (backend/forms) with no model and no network: AcroForm fields are
read and written; a proposed value counts only when its quote is really in its source;
one source is one witness; your answer publishes; only solved fields reach the PDF; facts
you confirm are offered to the next form. Run: python -m pytest backend/tests/test_forms.py
"""

import asyncio
import io

import pytest
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (ArrayObject, DecodedStreamObject, DictionaryObject, FloatObject, NameObject,
                           TextStringObject)

from backend.forms import pdf
from backend.forms.service import FormService, witnessed


def run(c):
    return asyncio.run(c)


def make_form() -> bytes:
    """A one-page AcroForm: two text fields (with tooltips) and a checkbox."""
    w = PdfWriter()
    page = w.add_blank_page(612, 792)
    refs = []

    def add(d):
        d.update({NameObject("/Type"): NameObject("/Annot"), NameObject("/Subtype"): NameObject("/Widget"),
                  NameObject("/Rect"): ArrayObject([FloatObject(x) for x in (50, 700 - 40 * len(refs), 300, 720 - 40 * len(refs))])})
        refs.append(w._add_object(d))

    for name, tu in (("name", "Familienname"), ("dob", "Geburtsdatum")):
        add(DictionaryObject({NameObject("/FT"): NameObject("/Tx"), NameObject("/T"): TextStringObject(name),
                              NameObject("/TU"): TextStringObject(tu), NameObject("/V"): TextStringObject(""),
                              NameObject("/DA"): TextStringObject("/Helv 10 Tf 0 g")}))
    on, off = DecodedStreamObject(), DecodedStreamObject()
    add(DictionaryObject({NameObject("/FT"): NameObject("/Btn"), NameObject("/T"): TextStringObject("married"),
                          NameObject("/V"): NameObject("/Off"), NameObject("/AS"): NameObject("/Off"),
                          NameObject("/AP"): DictionaryObject({NameObject("/N"): DictionaryObject({
                              NameObject("/Ja"): w._add_object(on), NameObject("/Off"): w._add_object(off)})})}))
    page[NameObject("/Annots")] = ArrayObject(refs)
    w._root_object[NameObject("/AcroForm")] = DictionaryObject({NameObject("/Fields"): ArrayObject(refs)})
    buf = io.BytesIO()
    w.write(buf)
    return buf.getvalue()


def test_pdf_fields_and_fill():
    data = make_form()
    fs = {f["name"]: f for f in pdf.fields(data)}
    assert fs["name"]["label"] == "Familienname" and fs["married"]["kind"] == "checkbox"
    assert fs["married"]["options"] == ["Ja"]
    out = pdf.fill(data, {"name": "Sachikonye", "married": "yes"})
    got = PdfReader(io.BytesIO(out)).get_fields()
    assert got["name"]["/V"] == "Sachikonye" and got["married"]["/V"] == "/Ja" and got["dob"].get("/V") in ("", None)


def test_witnessed_needs_the_quote_verbatim_and_the_value_inside_it():
    text = "Name:   Kundai Sachikonye\nGeboren am 12.03.1992 in Harare"
    assert witnessed("12.03.1992", "geboren am 12.03.1992", text)
    assert not witnessed("1992-03-12", "Geboren am 12.03.1992", text)        # reformatted: not in the quote
    assert not witnessed("12.03.1992", "born on 12.03.1992", text)            # quote not in the source


class FakeProposer:
    def __init__(self, reply):
        self.reply = reply

    async def ask_json(self, spec, system, user):
        self.user = user
        return "fake/model", self.reply


def svc(tmp_path, reply):
    fp = FakeProposer(reply)
    return FormService(root=tmp_path, proposer_factory=lambda cloud: fp), fp


def test_reading_counts_only_witnessed_quotes_once_per_source(tmp_path):
    reply = {"fields": [
        {"field": "dob", "value": "12.03.1992", "source": "s1", "quote": "Geboren am 12.03.1992"},
        {"field": "name", "value": "Sachikonye", "source": "s1", "quote": "Familienname: Smith"},   # not in the source
    ]}
    s, _ = svc(tmp_path, reply)
    f = s.create("Anmeldung", make_form())
    s.add_source(f["id"], "pass.txt", "Familienname: Sachikonye\nGeboren am 12.03.1992".encode(), "text/plain")
    run(s.read(f["id"]))
    run(s.read(f["id"]))                                   # the same source again is not a second witness
    rows = {r["name"]: r for r in s.view(f["id"])["rows"]}
    assert rows["dob"]["witnesses"] == 1 and rows["dob"]["status"] == "undecided"
    assert rows["dob"]["evidence"][0]["cue"] == "Geboren am 12.03.1992"
    assert rows["name"]["witnesses"] == 0 and rows["name"]["status"] == "assumed"
    assert "Sachikonye" in rows["name"]["candidates"]      # proposed, kept in virtual, moved no margin
    assert "1 were not" in s.forms[f["id"]]["note"] or "1 were not and" in s.forms[f["id"]]["note"]


def test_your_answer_publishes_and_only_solved_fields_are_filled(tmp_path):
    s, _ = svc(tmp_path, {"fields": []})
    f = s.create("Anmeldung", make_form())
    s.answer(f["id"], "name", "Sachikonye")
    s.answer(f["id"], "married", None)                     # leave blank: ⊥
    v = s.view(f["id"])
    rows = {r["name"]: r for r in v["rows"]}
    assert rows["name"]["status"] == "solved" and rows["married"]["status"] == "declined"
    data, fname, ctype = s.filled(f["id"])
    got = PdfReader(io.BytesIO(data)).get_fields()
    assert got["name"]["/V"] == "Sachikonye" and got["dob"].get("/V") in ("", None) and ctype == "application/pdf"


def test_confirmed_facts_are_offered_to_the_next_form(tmp_path):
    s, fp = svc(tmp_path, {"fields": [{"field": "Nachname", "value": "Sachikonye", "source": "facts",
                                        "quote": "Familienname: Sachikonye"}]})
    a = s.create("Anmeldung", make_form())
    s.answer(a["id"], "name", "Sachikonye")                # remember=True by default
    b = s.create("Fragebogen", labels=["Nachname"])         # a sheet: no PDF
    s.add_source(b["id"], "empty.txt", b"nothing useful here", "text/plain")
    run(s.read(b["id"]))
    assert "facts you confirmed earlier" in fp.user and "Familienname: Sachikonye" in fp.user
    row = s.view(b["id"])["rows"][0]
    assert row["witnesses"] == 1 and row["evidence"][0]["source"] == "facts"
    text, fname, ctype = s.filled(b["id"])
    assert fname.endswith("-values.txt") and b"Nachname: (open)" in text


def test_a_pdf_without_fields_needs_labels(tmp_path):
    s, _ = svc(tmp_path, {})
    w = PdfWriter()
    w.add_blank_page(100, 100)
    buf = io.BytesIO()
    w.write(buf)
    with pytest.raises(ValueError, match="no fillable fields"):
        s.create("Scan", buf.getvalue())


def test_your_word_publishes_on_a_large_form_and_quoted_fields_confirm_in_one_act(tmp_path):
    s, _ = svc(tmp_path, {"fields": [{"field": f"f{i}", "value": "v", "source": "s1", "quote": "Wert: v"}
                                     for i in range(150)]})
    f = s.create("Personalfragebogen", labels=[f"f{i}" for i in range(300)])
    s.add_source(f["id"], "alt.txt", b"Wert: v", "text/plain")
    run(s.read(f["id"]))
    v = s.answer(f["id"], "f299", "typed by you")
    rows = {r["name"]: r for r in v["rows"]}
    # θ = log(151/0.05) = 8.01 nats, above the 6.9 a confirmation was worth at r = 0.999
    assert v["theta"] > 6.91 and rows["f299"]["status"] == "solved"
    assert rows["f0"]["status"] == "undecided"
    v = s.confirm_quoted(f["id"])
    assert v["counts"]["solved"] == 151 and v["counts"]["assumed"] == 149


def test_a_filled_pdf_reads_with_its_values_and_re_adding_updates_the_text(tmp_path):
    from backend.text_extract import text_of
    filled = pdf.fill(make_form(), {"name": "Sachikonye", "dob": "12.03.1992"})
    text = text_of(filled, "application/pdf", "alt.pdf")
    assert "Familienname: Sachikonye" in text and "Geburtsdatum: 12.03.1992" in text
    s, _ = svc(tmp_path, {})
    f = s.create("Neu", make_form())
    s._store_source(f["id"], "alt.pdf", filled, "short", "document")        # as read before the update
    s.add_source(f["id"], "alt.pdf", filled, "application/pdf")
    src = s.forms[f["id"]]["sources"]
    assert len(src) == 1 and src[0]["chars"] == len(text) and src[0]["id"] == "s1"


def test_a_scan_is_transcribed_only_when_cloud_models_are_allowed(tmp_path, monkeypatch):
    from backend.forms import scan
    s, _ = svc(tmp_path, {"fields": [{"field": "dob", "value": "12.03.1992", "source": "s1", "quote": "Geburtsdatum: 12.03.1992"}]})
    f = s.create("Neu", make_form())
    blank = io.BytesIO()
    w = PdfWriter(); w.add_blank_page(100, 100); w.write(blank)
    with pytest.raises(ValueError, match="allow cloud"):
        run(s.add_document(f["id"], "scan.pdf", blank.getvalue(), "application/pdf", allow_ocr=False))

    async def fake(data, providers):
        return "Arbeitsvertrag\nGeburtsdatum: 12.03.1992", "openai/gpt-5.5"
    monkeypatch.setattr(scan, "transcribe", fake)
    import backend.primitive.service as ps
    monkeypatch.setattr(ps, "service", lambda: type("S", (), {"providers": None})())
    run(s.add_document(f["id"], "scan.pdf", blank.getvalue(), "application/pdf", allow_ocr=True))
    assert s.forms[f["id"]]["sources"][0]["kind"] == "scan"
    run(s.read(f["id"]))
    row = next(r for r in s.view(f["id"])["rows"] if r["name"] == "dob")
    assert row["evidence"][0]["channel"] == "scan" and row["witnesses"] == 1
