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

async def search_mail(run: Run, sender: str = "", words="", since_days: int = 0, limit: int = 15) -> Result:
    from backend.mail.service import MAIL
    if isinstance(words, (list, tuple)):          # models sometimes send ["a", "b"] for "a b"
        words = " ".join(map(str, words))
    since = (datetime.now(timezone.utc) - timedelta(days=since_days)).isoformat() if since_days else ""
    rows = MAIL.store.find(sender=sender, words=words, since=since, limit=limit)
    g = []
    for r in rows:
        g += [node(f"mail:{r['key']}", "mail", r["subject"] or "(no subject)", ref=r["key"])]
    return ([{"key": r["key"], "date": r["date"][:16], "from": f"{r['from_name'] or ''} <{r['from_addr']}>",
              "subject": r["subject"], "preview": " ".join((r["preview"] or "").split())[:200]} for r in rows]
            or "no mail matches (the node holds mail since mid-September 2026 only)"), g


async def search_mailbox(run: Run, words="", sender: str = "", account: str = "", limit: int = 10) -> Result:
    """Every date, on the mail server itself (the node keeps only recent mail). What it finds
    is stored like polled mail, so read_mail and add_source take its keys."""
    import asyncio
    from backend.mail import accounts, imap
    from backend.mail.service import MAIL
    if isinstance(words, (list, tuple)):
        words = " ".join(map(str, words))
    ascii_words = [w for w in str(words).split() if w.isascii()]
    skipped = [w for w in str(words).split() if not w.isascii()]
    accts = [a for a in accounts.discover(MAIL.env) if a.kind == "imap" and (not account or a.id == account)]
    if not accts:
        return f"no IMAP mailbox {account!r} on the node (connected: uni, webmail = Bitspark)", []
    own = accounts.owner_addresses(accounts.discover(MAIL.env))
    rows, notes = [], []
    for a in accts:
        try:
            msgs = await asyncio.to_thread(imap.search_all, a, ascii_words, sender, min(int(limit), 25), own)
        except imap.ImapError as e:
            notes.append(f"{a.id}: {e}")
            continue
        MAIL.store.add(msgs)
        rows += [{"key": m.key, "mailbox": a.id, "date": m.date.isoformat()[:16], "from": f"{m.from_name} <{m.from_addr}>",
                  "subject": m.subject, "preview": " ".join((m.text or "").split())[:200]} for m in msgs]
    rows.sort(key=lambda r: r["date"], reverse=True)
    out = {"found": rows[:int(limit)] or "nothing matches in these mailboxes"}
    if skipped:
        out["note"] = f"words with umlauts are not searched on the server: {', '.join(skipped)} — use a plain spelling"
    if notes:
        out["errors"] = notes
    return out, [node(f"mail:{r['key']}", "mail", r["subject"] or "(no subject)", ref=r["key"]) for r in rows[:int(limit)]]


async def list_laptop_folder(run: Run, path: str) -> Result:
    from backend import laptop
    try:
        d = await laptop.listing(path)
    except Exception as e:
        return f"the laptop did not answer ({type(e).__name__})", []
    items = d.get("entries") or d.get("items") or d.get("files") or d
    return clip(json_compact(items), 6000), []


async def read_laptop_file(run: Run, path: str) -> Result:
    """The text of a document on the laptop. A scan has none: add_source reads scans."""
    from backend import laptop
    try:
        d = await laptop.read(path)
    except Exception as e:
        return f"could not read {path} ({type(e).__name__})", []
    text = d.get("text") or d.get("content") or ""
    if not str(text).strip():
        return {"path": path, "text": "", "note": "no text in it — probably a scan; add_source with this laptop_path reads it with a vision model"}, []
    return {"path": path, "text": clip(text, 6000)}, [node(f"laptop:{path}", "laptop", path.rsplit(chr(92), 1)[-1])]


def json_compact(x) -> str:
    import json
    return json.dumps(x, ensure_ascii=False)


