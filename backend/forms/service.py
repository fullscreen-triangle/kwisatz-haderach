"""
Forms on the node.

  <state>/forms/<id>/form.json          title, kind, fields, sources, status (atomic rewrite)
  <state>/forms/<id>/original.pdf       the form as given (never changed)
  <state>/forms/<id>/sources/<sha>.txt  the text of each attached document, by digest
  <state>/forms/<id>/memory/            the form's fields as a working memory
  <state>/memory/facts/                 facts about you, shared by every form
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import secrets
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from backend.forms import pdf
from backend.keeper.service import state_dir
from backend.memory import store
from backend.memory.observe import statement
from backend.memory.structure import BOT, Structure, node_id
from backend.primitive.route import GENERAL, ChatError, Pool, RoutedProposer
from backend.primitive.trie import clip

log = logging.getLogger("forms")

ME = "me"
SOURCE_CHARS = {"local": 16000, "cloud": 80000}     # all sources together; the local model has 8k tokens
READ_SYSTEM = """\
You read documents to fill in a form. You never guess and never invent.
For each field you can answer FROM THE SOURCES, give:
  field  — the field's name exactly as listed
  value  — the value exactly as it should be written into the form
  source — the id of the source it comes from
  quote  — a passage copied character for character from that source, containing the value
