"""
Shaping a Harare search-everywhere report into the three source cards. The report below
has the structure of a real run (server-2, 2026-09-30) with invented content.
Run: python -m pytest backend/tests/test_find.py
"""

from backend import find


def v(tau, kind, data, by="m"):
    return {"seq": 0, "tau": tau, "kind": kind, "data": data, "by": {"module": by}}


def ask(results, verdict, reason="r"):
    return {"exit_code": 0, "output": {"coverage": {"verdict": verdict, "reason": reason, "weight_share": 0.5},
                                        "identity_fingerprint": "b3:x", "results": results}}


REPORT = {
    "run": "run-1", "label": "find: Zahnarzt Greifswald", "quiescent": True, "tasks": {"total": 5},
    "nodes": [
        {"tau": "find/zahnarzt-greifswald/mail", "values": [], "chunks": []},
        {"tau": "find/zahnarzt-greifswald/mail/passages", "values": [v("", "passages", ask(
            [{"path": "uni/2026-09/abc.md", "scene": "uni", "evidence_start_line": 10, "evidence_end_line": 12,
              "snippet": "Greifswald", "matched_terms": ["greifswald"], "score": 1.2}], "declined"))]},
        {"tau": "find/zahnarzt-greifswald/laptop", "values": [v("", "error", {
            "exit_code": 1, "module": "laptop", "problem": "the module exited abnormally",
            "stderr": "Error: laptop unreachable (TimeoutError) — is it on?\n    at file:///x.js:1:1\n"}, by="harare")]},
        {"tau": "find/zahnarzt-greifswald/web", "values": [
            v("", "results", {"query": "q", "results": [
                {"n": 1, "url": "https://arzt.example/a", "title": "Praxis A", "snippet": "s", "file": "arzt.example/01-aa.md"},
                {"n": 2, "url": "https://b.example/", "title": "B", "snippet": "s", "note": "HTTP 403"}]}),
            v("", "query", {"query": "q", "repo": "/x", "source": "web"})]},
        {"tau": "find/zahnarzt-greifswald/web/passages", "values": [v("", "passages", ask(
            [{"path": "arzt.example/01-aa.md", "scene": "arzt.example", "evidence_start_line": 1, "evidence_end_line": 5,
              "snippet": "Zahnarzt in Greifswald", "matched_terms": ["zahnarzt", "greifswald"], "score": 3.1}], "covered"))]},
    ],
}


def test_each_source_gets_its_verdict_passages_and_opener():
    s = find.shape(REPORT, subject=lambda key: {"uni:abc": "SiLA meeting"}.get(key))
    assert s["query"] == "Zahnarzt Greifswald" and s["quiescent"]
    mail, laptop, web = s["sources"]["mail"], s["sources"]["laptop"], s["sources"]["web"]
    assert (mail["state"], mail["verdict"]) == ("done", "declined")
    assert mail["passages"][0]["open"] == {"kind": "mail", "ref": "uni:abc"}
    assert mail["passages"][0]["title"] == "SiLA meeting" and mail["passages"][0]["lines"] == [10, 12]
    assert (web["state"], web["verdict"]) == ("done", "covered")
    assert web["passages"][0]["open"] == {"kind": "web", "ref": "https://arzt.example/a"}
    assert web["passages"][0]["title"] == "Praxis A" and web["passages"][0]["matched"] == ["zahnarzt", "greifswald"]
    assert [r.get("note") for r in web["results"]] == [None, "HTTP 403"]
    # an error value is the branch's state, with the message, not the stack
    assert laptop["state"] == "error" and laptop["error"].startswith("laptop unreachable (TimeoutError)")