async def draft_reply(run: Run, mail_key: str, body: str, form_ids: List[str] = (), files: List[str] = ()) -> Result:
    """A reply to a mail, with the filled forms (and saved files) attached, put in the Drafts
    folder of the mailbox the mail came to. Never sent: Kundai checks, signs and sends."""
    import asyncio
    from backend.forms.service import service as forms
    from backend.mail import accounts, drafts
    from backend.mail.service import MAIL
    m = MAIL.store.get_message(mail_key)
    if m is None:
        return f"no mail {mail_key}", []
    acct = drafts.pick_account(accounts.discover(MAIL.env), m.account)
    if acct is None:
        return "no IMAP mailbox to put a draft in", []
    atts, names = [], []
    for fid in form_ids or []:
        try:
            data, fname, ctype = forms().filled(fid)
        except KeyError:
            return f"no form {fid}", []
        atts.append((fname, ctype.split(";")[0], data))
        names.append(fname)
    for f in files or []:
        info = run.files.get(f)
        if info:
            atts.append((info["name"], "application/pdf" if info["name"].lower().endswith(".pdf") else "application/octet-stream",
                         Path(info["path"]).read_bytes()))
            names.append(info["name"])
    subject = m.subject if (m.subject or "").lower().startswith("re:") else f"Re: {m.subject}"
    try:
        msg = drafts.build(acct, [m.from_addr], subject, body, atts, in_reply_to=m.message_id)
        folder = await asyncio.to_thread(drafts.append, acct, msg)
    except Exception as e:
        return f"could not put the draft in the mailbox: {type(e).__name__}: {clip(str(e), 200)}", []
    run.task.setdefault("drafts", []).append({"to": m.from_addr, "subject": subject, "mailbox": acct.id,
                                              "folder": folder, "attachments": names})
    return {"draft": f"in {acct.id}/{folder}", "to": m.from_addr, "subject": subject, "attachments": names,
            "note": "not sent — Kundai checks, signs where needed and sends it"}, \
        [node(f"draft:{len(run.task['drafts'])}", "note", f"draft to {m.from_addr}"), link(f"mail:{mail_key}", f"draft:{len(run.task['drafts'])}")]


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
            await svc.add_document(form_id, info["name"], Path(info["path"]).read_bytes(), "", allow_ocr=run.cloud)
            src = f"file:{file}"
        elif laptop_path:
            await svc.add_laptop_source(form_id, laptop_path, allow_ocr=run.cloud)
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


def step_line(s: dict) -> str:
    r"""One drogba step as a short line: `move C:\a.pdf → C:\pdf\a.pdf`."""
    op = (s.get("op") or "?").replace("_", " ")
    where = " → ".join(x for x in (s.get("from"), s.get("to")) if x) or s.get("path") or ""
    tail = " (permanently)" if s.get("permanent") else " (to the Recycle Bin)" if s.get("op") == "delete" else ""
    return f"{op} {where}{tail}".strip()


def plan_record(pid: str, plan: str, pv: dict) -> dict:
    """What a task keeps of a previewed plan (the console draws it; a run uses plan + digest)."""
    steps = pv.get("steps") or []
    probs = pv.get("problems") or []
    return {"id": pid, "name": pv.get("task") or "", "plan": plan, "digest": pv.get("digest") or "",
            "summary": pv.get("summary") or {}, "steps": [step_line(x) for x in steps[:500]], "step_count": len(steps),
            "problems": [f"line {x.get('line')}: {x.get('message')}" for x in probs if x.get("severity") == "error"][:30],
            "warnings": [f"line {x.get('line')}: {x.get('message')}" for x in probs if x.get("severity") != "error"][:30],
            "runs_allowed": bool(pv.get("runs_allowed")),
            "status": "previewed" if pv.get("runnable") else "has problems",
            "previewed": datetime.now().astimezone().isoformat(timespec="seconds"), "error": "", "report": None}


async def plan_file_work(run: Run, plan: str) -> Result:
    from backend import laptop
    try:
        pv = await laptop.plan_preview(plan)
    except laptop.LaptopOffline as e:
        return str(e), []
    except laptop.LaptopRefused as e:
        return f"the laptop refused the plan: {e}", []
    plans = run.task.setdefault("plans", [])
    rec = plan_record(f"p{len(plans) + 1}", plan, pv)
    if rec["status"] != "previewed":
        return {"runnable": False, "problems": rec["problems"], "note": "nothing kept; fix these lines and call plan_file_work again"}, []
    plans.append(rec)
    note = ("Previewed only: nothing on the laptop changed. Kundai reads these steps on the task page and runs the "
            "plan himself; you cannot run it and must not say files were moved.")
    if not rec["runs_allowed"]:
        note += ' Running plans is switched off on the laptop ("plans": true in laptop-node.json turns it on).'
    return {"plan_id": rec["id"], "step_count": rec["step_count"], "steps": rec["steps"][:40],
            "summary": rec["summary"], "warnings": rec["warnings"], "note": note}, \
        [node(f"plan:{rec['id']}", "result", f"file plan · {rec['step_count']} steps")]


async def money_position(run: Run) -> Result:
    """tools/finance's overview: owed to him, invested, owed by him, net, and the alerts
    (claims about to run out, assumed rates). Reads only."""
    from tools.finance import plan
    from tools.finance.store import Store
    o = plan.overview(Store().position())
    if not (o.get("receivables") or o.get("debts") or o.get("investments") or (o.get("monthly") or {}).get("net_income")):
        return "no figures entered yet: the Money page (/desk/finance) or `python -m tools.finance` records them", []
    return o, [node("money", "result", f"money · net {o.get('net')} {o.get('currency', '')}".strip())]


