"""
The primitive port, with no model and no network: routing and families (the Rust harness's
own cases), reply parsing, and the engine driven by a scripted proposer and a fake backend.
Run: python -m pytest backend/tests/test_primitive.py
"""

import asyncio
import json

import httpx
import pytest

from backend.primitive.engine import Engine
from backend.primitive.proposal import Context, Input, Proposal, parse_reply, read_verdict, ReplyError
from backend.primitive.providers import Providers
from backend.primitive.route import (CODE, GENERAL, REASONING, VERIFY, ChatError, Pool, RoutedProposer,
                                     classify, classify_text, family, size_b)
from backend.primitive.trie import ROOT, Address, normalise


def run(c):
    return asyncio.run(c)


def ctx(instruction, role=None, inputs=()):
    addr = ROOT.child(role) if role else ROOT
    return Context(addr, role, "t", [], instruction, list(inputs), [], addr.depth, 2)


# ---------------------------------------------------------------- routing (primitive's cases)

def test_classification_is_by_whole_word_cues():
    assert classify_text("Write a Python function to parse ISBNs") == CODE
    assert classify_text("Prove that the sum is bounded") == REASONING
    assert classify_text("What is the capital of France") == GENERAL       # 'capital' is not 'api'
    assert classify(ctx("anything", "e")) == VERIFY


@pytest.mark.parametrize("model,fam", [
    ("Qwen/Qwen2.5-72B-Instruct", "qwen"), ("qwen2.5-coder-32b-instruct", "qwen"), ("QwQ-32B", "qwen"),
    ("mistralai/Mixtral-8x22B-Instruct", "mistral"), ("meta-llama/Llama-3.3-70B-Instruct", "llama"),
    ("openai/gpt-oss-120b:cheapest", "openai"), ("deepseek-ai/DeepSeek-R1-Distill-Qwen-32B", "deepseek"),
    ("acme/frobnicator-7b", "acme"),
    # the desk's provider-prefixed ids
    ("hf/openai/gpt-oss-120b", "openai"), ("openai/gpt-5.5", "openai"), ("openai/o4-mini", "openai"),
    ("anthropic/claude-sonnet-5-5", "anthropic"), ("gemini/gemini-3.5-flash", "google"),
    ("gemini/gemma-4-31b-it", "gemma"), ("hf/acme/frob-7b", "acme"), ("ollama/qwen2.5:7b", "qwen"),
])
def test_families(model, fam):
    assert family(model) == fam


def test_sizes_are_read_from_names():
    assert size_b("Qwen2.5-72B-Instruct") == 72
    assert size_b("Qwen3-235B-A22B") == 235
    assert size_b("Mixtral-8x22B") == 176
    assert size_b("llama3.2") == 0
    assert size_b("gpt-oss-120b") == 120


def test_a_catalog_becomes_a_pool_by_specialty_size_and_family():
    p = Pool.from_catalog(["qwen2.5-coder-32b-instruct", "qwen2.5-72b-instruct", "llama-3.3-70b-instruct",
                           "deepseek-r1-distill-llama-70b", "mistral-small-24b-instruct", "bge-m3-embedding",
                           "whisper-large-v3"])
    assert p.code[0] == "qwen2.5-coder-32b-instruct"
    assert p.reasoning[0] == "deepseek-r1-distill-llama-70b"
    assert p.general == ["qwen2.5-72b-instruct", "llama-3.3-70b-instruct", "mistral-small-24b-instruct"]
    assert not any("bge" in m or "whisper" in m for m in p.verify)
    assert len({family(m) for m in p.verify[:4]}) == 4


class Fake:
    """A backend scripted per model id: a reply, or an error, by model."""
    def __init__(self, replies):
        self.replies = replies
        self.calls = []

    async def chat(self, model, system, user):
        self.calls.append(model)
        r = self.replies.get(model, ChatError("HTTP 503: no such fake"))
        if isinstance(r, Exception):
            raise r
        return r


ANSWER = '{"kind":"realise","answer":"ok"}'
HOLDS = '{"kind":"realise","holds":true,"reason":"fine"}'


def pool(general, verify=()):
    return Pool(list(general), list(general), list(general), list(verify))


def test_a_failing_model_falls_through_and_a_rejected_one_is_dropped():
    p = RoutedProposer(pool(["a/x", "b/y"]), Fake({"a/x": ChatError("HTTP 404: not found"), "b/y": ANSWER}))
    assert run(p.propose(ctx("say hi"))).kind == "realise"
    assert p.name() == "b/y" and p.candidates(GENERAL, set()) == ["b/y"]


