"""
The task agent's loop: the model reads the task, calls tools, reads their results, and
stops when it answers without calling one. Every call, its arguments and a short form of
its result are kept as steps; what the tools found grows the run's graph.

The model is the first of AGENT_MODELS whose provider is usable, or the one the task names.
A refused account (no credit) moves the run to the next model and is remembered by the
providers for an hour, as everywhere else in the desk.
"""

from __future__ import annotations

import json
from typing import Awaitable, Callable, List, Optional

from backend.primitive.providers import PROVIDERS
from backend.primitive.route import ChatError, provider_of, refusal
from backend.tasks.tools import TOOLS, Run, clip

AGENT_MODELS = ["openai/gpt-5.5", "deepseek/deepseek-v4-pro", "gemini/gemini-3.5-flash"]
MAX_STEPS = 40            # model turns per run; a turn may call several tools
KEEP_FULL = 6             # the latest tool results stay whole; older ones shrink to KEEP_CHARS
KEEP_CHARS = 600          # (every turn resends the conversation, so this is what a long run costs)

SYSTEM = """\
You are Agent Smith, Kundai's assistant on his own server. You do the task he gives you by
calling tools; you see his mail, the web pages and files the tools return, and forms.

How you work:
- Find before you act. Read the mails that matter; follow the links in them; download the
  documents they point to.
- To fill in a form: make_form from the PDF, then add_source for every mail or file that may
  hold his details (search the mail for the words such details appear with: Steuer-ID,
  Identifikationsnummer, Krankenkasse, Versicherung, IBAN, Sozialversicherung, Geburtsdatum,
  Anschrift …; known_facts lists what he confirmed before), then fill_form.
- You never write a value into a form yourself and never guess one. fill_form proposes values
  with quotes from the sources; a value is written only when the evidence is strong enough or
  Kundai confirms it on the form's page.
- If a page needs a login, a document cannot be found, or something needs his decision, say so
  plainly — do not work around it. Follow links you were shown; do not guess web addresses.
- Files on his laptop can be used directly: make_form and add_source take a laptop_path. A form
  he filled in before (e.g. a scanned or saved earlier version) is a good source for a new one.
- Where his details are. His documents for the university job are in
  C:\\Users\\kunda\\Documents\\portfolio\\kwisatz-haderach\\employment\\greifswald
  (STATUS.md describes the hiring; Unterlagen_KundaiSachikonye holds payslips, insurance
  certificates, ID, contracts — list it with list_laptop_folder). Payslips (Gehaltsabrechnung,
  Payslip) carry the tax ID, social insurance number, health insurer and bank account;
  insurance certificates carry the insurer and insurance number. Add every document that may
  hold a field's value as a source — scans too; add_source reads them.
- Mail: search_mail sees the node's copy (since mid-September 2026); search_mailbox searches the
  whole uni and Bitspark mailboxes on their servers, every date. Use it for older details.
- Search one word at a time: a search with many words finds only what holds all of them. Be economical:
  when the documents do not hold a detail, do not hunt for it word by word (banks, insurers …) — fill what
  the documents give, and list the rest for Kundai.
- When the forms are filled as far as the evidence goes, prepare the answer: draft_reply to the
  mail that asked for them, with the filled forms attached, in German if the mail was German.
  It is a draft — Kundai checks, signs and sends it. Never claim anything was sent.
- The mails are mostly German. Answer in English.

End with a short report: what you found (with the mails' subjects and dates), each form you
made with its page link (/desk/forms?id=…), what was filled, the draft you prepared, and what
still needs Kundai (fields no document holds, signatures)."""


def _summary(result) -> str:
    s = result if isinstance(result, str) else json.dumps(result, ensure_ascii=False)
    return clip(s, 300)


def compact(messages: List[dict]) -> None:
    """Shrink all but the latest KEEP_FULL tool results, in place."""
    tool_idx = [i for i, m in enumerate(messages) if m["role"] == "tool"]
    for i in tool_idx[:-KEEP_FULL]:
        c = messages[i]["content"]
        if len(c) > KEEP_CHARS + 60:
            messages[i]["content"] = c[:KEEP_CHARS] + " … [shortened; call the tool again for the full result]"