Leave out every field the sources do not answer. A checkbox's value is one of its options.
Reply with ONE JSON object and nothing else:
  {"fields": [{"field": "...", "value": "...", "source": "...", "quote": "..."}]}"""


def _now() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")


def norm(s: str) -> str:
    return " ".join(str(s).split()).casefold()


def fact_slot(label: str) -> str:
    return re.sub(r"[^0-9a-zäöüß]+", " ", label.casefold()).strip()


def witnessed(value: str, quote: str, text: str) -> bool:
    """The quote is in the source verbatim (whitespace and case aside) and holds the value."""
    q, v = norm(quote), norm(value)
    return len(q) >= 3 and bool(v) and q in norm(text) and v in q


class FormService:
    def __init__(self, root: Optional[Path] = None, proposer_factory=None):
        self._root = root
        self._proposer_factory = proposer_factory      # (allow_cloud) -> RoutedProposer; tests inject one
        self.forms: Dict[str, dict] = {}
        self._load()

    @property
    def root(self) -> Path:
        d = self._root or state_dir()
        (d / "forms").mkdir(parents=True, exist_ok=True)
        return d

    def _dir(self, fid: str) -> Path:
        return self.root / "forms" / fid

    def _load(self) -> None:
        for p in sorted((self.root / "forms").glob("*/form.json")):
            try:
                f = json.loads(p.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            if f.get("status") == "reading":
                f["status"], f["note"] = "ready", "the node restarted while the documents were read"
            self.forms[f["id"]] = f

    def _save(self, f: dict) -> None:
        f["updated"] = _now()
        d = self._dir(f["id"])
        d.mkdir(parents=True, exist_ok=True)
        tmp = d / ".form.json.tmp"
        tmp.write_text(json.dumps(f, ensure_ascii=False), encoding="utf-8")
        tmp.replace(d / "form.json")

    def memory(self, fid: str) -> Structure:
        return store.load(self._dir(fid) / "memory")

    def facts(self) -> Structure:
        return store.load(self.root / "memory" / "facts")

    # ----------------------------------------------------------------- creating

    def create(self, title: str, pdf_bytes: Optional[bytes] = None, labels: Optional[List[str]] = None) -> dict:
        fields = pdf.fields(pdf_bytes) if pdf_bytes else []
        kind = "pdf"
        if not fields:
            labels = [l.strip() for l in (labels or []) if l.strip()]
            if not labels:
                raise ValueError("this PDF has no fillable fields — give the field labels (one per line) "
                                 "and the desk will hand back a value sheet instead")
            fields = [{"name": l, "label": l, "kind": "text", "options": [], "current": ""} for l in labels]
            kind = "sheet"
        fid = datetime.now().strftime("%Y%m%d-%H%M%S-") + secrets.token_hex(3)
        f = {"id": fid, "title": title.strip() or "Form", "kind": kind, "fields": fields, "sources": [],
             "status": "ready", "note": "", "created": _now(), "reads": []}
        d = self._dir(fid)
        d.mkdir(parents=True, exist_ok=True)
        if pdf_bytes:
            (d / "original.pdf").write_bytes(pdf_bytes)
        mem = Structure(alpha=0.05)
        for fl in fields:
            options = fl["options"] + (["Off"] if fl["kind"] == "checkbox" else [])
            mem.add_node(f"form:{fid}", fl["name"], options, label=fl["label"])
        store.save(mem, d / "memory")
        self.forms[fid] = f
        self._save(f)
        return f

    def add_source(self, fid: str, name: str, data: bytes, ctype: str = "") -> dict:
        from backend.text_extract import text_of
        f = self._need(fid)
        text = text_of(data, ctype, name) or ""
        if not text.strip():
            raise ValueError(f"no text could be read from {name} (a scan needs OCR first)")
        sha = hashlib.sha256(data).hexdigest()
        if any(s["sha"] == sha for s in f["sources"]):
            return f
        (self._dir(fid) / "sources").mkdir(exist_ok=True)
        (self._dir(fid) / "sources" / f"{sha}.txt").write_text(text, encoding="utf-8")
        f["sources"].append({"id": f"s{len(f['sources']) + 1}", "name": name, "sha": sha, "chars": len(text)})
        self._save(f)
        return f

    async def add_laptop_source(self, fid: str, path: str) -> dict:
        from backend import laptop
        data, ctype, name = await laptop.fetch(path)
        return self.add_source(fid, name, data, ctype)

    def _need(self, fid: str) -> dict:
        f = self.forms.get(fid)
        if f is None:
            raise KeyError(fid)
        return f

    # ----------------------------------------------------------------- reading the documents

    def _sources(self, f: dict, budget: int) -> List[Tuple[str, str, str]]:
        """(id, name, text) of every source, plus your published facts, clipped to `budget`."""
        out = []
        for s in f["sources"]:
            out.append((s["id"], s["name"], (self._dir(f["id"]) / "sources" / f"{s['sha']}.txt").read_text(encoding="utf-8")))
        facts = self.facts()
        pub = facts.published()
        if pub:
            lines = [f"{facts.nodes[nid].label}: {v}" for nid, v in sorted(pub.items())]
            out.append(("facts", "facts you confirmed earlier", "\n".join(lines)))
        share = max(budget // max(len(out), 1), 2000)
        return [(i, n, t[:share]) for i, n, t in out]

    async def read(self, fid: str, allow_cloud: bool = False) -> dict:
        """Let a model propose values with quotes; keep as observations only the quotes that
        are really in their sources."""
        f = self._need(fid)
        if f["status"] == "reading":
            return f
        f["status"], f["note"] = "reading", ""
        self._save(f)
        try:
            proposer = await self._make_proposer(allow_cloud)
            srcs = self._sources(f, SOURCE_CHARS["cloud" if allow_cloud else "local"])
            if not srcs:
                raise ValueError("attach at least one document first")
            user = f"FORM: {f['title']}\n\nFIELDS:\n" + "".join(
                f"- {fl['name']} | {fl['label']} | {fl['kind']}" + (f" | options: {', '.join(fl['options'])}" if fl["options"] else "") + "\n"
                for fl in f["fields"]) + "\nSOURCES:\n" + "".join(f"=== source {i}: {n} ===\n{t}\n\n" for i, n, t in srcs)
            model, reply = await proposer.ask_json(GENERAL, READ_SYSTEM, user)
            counts = self._admit(f, srcs, reply.get("fields") or [], model)
            f["reads"].append({"at": _now(), "model": model, **counts})
            f["note"] = (f"{model} proposed {counts['proposed']} value(s); {counts['witnessed']} quote(s) were found "
                         f"in their sources, {counts['unwitnessed']} were not and count for nothing")
        except (ChatError, ValueError, RuntimeError, OSError) as e:
            f["note"] = clip(str(e), 400)
        f["status"] = "ready"
        self._save(f)
        return f

    async def _make_proposer(self, allow_cloud: bool) -> RoutedProposer:
        if self._proposer_factory:
            return self._proposer_factory(allow_cloud)
        from backend.primitive.service import service as primitive
        prov = primitive().providers
        pool, live, st, local = await prov.pool()
        if not allow_cloud:
            if not local:
                raise RuntimeError("the node's own model is not reachable, and this form does not allow cloud models")
            pool, live = Pool(), None
        return RoutedProposer(pool, prov, live=live, local=local, blocked=prov.refused())

    def _admit(self, f: dict, srcs, items: list, model: str) -> dict:
        mem = self.memory(f["id"])
        texts = {i: t for i, _, t in srcs}
        names = {fl["name"]: fl for fl in f["fields"]}
        counts = {"proposed": 0, "witnessed": 0, "unwitnessed": 0}
        for it in items:
            if not isinstance(it, dict):
                continue
            name, value = str(it.get("field", "")), str(it.get("value", "")).strip()
            src, quote = str(it.get("source", "")), str(it.get("quote", ""))
            if name not in names or not value:
                continue
            nid = node_id(f"form:{f['id']}", name)
            counts["proposed"] += 1
            mem.propose(nid, value, by=model, why=f"quote from {src}: {clip(quote, 160)}")
            node = mem.nodes[nid]
            already = any(o.node == nid and o.source == src for o in mem.observations)
            if src in texts and witnessed(value, quote, texts[src]) and not already:
                mem.observe(statement(node, value, "facts" if src == "facts" else "document", src, cue=quote))
                counts["witnessed"] += 1
            else:
                counts["unwitnessed"] += 0 if already else 1
        store.save(mem, self._dir(f["id"]) / "memory")
        return counts

    # ----------------------------------------------------------------- your answers

    def confirm_quoted(self, fid: str, remember: bool = True) -> dict:
        """You confirm, in one act, every waiting field whose leader a document quote supports.
        Each becomes your own statement — what you accept, you accept field by field in the
        record; fields with no quote behind them still wait."""
        v = self.view(fid)
        for r in v["rows"]:
            quoted = any(e["channel"] != "person" for e in r["evidence"])
            if r["status"] == "undecided" and quoted and r["leader"] not in (None, BOT):
                self.answer(fid, r["name"], r["leader"], remember)
        return self.view(fid)

    def answer(self, fid: str, field: str, value: Optional[str], remember: bool = True) -> dict:
        """You confirm or type a value (a person observation), or say leave it blank (⊥)."""
        f = self._need(fid)
        fl = next((x for x in f["fields"] if x["name"] == field), None)
        if fl is None:
            raise KeyError(field)
        mem = self.memory(fid)
        nid = node_id(f"form:{fid}", field)
        if value is None:
            mem.observe(statement(mem.nodes[nid], BOT, "person", "you"))
        else:
            mem.add_candidate(nid, value)
            mem.observe(statement(mem.nodes[nid], value.strip(), "person", "you"))
            if remember and fl["kind"] == "text":
                facts = self.facts()
                n = facts.add_node(ME, fact_slot(fl["label"]), label=fl["label"])
                facts.add_candidate(n.id, value)
                facts.observe(statement(n, value.strip(), "person", "you", cue=f"{f['title']}: {fl['label']}"))
                store.save(facts, self.root / "memory" / "facts")
        store.save(mem, self._dir(fid) / "memory")
        self._save(f)
        return self.view(fid)

    # ----------------------------------------------------------------- what it looks like

    def view(self, fid: str) -> dict:
        f = self._need(fid)
        mem = self.memory(fid)
        g = mem.graphs()
        rows = []
        for fl in f["fields"]:
            nid = node_id(f"form:{fid}", fl["name"])
            s = g["status"][nid]
            rows.append({**fl, "status": s["status"], "value": s["value"], "leader": s["leader"],
                         "runner_up": s["runner_up"], "margin": round(s["margin"], 2) if s["margin"] != float("inf") else None,
                         "witnesses": s["witnesses"], "candidates": mem.nodes[nid].candidates,
                         "evidence": [w for w in g["witnessed"] if w["node"] == nid],
                         "proposals": [p for p in g["virtual"] if p["node"] == nid][-3:]})
        counts = {k: sum(1 for r in rows if r["status"] == k) for k in ("solved", "declined", "undecided", "assumed")}
        return {**f, "theta": round(mem.theta, 2), "rows": rows, "counts": counts,
                "key": mem.key(s["sha"] for s in f["sources"])}

    def filled(self, fid: str) -> Tuple[bytes, str, str]:
        """The PDF with only solved fields written — or, for a sheet, the values as text."""
        v = self.view(fid)
        values = {r["name"]: r["value"] for r in v["rows"] if r["status"] == "solved"}
        safe = re.sub(r"[^0-9A-Za-z._-]+", "-", v["title"]).strip("-") or "form"
        if v["kind"] == "pdf":
            return pdf.fill((self._dir(fid) / "original.pdf").read_bytes(), values), f"{safe}-filled.pdf", "application/pdf"
        lines = [f"{v['title']}\n"]
        for r in v["rows"]:
            shown = r["value"] if r["status"] == "solved" else ("(leave blank)" if r["status"] == "declined" else "(open)")
            lines.append(f"{r['label']}: {shown}")
        return "\n".join(lines).encode("utf-8"), f"{safe}-values.txt", "text/plain; charset=utf-8"

    def recent(self) -> List[dict]:
        return [{k: f.get(k) for k in ("id", "title", "kind", "status", "created", "updated")}
                for f in sorted(self.forms.values(), key=lambda f: f["created"], reverse=True)]


_SERVICE: Optional[FormService] = None


def service() -> FormService:
    global _SERVICE
    if _SERVICE is None:
        _SERVICE = FormService()
    return _SERVICE