def test_an_unparseable_reply_moves_on_without_dropping_the_model():
    p = RoutedProposer(pool(["a/x", "b/y"]), Fake({"a/x": "I think the answer is ok", "b/y": ANSWER}))
    run(p.propose(ctx("say hi")))
    assert len(p.candidates(GENERAL, set())) == 2 and p.usage["a/x"].failures == 1


def test_a_check_avoids_the_producers_family_and_goes_to_a_crowd():
    fake = Fake({"h/qwen-72b": HOLDS, "h/qwen-7b": HOLDS, "h/llama-70b": HOLDS, "h/gemma-27b": HOLDS})
    p = RoutedProposer(pool([], ["h/qwen-72b", "h/qwen-7b", "h/llama-70b", "h/gemma-27b"]), fake, crowd=2)
    produced = Input(ROOT.child("t"), "t", "do it", "result", ["h/qwen-72b"])
    prop = run(p.propose(ctx("check it", "e", [produced])))
    assert [c.by for c in prop.chunks] == ["h/llama-70b", "h/gemma-27b"]


def test_an_account_refusal_switches_off_that_provider_only():
    fake = Fake({"a/x": ChatError("HTTP 401: the provider refused the key"), "a/z": ANSWER, "b/y": ANSWER})
    p = RoutedProposer(pool(["a/x", "a/z", "b/y"]), fake)
    run(p.propose(ctx("say hi")))
    assert p.name() == "b/y" and "a/z" not in fake.calls and "a" in p.blocked


def test_every_provider_refused_reports_why():
    p = RoutedProposer(pool(["a/x"]), Fake({"a/x": ChatError("HTTP 402: no credit")}))
    with pytest.raises(ChatError) as e:
        run(p.propose(ctx("say hi")))
    assert "refused the account" in str(e.value) and "no credits" in str(e.value)


def test_the_local_model_is_used_only_when_the_pool_is_exhausted():
    p = RoutedProposer(pool(["a/x"]), Fake({"a/x": ANSWER, "ollama/q": ANSWER}), local="ollama/q")
    run(p.propose(ctx("say hi")))
    assert p.name() == "a/x"
    p = RoutedProposer(pool(["a/x"]), Fake({"a/x": ChatError("HTTP 503: overloaded"), "ollama/q": ANSWER}),
                       local="ollama/q")
    run(p.propose(ctx("say hi")))
    assert p.name() == "local:ollama/q"


# ---------------------------------------------------------------- replies

def test_parses_split_and_realise_amid_prose():
    assert parse_reply('Sure. {"kind":"split","know":"a","do":"b","check":"c"} done', "t").key() == \
        Proposal.split("a", "b", "c").key()
    assert parse_reply('{"kind":"realise","answer":"42 {braces}"}', None).chunks[0].body == "42 {braces}"


def test_a_check_must_carry_a_boolean_verdict():
    with pytest.raises(ReplyError):
        parse_reply('{"kind":"realise","answer":"looks fine"}', "e")
    p = parse_reply('{"kind":"realise","holds":false,"reason":"off by one"}', "e")
    assert read_verdict(p.chunks[0].body) == ("fails", "off by one")


def test_verdicts_and_thinking():
    assert read_verdict("FAILS: wrong unit") == ("fails", ": wrong unit")
    assert read_verdict("maybe") == ("unclear", "")
    r = '<think>maybe {"kind":"split"} no</think>{"kind":"realise","answer":"x"}'
    assert parse_reply(r, None).chunks[0].body == "x"
    assert Proposal.split("Read it.", "Do  it", "check it").key() == Proposal.split("read it", "do it", "Check it!").key()


# ---------------------------------------------------------------- engine

class Scripted:
    """Proposals keyed by instruction; unscripted ones realise ("done: …") or, for a check, hold."""
    def __init__(self, scripts=None, by="s/model"):
        self.scripts = {normalise(k): list(v) for k, v in (scripts or {}).items()}
        self.by = by

    async def propose(self, c):
        q = self.scripts.get(normalise(c.instruction))
        if q:
            p = q.pop(0) if len(q) > 1 else q[0]
            return Proposal(p.kind, p.know, p.do, p.check, [type(x)(x.body, x.dsl, x.by) for x in p.chunks])
        if c.role == "e":
            return Proposal.verdict(True, "scripted default")
        return Proposal.text(f"done: {c.instruction}")

    def name(self):
        return self.by