async def afford(run: Run, price: str) -> Result:
    from tools.finance import plan
    from tools.finance.store import Store
    try:
        return plan.afford(Store().position(), price), []
    except ValueError as e:
        return f"could not work it out: {e}", []


async def parcels(run: Run) -> Result:
    from tools.finance import deliveries
    from tools.finance.store import Store
    found = deliveries.listing(Store().deliveries())
    return found or "no parcels recorded (the Money page's Scan mail reads them from the mail)", []


async def work_desk(run: Run, project: str = "") -> Result:
    """The work desk (backend/work): every project in short, or one project in full."""
    from backend.work.service import WORK
    snap = WORK.snapshot()
    if not snap.get("as_of"):
        return "the work desk has not been read yet (the node reads it every 30 minutes)", []
    head = {"read_from": snap.get("source"), "as_of": snap.get("as_of"), "stale": snap.get("stale"),
            "notes": snap.get("notes")}
    projects = snap.get("projects") or []
    if project:
        p = next((x for x in projects if x["name"].lower() == project.lower()), None)
        if p is None:
            return f"no project {project} on the desk; it has {', '.join(x['name'] for x in projects)}", []
        return {**head, **p}, [node(f"work:{p['name']}", "repo", p["name"])]
    brief = snap.get("brief") or {}
    short = [{"name": p["name"], "about": p.get("about"), "open_items": len(p.get("open") or []),
              "latest_write_up": (p.get("log") or [{}])[0].get("title"),
              "newest_commit": (p.get("commits") or [{}])[0] if p.get("commits") else None,
              "commits_not_written_up": p.get("unwritten")} for p in projects]
    return {**head, "projects": short,
            "brief": {k: brief.get(k) for k in ("date", "title", "file", "needs_you")} if brief else None,
            "threads_waiting_for_kundai": snap.get("needs_you"),
            "plan": snap.get("plan"), "decisions": snap.get("decisions"), "inbox": snap.get("inbox"),
            "documents": snap.get("documents"), "desk_log": (snap.get("desk_log") or [])[:5]}, \
        [node("work", "result", f"work desk · {len(projects)} projects")]


async def read_work_document(run: Run, doc: str) -> Result:
    from backend import laptop
    from backend.work.service import WORK
    try:
        text = await WORK.file(doc)
    except ValueError as e:
        return str(e), []
    except laptop.LaptopOffline as e:
        return str(e), []
    return (clip(text, 20000) if text is not None else f"no desk document {doc}"), []


async def estimate_effort(run: Run, algorithm: str, input: str = "", budget: float = None, unit: str = "") -> Result:
    """An interval from the decisions tool (backend/estimate.py); never a number of our own."""
    import asyncio
    import json
    from backend import estimate
    try:
        body = json.loads(input) if input.strip() else {}
    except ValueError as e:
        return f"input is not JSON: {e}", []
    if not isinstance(body, dict):
        return "input must be a JSON object", []
    try:
        out = await asyncio.to_thread(estimate.ask, algorithm, body, budget, unit or None)
    except estimate.EstimateError as e:
        return f"no estimate ({e.code}): {e.message}", []
    detail = out.get("detail") or {}
    res = {k: out.get(k) for k in ("algorithm", "unit", "estimate", "sentence", "fit")}
    res.update({k: detail[k] for k in ("median", "expected", "needs", "replaced") if detail.get(k) is not None})
    est = out.get("estimate")
    label = f"{est['low']:g}–{est['high']:g} {out.get('unit') or ''}".strip() if est and est.get("high") is not None else "no estimate"
    return res, [node(f"estimate:{len(run.task.get('steps') or []) + 1}", "result", label)]


# --------------------------------------------------------------------------- registry

def _fn(name, desc, props, required=()):
    return {"type": "function", "function": {"name": name, "description": desc, "parameters": {
        "type": "object", "properties": props, "required": list(required), "additionalProperties": False}}}