async def run_agent(task: dict, run: Run, providers, on_step: Callable[[], Awaitable[None]],
                    max_steps: int = MAX_STEPS, messages: Optional[List[dict]] = None) -> List[dict]:
    """Run until the model answers or max_steps turns pass. `messages` continues an earlier
    conversation (with the new instruction already appended). Returns the conversation."""
    graph = task.setdefault("graph", {"nodes": [], "links": []})
    seen = {n["id"] for n in graph["nodes"]}

    def add(items: List[dict], parent: str) -> None:
        for it in items:
            if "node" in it:
                n = it["node"]
                if n["id"] in seen:
                    for old in graph["nodes"]:
                        if old["id"] == n["id"]:
                            old.update(n)
                else:
                    seen.add(n["id"])
                    graph["nodes"].append(n)
                    graph["links"].append({"source": parent, "target": n["id"], "kind": "produces"})
            elif "link" in it and it["link"]["source"] in seen and it["link"]["target"] in seen:
                graph["links"].append(it["link"])

    if "task" not in seen:
        seen.add("task")
        graph["nodes"].append({"id": "task", "kind": "command", "label": task["text"][:60]})

    refused = providers.refused()
    models = [task["model"]] if task.get("model") else [
        m for m in AGENT_MODELS if providers.available(PROVIDERS[provider_of(m)])[0] and provider_of(m) not in refused]
    if not models:
        raise RuntimeError("no model that can call tools is usable (OpenAI, DeepSeek or Gemini): check /desk/keys")
    tools = [spec for _, spec in TOOLS.values()]
    if messages is None:
        messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": task["text"]}]
    steps = task.setdefault("steps", [])

    for _ in range(max_steps):
        compact(messages)
        msg, errors = None, []
        for m in list(models):
            try:
                msg = await providers.chat_tools(m, messages, tools)
                task["ran_on"] = m
                models = [m] + [x for x in models if x != m]       # stay with the one that answers
                break
            except ChatError as e:
                errors.append(f"{m}: {clip(str(e), 200)}")
                if refusal(str(e)) == "account":
                    providers.remember_refusals({provider_of(m): "the account refused the call (no credit?)"})
                if refusal(str(e)) is not None:
                    models.remove(m)
        if msg is None:
            raise RuntimeError("no model answered: " + "; ".join(errors))
        calls = msg.get("tool_calls") or []
        messages.append({"role": "assistant", "content": msg.get("content") or "", **({"tool_calls": calls} if calls else {})})
        if not calls:
            task["answer"] = msg.get("content") or ""
            add([{"node": {"id": "answer", "kind": "result", "label": "report"}}], "task")
            await on_step()
            return messages
        for c in calls:
            fn_name = c.get("function", {}).get("name", "")
            try:
                args = json.loads(c["function"].get("arguments") or "{}")
            except ValueError:
                args = {}
            entry = TOOLS.get(fn_name)
            cid = f"call:{len(steps) + 1}"
            if entry is None:
                result, g = f"there is no tool {fn_name}", []
            else:
                try:
                    result, g = await entry[0](run, **args)
                except TypeError as e:
                    result, g = f"wrong arguments for {fn_name}: {e}", []
                except Exception as e:                       # a tool's failure is a result, not a crash
                    result, g = f"{fn_name} failed: {type(e).__name__}: {clip(str(e), 200)}", []
            steps.append({"n": len(steps) + 1, "tool": fn_name, "args": args, "result": _summary(result)})
            add([{"node": {"id": cid, "kind": "agent", "label": fn_name.replace("_", " ")}}], "task")
            add(g, cid)
            messages.append({"role": "tool", "tool_call_id": c.get("id", cid),
                             "content": result if isinstance(result, str) else json.dumps(result, ensure_ascii=False)[:12000]})
            await on_step()
    task["answer"] = (f"I stopped after {max_steps} turns without finishing. What I did is listed below; "
                      "press Continue (optionally with a hint), and I go on from here with everything found so far.")
    task["stopped"] = True
    return messages