def test_pending_then_empty_and_skipped():
    running = {**REPORT, "quiescent": False,
               "nodes": [{"tau": "find/q/mail", "values": []}, {"tau": "find/q/laptop", "values": []},
                         {"tau": "find/q/web", "values": [v("", "results", {"query": "q", "results": []})]}]}
    s = find.shape(running)
    assert {k: x["state"] for k, x in s["sources"].items()} == {"laptop": "pending", "mail": "pending", "web": "pending"}
    done = {**running, "quiescent": True}
    done["nodes"][1]["values"] = [v("", "skipped", {"query": "q", "reason": "credential-shaped"})]
    s = find.shape(done)
    assert s["sources"]["web"]["state"] == "empty" and s["sources"]["laptop"]["state"] == "skipped"
    assert s["sources"]["web"]["reason"] == "the web search returned no results"
    done["nodes"][2]["values"] = [v("", "results", {"query": "q", "results": [], "refused": ["brave: too many requests"]})]
    assert find.shape(done)["sources"]["web"]["reason"].endswith("(engines that did not answer: brave: too many requests)")


def test_matched_terms_outside_the_evidence_lines_are_told_apart():
    rep = {**REPORT, "nodes": [{"tau": "find/q/mail/passages", "values": [v("", "passages", ask(
        [{"path": "uni/x.md", "snippet": "Greifswald, Mietvertrag…", "matched_terms": ["mietvertrag", "ryck"]}],
        "partial"))]}]}
    p = find.shape(rep)["sources"]["mail"]["passages"][0]
    assert p["matched"] == ["mietvertrag", "ryck"] and p["in_evidence"] == ["mietvertrag"]


def test_the_passage_carrying_most_of_the_query_leads():
    rep = {**REPORT, "nodes": [{"tau": "find/q/web/passages", "values": [v("", "passages", ask(
        [{"path": "a/1.md", "snippet": "am", "matched_terms": ["am"], "score": 9.0},
         {"path": "b/2.md", "snippet": "Am Ryck, Mietvertrag", "matched_terms": ["am", "ryck", "mietvertrag"], "score": 2.0}],
        "covered"))]}]}
    assert [p["path"] for p in find.shape(rep)["sources"]["web"]["passages"]] == ["b/2.md", "a/1.md"]


def test_chunks_and_slug():
    cs = find.chunks("Am Ryck — Mietvertrag!", "/m")
    assert [c["tau"] for c in cs] == ["find/am-ryck-mietvertrag/mail", "find/am-ryck-mietvertrag/laptop",
                                      "find/am-ryck-mietvertrag/web"]
    assert cs[0]["body"] == {"query": "Am Ryck — Mietvertrag!", "repo": "/m"}
    assert find.slug("!!!") == "query"


def test_bare_find_searches_everywhere_but_narrower_commands_do_not():
    from backend.agents.runner import searches_everywhere
    assert searches_everywhere("find the Am Ryck contract")
    assert searches_everywhere("search for Zahnarzt Greifswald")
    assert searches_everywhere("look up Proclamation 10998")
    assert not searches_everywhere("where is my passport scan?")                     # a file lookup
    assert not searches_everywhere("find the cover letter for bonn on my laptop")    # scoped to the laptop
    assert not searches_everywhere("find emails from Mark")                          # the planner filters by sender
    assert not searches_everywhere("summarise my Arbeitsvertrag")


def test_find_query_drops_the_verb_and_the_scope_words():
    from backend.routes.intent import find_query
    assert find_query("search everywhere for SiLA robotics meeting") == "SiLA robotics meeting"
    assert find_query("search the web for helm charts") == "helm charts"
    assert find_query("find me a kite shop online") == "a kite shop"


def test_a_find_command_starts_a_harare_run_without_the_planner(monkeypatch):
    import asyncio
    from backend.agents import llm, runner
    from backend.routes import intent

    async def start(text):
        return {"kind": "find", "run": "run-9", "query": intent.find_query(text), "answer": ""}

    async def no_planner(*a, **k):
        raise AssertionError("a search must not ask the planner")
    monkeypatch.setattr(intent, "find_start", start)
    monkeypatch.setattr(llm, "local_json", no_planner)
    run = runner.Run("search for Zahnarzt Greifswald")
    asyncio.run(runner.execute(run, lambda: None))
    assert run.status == "done" and run.brain == "rule" and run.find == "run-9"
    assert run.to_json()["find"] == "run-9" and "Zahnarzt Greifswald" in run.answer