S = {"type": "string"}
PLAN_HELP = r"""Plan file work on Kundai's laptop (sort, move, copy, rename, archive, delete) as a drogba plan. It is PREVIEWED against the disk and changes nothing; Kundai reads the steps and runs it himself. Returns every step, or the problems to fix.
Language, one command per line, every path a full Windows path in straight double quotes (raw: backslashes as written):
  task "name"                                   (optional first line)
  let docs = "C:\Users\kunda\Downloads"          names a value; docs / "pdf" joins a path part
  make folder PATH
  move SUBJECT to FOLDER        copy SUBJECT to FOLDER        rename PATH to "new name"        delete SUBJECT
  archive SUBJECT as zip to FOLDER
  protect PATH                                   nothing in the plan may change it (top level only)
  for each f in SELECTION ... end               if exists PATH ... else ... end     (not, nested if; no else if)
SUBJECT is a path or a SELECTION: files|folders|items in FOLDER [matching "*.pdf"] [recursively]
  (pattern relative to FOLDER: * stays in a folder, ** crosses folders, {pdf,docx} alternatives).
In a path: name of p, stem of p, extension of p, folder of p, "a" + "b". Never overwrites: a step whose target exists is a problem. Deletes go to the Recycle Bin. Only the folders the laptop serves can change, never a credential."""
ESTIMATE_HELP = """Estimate how long something takes, or how much of a resource it needs, as an interval {low, high} whose ends say what they rest on (bound, observed, forecast with a coverage, declared). Nothing is fetched: it computes from the input. Give algorithm and input (a JSON object as text):
  three-point       {"optimistic": 20, "likely": 30, "pessimistic": 70}                values stated by hand
  reference-class   {"past": [34, 51, 28, 45], "alpha": 0.2, "sides": "upper"}         from what similar tasks took; alpha is the chance it may miss
  travel-time       {"from": {"lat": 54.09, "lon": 13.39}, "to": {"lat": 52.52, "lon": 13.41}, "mode": "walk|cycle|car-urban|car-road|transit|rail"}   seconds; add "observed": seconds from a timetable when one is known
  count-times-cost  {"count": {"low": 6, "high": 62}, "cost": {"low": 2, "high": 5}}   steps left times the cost of a step
  series-parallel   {"combine": "series|parallel", "parts": [{"low": 600, "high": 900}, ...]}   several estimates together
unit names the unit (minutes, seconds, euros, tokens); budget, in that unit, adds whether the estimate fits. Report the interval and what it rests on. When the tool gives none, say what it needs (sentence, needs): never put a number of your own in its place."""
TOOLS: Dict[str, Tuple[Callable[..., Awaitable[Result]], dict]] = {
    "estimate": (estimate_effort, _fn("estimate", ESTIMATE_HELP, {"algorithm": S, "input": S, "budget": {"type": "number"}, "unit": S}, ["algorithm", "input"])),
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
    "search_laptop": (search_laptop, _fn("search_laptop", "Search file names and contents on Kundai's laptop (if it is on). One word or name per search works best.", {"query": S}, ["query"])),
    "search_mailbox": (search_mailbox, _fn("search_mailbox", "Search a whole mailbox on its mail server, every date (search_mail sees only mail since mid-September 2026). Mailboxes: uni (Greifswald), webmail (Bitspark). Plain ASCII words.",
                                           {"words": S, "sender": S, "account": S, "limit": {"type": "integer"}})),
    "list_laptop_folder": (list_laptop_folder, _fn("list_laptop_folder", "List the files in a folder on Kundai's laptop.", {"path": S}, ["path"])),
    "read_laptop_file": (read_laptop_file, _fn("read_laptop_file", "Read the text of a document on Kundai's laptop (to see whether it holds what a form needs).", {"path": S}, ["path"])),
    "plan_file_work": (plan_file_work, _fn("plan_file_work", PLAN_HELP, {"plan": S}, ["plan"])),
    "work_desk": (work_desk, _fn("work_desk", "Kundai's work at the University of Greifswald, from his work desk (currentValue, shared with Mark Dörr): the projects (scilang, artefacts, raw2dcat, decisions, coalition …), the newest brief, threads that wait for him, plan, decisions and his working documents. Give project for one project in full: what is witnessed, what is open, against the plan, newest commits.", {"project": S})),
    "read_work_document": (read_work_document, _fn("read_work_document", "Read one document of the work desk by its desk path, as work_desk lists them (e.g. sides/kundai/brief/2026-11-10.md, projects/scilang/status.md, plan/scheduling-algorithms.md).", {"doc": S}, ["doc"])),
    "money_position": (money_position, _fn("money_position", "Kundai's money as he recorded it: what he is owed (with due dates and claim deadlines), invests and owes, net, monthly picture, and alerts (a claim about to run out, an assumed interest rate). Reads only.", {})),
    "afford": (afford, _fn("afford", "What buying something for PRICE (euros, e.g. \"300\" or \"1.234,56\") now really costs: days later debt-free and the extra interest, from his debt plan. Reads only.", {"price": S}, ["price"])),
    "parcels": (parcels, _fn("parcels", "His parcels found in mail: carrier, tracking link, status, and the date to send it back by once delivered. Reads only.", {})),
    "draft_reply": (draft_reply, _fn("draft_reply", "Write the reply to a mail with the filled forms (form_ids) and saved files attached, as a DRAFT in the mailbox it came to. Never sent: Kundai checks, signs and sends.",
                                     {"mail_key": S, "body": S, "form_ids": {"type": "array", "items": S}, "files": {"type": "array", "items": S}}, ["mail_key", "body"])),
}