def test_a_realised_task_closes_unconfirmed():
    e = Engine("say hi", Scripted())
    rep = run(e.step(10))
    assert rep["completed"] and e.root.outcome.value == "done: say hi" and e.root.outcome.grade == "unconfirmed"


def test_a_split_takes_do_when_check_holds_in_order():
    e = Engine("task", Scripted({"task": [Proposal.split("learn", "make", "verify")]}))
    run(e.step(20))
    assert e.root.outcome.value == "done: make"
    order = [a["addr"] for a in e.record.acts if a["kind"] == "propose"]
    assert order == ["root", "k", "t", "e"]                     # know, then do, then check


def test_a_failed_check_forecloses_the_split_and_the_node_retries_then_declines():
    fail = Proposal.verdict(False, "wrong")
    e = Engine("task", Scripted({"task": [Proposal.split("a", "b", "c"), Proposal.split("a2", "b2", "c2"),
                                          Proposal.split("a3", "b3", "c3")],
                                 "c": [fail], "c2": [fail], "c3": [fail]}), max_attempts=3)
    run(e.step(100))
    o = e.root.outcome
    assert o.kind == "contested" and o.classes == ["done: b", "done: b2", "done: b3"]
    assert len(e.record.foreclosures()) == 3 and e.archived


def test_a_repeated_proposal_is_rejected_as_foreclosed():
    same = Proposal.split("a", "b", "c")
    e = Engine("task", Scripted({"task": [same, same], "c": [Proposal.verdict(False, "no")]}), max_attempts=2)
    run(e.step(100))
    assert any(a["kind"] == "reject" and "ruled out" in a["detail"]["why"] for a in e.record.acts)
    assert e.root.outcome.kind == "contested"


def test_splits_below_the_depth_limit_are_rejected():
    e = Engine("task", Scripted({"task": [Proposal.split("a", "b", "c")]}), max_depth=0, max_attempts=1)
    run(e.step(10))
    assert "depth limit" in e.root.outcome.reason


def test_a_crowd_check_of_two_other_families_corroborates():
    fake = Fake({"p/llama-70b": '{"kind":"split","know":"k1","do":"d1","check":"c1"}', "p/gemma-27b": HOLDS,
                 "p/qwen-72b": HOLDS})
    # every non-check node goes to llama; checks go to gemma and qwen (llama made the work)
    routed = RoutedProposer(Pool(["p/llama-70b"], ["p/llama-70b"], ["p/llama-70b"],
                                 ["p/llama-70b", "p/gemma-27b", "p/qwen-72b"]), fake, crowd=2)
    e = Engine("task", routed, max_depth=1)
    fake.replies["p/llama-70b"] = '{"kind":"split","know":"k1","do":"d1","check":"c1"}'

    async def go():
        await e.step(1)                                     # root splits
        fake.replies["p/llama-70b"] = ANSWER                # children realise
        return await e.step(20)
    run(go())
    assert e.root.outcome.value == "ok" and e.root.outcome.grade == "corroborated"
    check = next(n for a, n in e.nodes.items() if a == Address(("e",)))
    assert set(check.by) == {"p/gemma-27b", "p/qwen-72b"}


# ---------------------------------------------------------------- providers (mocked HTTP)

def test_providers_route_by_prefix_and_hide_refused_key_text():
    seen = []

    def handler(req):
        seen.append(str(req.url))
        if "anthropic" in str(req.url):
            return httpx.Response(200, json={"content": [{"type": "text", "text": "A"}], "stop_reason": "end_turn"})
        if "openai.com" in str(req.url):
            return httpx.Response(401, json={"error": {"message": "Incorrect API key provided: sk-ab***yz"}})
        return httpx.Response(200, json={"choices": [{"message": {"content": "G"}}]})

    env = {"CLAUDE_API_KEY": "c", "OPENAI_API_KEY": "o", "GEMINI_API_KEY": "g"}
    pr = Providers(env, httpx.AsyncClient(transport=httpx.MockTransport(handler)), keeper_states={})
    assert run(pr.chat("anthropic/claude-x", "s", "u")) == "A"
    assert run(pr.chat("gemini/gemini-3.5-flash", "s", "u")) == "G"
    with pytest.raises(ChatError) as e:
        run(pr.chat("openai/gpt-5.5", "s", "u"))
    assert str(e.value).startswith("HTTP 401") and "sk-ab" not in str(e.value)
    assert any(u.endswith("/v1beta/openai/chat/completions") for u in seen)


