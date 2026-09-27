"""
The depth dial against the manuscript's invariants, with a scripted generator (no model):
the trichotomy partitions the pairs, V + Ψ/N = 1, targets follow the path law, and a
value is carried only where a cue was witnessed in the text — never because the model
assigned it. Run: python -m pytest backend/tests/test_individuate.py
"""

import json

from backend.individuate import service as svc
from backend.individuate.engine import Observations, cue_tokens
from backend.individuate.generator import LifeGenerator

CORPUS = {"entities": {
    "a": {"title": "Pay rent for the flat", "context": ["Miete bis 10.10."], "abstract": "PayPal payment to the landlord"},
    "b": {"title": "Second rent instalment", "context": [], "abstract": "rent payment landlord 800 EUR"},
    "c": {"title": "Find a flat after December", "context": ["housing"], "abstract": "Wohnung search in Greifswald"},
    "d": {"title": "Push parser to the git repo", "context": [], "abstract": "HPLC converter code repository"},
    "e": {"title": "Update converter specification", "context": ["markdown export"], "abstract": "converter spec"},
    "f": {"title": "Join an athletics club", "context": ["sport"], "abstract": "running training club"},
    "g": {"title": "Run three times a week", "context": ["sport"], "abstract": "running"},
    "h": {"title": "Buy a chicken loop", "context": ["kite gear"], "abstract": "costs 40 EUR"},
}}
META = {k: {"kind": "plan", "title": v["title"], "due": None} for k, v in CORPUS["entities"].items()}

PROPOSALS = [
    {"prop": "area of life", "values": ["home", "work", "sport"],
     "cues": [[["rent"], ["flat"], ["wohnung"]], [["converter"], ["parser"]], [["running"], ["club"], ["kite"]]]},
    {"prop": "kind of action", "values": ["payment", "writing"],
     "cues": [[["payment"]], [["specification"], ["spec"]]]},
]


def test_graph_invariants():
    t = svc.graph(CORPUS, META, PROPOSALS, theta=0.8)
    p = t["pairs"]
    assert p["certified"] + p["open"] + p["indiscernible"] == p["total"] == 28     # trichotomy
    assert abs(t["V"] + (p["open"] + p["indiscernible"]) / p["total"] - 1) < 1e-12  # conservation
    nodes = t["nodes"]
    root = nodes[t["root"]]
    assert root["label"] == "Everything open" and root["split_by"] == "area of life"
    labels = {nodes[c]["label"] for c in root["children"]}
    assert labels == {"area of life: home", "area of life: work", "area of life: sport"}
    # path law: a feasible node gives its children (θ_B - a_B) / w_B
    for n in nodes.values():
        if n["children"] and n["regime"] == "feasible":
            for c in n["children"]:
                assert abs(nodes[c]["target"] - (n["target"] - n["a"]) / n["w"]) < 1e-3
    sport = next(n for n in nodes.values() if n["label"] == "area of life: sport")
    assert set(sport["members"]) == {"f", "g", "h"}          # "kite" is a witnessed cue for h


def test_inert_and_duplicate_distinctions_drop_out():
    dup = PROPOSALS + [dict(PROPOSALS[0], prop="same again")]
    t = svc.graph(CORPUS, META, dup, theta=0.8)
    assert [f["name"] for f in t["facets"]] == ["area of life", "kind of action"]


class Scripted(LifeGenerator):
    """Answers every propose with one grouping that CLAIMS items the text doesn't support."""
    def __init__(self):
        super().__init__(model="stub", url="http://127.0.0.1:9")
        self.replies = []

    def _ask(self, prompt, num_predict=700):
        self.calls += 1
        if '"assignment": {"P1"' in prompt and "groups" in prompt:
            n = prompt.count("\nP")
            asg = {f"P{i}": ("money" if i % 2 else "code") for i in range(1, n + 1)}   # half of these are wrong
            return json.dumps({"property": "domain", "groups": [
                {"name": "money", "keywords": ["rent", "payment", "eur"]},
                {"name": "code", "keywords": ["converter", "parser", "repository"]}], "assignment": asg})
        return json.dumps({"assignment": {}})


def test_grow_commits_only_witnessed_values(tmp_path, monkeypatch):
    s = svc.IndividuationService(tmp_path, env={})
    monkeypatch.setattr(svc, "LifeGenerator", lambda **kw: Scripted())
    run = s._grow_sync(CORPUS, theta=0.9)
    assert run["commits"] >= 1
    kept = json.loads((tmp_path / "proposals.json").read_text(encoding="utf-8"))
    assert kept and all(set(d) == {"prop", "values", "cues", "call", "origin"} for d in kept)   # no claims stored
    t = svc.graph(CORPUS, META, kept, theta=0.9)
    obs = Observations(CORPUS)
    obs.read_all()
    f = next(f for f in t["facets"] if f["name"] == "domain")
    # every carrier of "money" has a money cue in its text; nothing is carried by assignment alone
    money = [cue_tokens(c) for c in ["rent", "payment", "eur"]]
    carriers = sum(1 for x in range(obs.n)
                   if any(obs.hit(x, c) is not None for c in money))
    assert f["carriers"][0] == carriers
