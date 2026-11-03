"""
The agent's tools. Each is an async function taking the run and its JSON arguments and
returning (result for the model, graph additions). Results are kept small: a model reads
summaries and asks for more, it is never handed a mailbox.

Files the agent saves (attachments, downloads) live in the task's folder and are named by
a short id (f1, f2 …) that later calls refer to.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, List, Tuple

from backend.tasks import web

Result = Tuple[Any, List[dict]]                  # (for the model, graph nodes/links to add)


@dataclass
class Run:
    task: dict                                   # the task record (service.py)
    dir: Path
    cloud: bool                                  # may form reading use cloud models?
    files: Dict[str, dict] = field(default_factory=dict)

    def save_file(self, name: str, data: bytes, origin: str) -> dict:
        fid = f"f{len(self.files) + 1}"
        safe = re.sub(r"[^\w.\-]+", "_", name)[:80] or "file"
        path = self.dir / "files" / f"{fid}-{safe}"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        info = {"id": fid, "name": name, "path": str(path), "size": len(data), "origin": origin}
        if data[:5] == b"%PDF-":
            from backend.forms import pdf
            try:
                info["fillable_fields"] = len(pdf.fields(data))
            except Exception:
                info["fillable_fields"] = 0
        self.files[fid] = info
        self.task.setdefault("files", []).append(dict(info))
        return info

    def restore_files(self) -> None:
        """The files of an earlier run of this task, so a continued run can use f1, f2 …"""
        for info in self.task.get("files") or []:
            path = info.get("path") or next((str(p) for p in (self.dir / "files").glob(f"{info['id']}-*")), "")
            if path and Path(path).exists():
                self.files[info["id"]] = {**info, "path": path}


def node(nid: str, kind: str, label: str, **kw) -> dict:
    return {"node": {"id": nid, "kind": kind, "label": label, **kw}}


def link(s: str, t: str, kind: str = "produces") -> dict:
    return {"link": {"source": s, "target": t, "kind": kind}}


def clip(s: str, n: int) -> str:
    s = str(s or "")
    return s if len(s) <= n else s[:n] + f" … [{len(s) - n} more characters]"


# --------------------------------------------------------------------------- mail

async def search_mail(run: Run, sender: str = "", words: str = "", since_days: int = 0, limit: int = 15) -> Result:
    from backend.mail.service import MAIL
    since = (datetime.now(timezone.utc) - timedelta(days=since_days)).isoformat() if since_days else ""
    rows = MAIL.store.find(sender=sender, words=words, since=since, limit=limit)
    g = []
    for r in rows:
        g += [node(f"mail:{r['key']}", "mail", r["subject"] or "(no subject)", ref=r["key"])]
    return ([{"key": r["key"], "date": r["date"][:16], "from": f"{r['from_name'] or ''} <{r['from_addr']}>",
              "subject": r["subject"], "preview": " ".join((r["preview"] or "").split())[:200]} for r in rows]
            or "no mail matches (the node holds mail since mid-September 2026 only)"), g


async def read_mail(run: Run, key: str) -> Result:
    from backend.mail import attachments
    from backend.mail.service import MAIL
    m = MAIL.store.get_message(key)
    if m is None:
        return f"no mail with key {key}", []
    links: List[dict] = []
    try:                                       # links live in the HTML, which the stored text lost
        import email
        import email.policy
        raw = await attachments._raw_again(key)
        if raw:
            msg = email.message_from_bytes(raw, policy=email.policy.default)
            for part in msg.walk():
                if part.get_content_type() == "text/html":
                    links += web.links_in_html(part.get_content(), "")
        atts = await attachments.ensure(key)
    except Exception as e:
        atts = attachments.listing(key) or []
        links.append({"note": f"could not fetch the original message again ({type(e).__name__})"})
    links += [l for l in web.links_in_text(m.text or "") if l["url"] not in {x.get("url") for x in links}]
    g = [node(f"mail:{key}", "mail", m.subject or "(no subject)", ref=key)]
    for i, a in enumerate(atts):
        g += [node(f"att:{key}:{i}", "attachment", a.get("name", f"attachment {i}")), link(f"mail:{key}", f"att:{key}:{i}", "cites")]
    return {"key": key, "date": m.date.isoformat()[:16] if hasattr(m.date, "isoformat") else str(m.date)[:16],
            "from": f"{m.from_name or ''} <{m.from_addr}>", "subject": m.subject, "text": clip(m.text, 6000),
            "links": [l for l in links if l.get("url")][:40],
            "attachments": [{"index": i, "name": a.get("name"), "type": a.get("type"), "chars": a.get("chars")}
                            for i, a in enumerate(atts)]}, g


async def save_attachment(run: Run, key: str, index: int) -> Result:
    from backend.mail import attachments
    data = attachments.raw(key, int(index))
    meta = (attachments.listing(key) or [])
    if data is None or int(index) >= len(meta):
        return f"mail {key} has no attachment {index}", []
    info = run.save_file(meta[int(index)].get("name") or f"attachment-{index}", data, f"mail {key}")
    return _file_view(info), [node(f"file:{info['id']}", "attachment", info["name"]), link(f"att:{key}:{index}", f"file:{info['id']}")]


# --------------------------------------------------------------------------- the web

async def open_link(run: Run, url: str) -> Result:
    try:
        f = await web.fetch(url)
    except web.Refused as e:
        return f"refused: {e}", []
    except Exception as e:
        return f"could not open {url}: {type(e).__name__}", []
    lid = f"url:{url[:200]}"
    g = [node(lid, "source", f.title or url.split("//", 1)[-1][:60])]
    if f.is_pdf:
        info = run.save_file(f.filename if f.filename.lower().endswith(".pdf") else f"{f.filename}.pdf", f.data, url)
        g += [node(f"file:{info['id']}", "attachment", info["name"]), link(lid, f"file:{info['id']}")]
        return {"url": f.url, "saved": _file_view(info)}, g
    if f.login:
        return {"url": f.url, "status": f.status, "needs_login": True, "title": f.title,
                "note": "this page asks for a login — the desk cannot sign in; tell Kundai which page it is"}, g
    if f.status >= 400:
        return {"url": f.url, "status": f.status, "error": "the server refused or does not have this page"}, g
    pdfs = [l for l in f.links if l["pdf"]]
    return {"url": f.url, "title": f.title, "text": clip(f.text, 3000), "pdf_links": pdfs[:30],
            "other_links": [l for l in f.links if not l["pdf"]][:40]}, g


def _file_view(info: dict) -> dict:
    out = {"file": info["id"], "name": info["name"], "size": info["size"]}
    if "fillable_fields" in info:
        out["fillable_fields"] = info["fillable_fields"]
        if not info["fillable_fields"]:
            out["note"] = "a PDF without fillable fields: make_form needs the field labels for it"
    return out


# --------------------------------------------------------------------------- forms

async def make_form(run: Run, file: str = "", title: str = "", labels: List[str] = (), laptop_path: str = "") -> Result:
    from backend.forms.service import service as forms
    if laptop_path and not file:
        from backend import laptop
        try:
            data, _, name = await laptop.fetch(laptop_path)
        except Exception as e:
            return f"could not fetch {laptop_path} from the laptop ({type(e).__name__})", []
        file = run.save_file(name, data, f"laptop {laptop_path}")["id"]
    info = run.files.get(file)
    if info is None:
        return f"no file {file} in this task — give a file id (f1, f2 …) or laptop_path", []
    try:
        f = forms().create(title or info["name"], Path(info["path"]).read_bytes() if not labels else None, list(labels) or None)
    except ValueError as e:
        return str(e), []
    run.task.setdefault("forms", []).append({"id": f["id"], "title": f["title"]})
    return {"form_id": f["id"], "title": f["title"], "kind": f["kind"], "page": f"/desk/forms?id={f['id']}",
            "fields": [{"name": x["name"], "label": x["label"], "kind": x["kind"]} for x in f["fields"]][:80]}, \
        [node(f"form:{f['id']}", "result", f["title"]), link(f"file:{file}", f"form:{f['id']}")]


async def add_source(run: Run, form_id: str, mail_key: str = "", file: str = "", laptop_path: str = "") -> Result:
    from backend.forms.service import service as forms
    from backend.mail import attachments
    from backend.mail.service import MAIL
    svc = forms()
    try:
        if mail_key:
            m = MAIL.store.get_message(mail_key)
            if m is None:
                return f"no mail {mail_key}", []
            parts = [f"From: {m.from_name} <{m.from_addr}>\nSubject: {m.subject}\n\n{m.text}"]
            for i, a in enumerate(attachments.listing(mail_key) or []):
                t = attachments.text(mail_key, i)
                if t:
                    parts.append(f"\n\n--- attachment: {a.get('name')} ---\n{t}")
            svc.add_source(form_id, f"mail: {m.subject}", "".join(parts).encode("utf-8"), "text/plain")
            src = f"mail:{mail_key}"
        elif file:
            info = run.files.get(file)
            if info is None:
                return f"no file {file}", []
            svc.add_source(form_id, info["name"], Path(info["path"]).read_bytes(), "")
            src = f"file:{file}"
        elif laptop_path:
            await svc.add_laptop_source(form_id, laptop_path)
            src = f"laptop:{laptop_path}"
            return {"form_id": form_id, "sources": len(svc.forms[form_id]["sources"])}, \
                [node(src, "laptop", laptop_path.rsplit("\\", 1)[-1].rsplit("/", 1)[-1]), link(src, f"form:{form_id}", "cites")]
        else:
            return "give mail_key, file or laptop_path", []
    except (KeyError, ValueError) as e:
        return f"could not add it: {e}", []
    return {"form_id": form_id, "sources": len(svc.forms[form_id]["sources"])}, [link(src, f"form:{form_id}", "cites")]


async def fill_form(run: Run, form_id: str) -> Result:
    from backend.forms.service import service as forms
    svc = forms()
    try:
        await svc.read(form_id, allow_cloud=run.cloud)
        v = svc.view(form_id)
    except KeyError:
        return f"no form {form_id}", []
    return _form_summary(v), [node(f"form:{form_id}", "result", f"{v['title']} · {v['counts']['solved']}/{len(v['rows'])} filled")]


async def form_status(run: Run, form_id: str) -> Result:
    from backend.forms.service import service as forms
    try:
        return _form_summary(forms().view(form_id)), []
    except KeyError:
        return f"no form {form_id}", []


def _form_summary(v: dict) -> dict:
    return {"form_id": v["id"], "title": v["title"], "page": f"/desk/forms?id={v['id']}", "note": v.get("note", ""),
            "counts": v["counts"], "threshold_nats": v["theta"],
            "filled": {r["label"]: r["value"] for r in v["rows"] if r["status"] == "solved"},
            "needs_kundai": [{"field": r["label"], "best_guess": r["leader"] if r["leader"] not in (None, "⊥") else None,
                              "witnesses": r["witnesses"]} for r in v["rows"] if r["status"] in ("undecided", "assumed")][:60]}


async def known_facts(run: Run) -> Result:
    from backend.forms.service import service as forms
    f = forms().facts()
    pub = f.published()
    return ({f.nodes[n].label: v for n, v in sorted(pub.items())} or "no facts confirmed yet"), []


async def search_laptop(run: Run, query: str) -> Result:
    from backend import laptop
    try:
        hits = await laptop.search(query, k=12)
    except Exception as e:
        return f"the laptop did not answer ({type(e).__name__}) — it may be asleep or offline", []
    return [{"path": h.get("path"), "name": h.get("name"), "snippet": (h.get("snippet") or "")[:160]} for h in hits], \
        [node(f"laptop:{h.get('path')}", "laptop", h.get("name") or "") for h in hits[:6]]


# --------------------------------------------------------------------------- registry

def _fn(name, desc, props, required=()):
    return {"type": "function", "function": {"name": name, "description": desc, "parameters": {
        "type": "object", "properties": props, "required": list(required), "additionalProperties": False}}}


S = {"type": "string"}
TOOLS: Dict[str, Tuple[Callable[..., Awaitable[Result]], dict]] = {
    "search_mail": (search_mail, _fn("search_mail", "Find Kundai's mail by sender (part of a name or address) and/or words that must all occur. Newest first.",
                                     {"sender": S, "words": S, "since_days": {"type": "integer"}, "limit": {"type": "integer"}})),
    "read_mail": (read_mail, _fn("read_mail", "Read one mail: its text, the links in it, and its attachments.", {"key": S}, ["key"])),
    "save_attachment": (save_attachment, _fn("save_attachment", "Save one attachment of a mail as a file of this task.",
                                             {"key": S, "index": {"type": "integer"}}, ["key", "index"])),
    "open_link": (open_link, _fn("open_link", "Open a web link. A PDF is saved as a file of this task; a page returns its text and links (PDF links listed first).",
                                 {"url": S}, ["url"])),
    "make_form": (make_form, _fn("make_form", "Make a form from a PDF: a file this task saved (file: f1, f2 …) or a file on Kundai's laptop (laptop_path). For a PDF without fillable fields, give the field labels as printed on it.",
                                 {"file": S, "title": S, "labels": {"type": "array", "items": S}, "laptop_path": S})),
    "add_source": (add_source, _fn("add_source", "Add a document the form's values may come from: a mail (with its attachments), a saved file, or a file on Kundai's laptop.",
                                   {"form_id": S, "mail_key": S, "file": S, "laptop_path": S}, ["form_id"])),
    "fill_form": (fill_form, _fn("fill_form", "Fill the form from its sources. Values are written only when quotes in the sources support them strongly enough; the rest waits for Kundai.",
                                 {"form_id": S}, ["form_id"])),
    "form_status": (form_status, _fn("form_status", "What a form has filled and what still needs Kundai.", {"form_id": S}, ["form_id"])),
    "known_facts": (known_facts, _fn("known_facts", "Facts about Kundai that he has confirmed before (name, address, numbers …).", {})),
    "search_laptop": (search_laptop, _fn("search_laptop", "Search file names and contents on Kundai's laptop (if it is on).", {"query": S}, ["query"])),
}