def test_pool_leaves_out_providers_without_a_key_or_rejected_by_the_keeper():
    def handler(req):
        if req.url.path.endswith("/api/tags"):
            return httpx.Response(200, json={"models": [{"name": "qwen2.5:7b"}]})
        return httpx.Response(200, json={"data": [{"id": "claude-sonnet-5-5"}, {"id": "gemini-3.5-flash"},
                                                  {"id": "models/gemini-3.5-flash"}]})
    env = {"CLAUDE_API_KEY": "c", "GEMINI_API_KEY": "g", "OLLAMA_MODEL": "qwen2.5:7b"}
    pr = Providers(env, httpx.AsyncClient(transport=httpx.MockTransport(handler)),
                   keeper_states={"gemini": "dead"})
    pool, live, st, local = run(pr.pool())
    assert {m.split("/")[0] for m in pool.models()} == {"anthropic", "ollama"}
    assert st["gemini"]["why"] == "keeper: dead" and st["openai"]["why"] == "no key on the node"
    assert local == "ollama/qwen2.5:7b" and pool.verify[-1] == local          # the node's model checks too
    assert live == {"anthropic/claude-sonnet-5-5", "anthropic/gemini-3.5-flash", local}
    assert pool.general == ["anthropic/claude-sonnet-5-5"]


# ---------------------------------------------------------------- refusals as providers word them (2026-11-02)

@pytest.mark.parametrize("msg,kind", [
    ('HTTP 400: {"error":{"message":"Your credit balance is too low to access the Anthropic API."}}', "account"),
    ('HTTP 429: {"error":{"type":"insufficient_quota","code":"credit_balance_exhausted"}}', "account"),
    ('HTTP 402: {"error":"You have no remaining credits."}', "account"),
    ("HTTP 429: You exceeded your current quota, please check your plan and billing details.", "model"),
    ("HTTP 429: rate limited, slow down", None),
    ("HTTP 404: no such model", "model"),
    ("HTTP 503: overloaded", None),
])
def test_refusals(msg, kind):
    from backend.primitive.route import refusal
    assert refusal(msg) == kind


def test_an_empty_balance_switches_the_provider_off_and_is_remembered():
    fake = Fake({"anthropic/a": ChatError('HTTP 400: credit balance is too low'), "anthropic/b": ANSWER,
                 "gemini/g": ANSWER})
    p = RoutedProposer(pool(["anthropic/a", "anthropic/b", "gemini/g"]), fake)
    run(p.propose(ctx("say hi")))
    assert p.name() == "gemini/g" and "anthropic/b" not in fake.calls
    assert p.blocked["anthropic"] == "the account has no credits left"
    pr = Providers({"CLAUDE_API_KEY": "c"}, keeper_states={})
    pr.remember_refusals(p.blocked)
    from backend.primitive.providers import PROVIDERS
    assert pr.available(PROVIDERS["anthropic"]) == (False, "the account has no credits left")


def test_a_task_runs_in_the_service_and_saves_its_record(tmp_path):
    from backend.primitive.service import TaskService

    class FakeProviders(Fake):
        def refused(self):
            return {}

        def remember_refusals(self, b):
            self.remembered = dict(b)

        async def pool(self, override=None):
            return pool(["x/m-70b"], ["y/v-27b"]), None, {}, None

    fp = FakeProviders({"x/m-70b": ANSWER, "y/v-27b": HOLDS})

    async def go():
        svc = TaskService(fp, root=tmp_path)
        t = svc.start("say hi", depth=0)
        while svc.get(t["id"])["status"] == "running":
            await asyncio.sleep(0.01)
        return svc.get(t["id"])
    t = run(go())
    assert t["status"] == "answered" and t["trie"]["outcome"]["value"] == "ok"
    lines = (tmp_path / "tasks" / t["id"] / "record.jsonl").read_text().splitlines()
    assert [json.loads(l)["kind"] for l in lines][:2] == ["raise", "propose"]
    assert json.loads((tmp_path / "tasks" / t["id"] / "task.json").read_text())["status"] == "answered"


def test_agents_that_answer_are_told_how_to_draw_a_view_and_checks_are_not():
    from backend.primitive.proposal import render
    assert "```spectacular" in render(ctx("tabulate it")) and "```spectacular" not in render(ctx("check it", "e"))
