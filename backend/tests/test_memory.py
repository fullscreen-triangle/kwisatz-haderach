"""
The working memory (backend/memory) against the paper's statements: statuses partition by
margin, ⊥ declines, classes, the anytime bound for two symmetric candidates, rules under
keep semantics, depth, only published graphs answer, the stage key, and the store.
Run: python -m pytest backend/tests/test_memory.py
"""

import math
import random

import pytest

from backend.memory import store
from backend.memory.observe import nats, statement
from backend.memory.structure import BOT, Observation, Rule, Structure, catalogue_threshold, node_id


def lik(**kw):
    return {(BOT if k == "BOT" else k): math.log(v) for k, v in kw.items()}


def test_statuses_follow_the_margin_against_the_best_alternative():
    s = Structure(theta=2.0)
    a = s.add_node("r", "a", ["x", "y"])
    s.add_node("r", "b", ["x", "y"])
    s.observe(Observation(a.id, lik(x=0.9, y=0.05, BOT=0.05), "d1", "document"))
    v = s.compute()
    assert v[a.id].status == "solved" and v[a.id].value == "x" and v[a.id].margin == pytest.approx(math.log(18))
    assert v[node_id("r", "b")].status == "assumed"
    s.observe(Observation(a.id, lik(x=0.05, y=0.9, BOT=0.05), "d2", "document"))
    v = s.compute()
    assert v[a.id].status == "undecided" and v[a.id].margin == pytest.approx(0)   # statuses are not monotone


def test_bot_leading_declines_and_publishes_nothing():
    s = Structure(theta=2.0)
    n = s.add_node("r", "a", ["x"])
    s.observe(Observation(n.id, lik(x=0.01, BOT=0.99), "d", "document"))
    assert s.compute()[n.id].status == "declined" and n.id not in s.published()


def test_classes_margin_is_against_another_class():
    s = Structure(theta=2.0)
    n = s.add_node("r", "peak", ["std1@7.51", "std2@7.52", "other"])
    n.classes.update({"std1@7.51": "BCA2", "std2@7.52": "BCA2"})
    s.observe(Observation(n.id, lik(**{"std1@7.51": 0.45, "std2@7.52": 0.45, "other": 0.05, "BOT": 0.05}), "d", "doc"))
    v = s.compute()[n.id]
    assert v.status == "solved" and v.leader == "BCA2" and v.margin == pytest.approx(math.log(9))


def test_anytime_bound_two_symmetric_candidates():
    """P(ever publishing wrongly) ≤ e^{-θ} (thm:anytime, here with |C|−1 = 1 alternative)."""
    rng, theta, wrong, trials = random.Random(7), 2.0, 0, 3000
    for _ in range(trials):
        llr = 0.0                                    # log L(wrong)/L(true), true value = "a"
        for _ in range(60):
            # an observation that favours the truth with p = 0.7: ℓ(a)=0.7/0.3 symmetric
            llr += math.log(0.3 / 0.7) if rng.random() < 0.7 else math.log(0.7 / 0.3)
            if llr >= theta:
                wrong += 1
                break
    assert wrong / trials <= math.exp(-theta) + 0.02


def test_rules_propagate_published_values_and_keep_derived_observations():
    s = Structure(theta=2.0)
    a = s.add_node("me", "city", ["Greifswald", "Hamburg"])
    b = s.add_node("form", "Wohnort", ["Greifswald", "Hamburg"])
    s.add_rule(Rule("city→Wohnort", [a.id], b.id,
                    lambda vals: {c: math.log(0.95 if c == vals[0] else 0.025) for c in b.all_candidates()}))
    s.observe(statement(a, "Greifswald", "person", "you"))
    v = s.compute()
    assert v[b.id].status == "solved" and v[b.id].basis == "derived" and v[b.id].depth == 1
    assert s.published()[b.id] == "Greifswald"
    # the premise loses its status: the derived observation stays (keep semantics)
    s.observe(statement(a, "Hamburg", "person", "you"))
    assert s.compute()[a.id].status == "undecided"
    assert sum(1 for o in s.observations if o.derived) == 1


def test_only_published_graphs_answer_and_held_assumed_are_kept_apart():
    s = Structure(theta=5.0)
    n = s.add_node("r", "a", ["x", "y"], completion="x")
    s.observe(statement(n, "y", "document", "d1", cue="value: y"))
    g = s.graphs()
    assert s.published() == {} and g["held"][n.id] == ["y"] and g["assumed"][n.id] == "x"
    assert g["witnessed"][0]["cue"] == "value: y"


def test_proposals_are_virtual_and_move_no_margin():
    s = Structure(theta=2.0)
    n = s.add_node("r", "a")
    s.propose(n.id, "x", by="gemini/gemini-3.5-flash", why="seen in the letter")
    v = s.compute()[n.id]
    assert v.status == "assumed" and s.graphs()["virtual"][0]["by"].startswith("gemini")


def test_a_person_statement_publishes_at_the_catalogue_threshold_and_documents_need_corroboration():
    s = Structure(alpha=0.05)
    fields = [s.add_node("form", f"f{i}", ["v"]) for i in range(40)]
    theta = s.theta
    assert theta == pytest.approx(catalogue_threshold(40, 0.05))
    assert nats("person", 2) >= theta > nats("document", 2) * 2      # one confirmation; two quotes are not enough
    s.observe(statement(fields[0], "v", "person", "you"))
    for d in ("d1", "d2", "d3"):
        s.observe(statement(fields[1], "v", "document", d))
    v = s.compute()
    # 3 × log 9 = 6.59 nats < θ = log(40/0.05) = 6.68: three agreeing documents are not yet enough
    assert v[fields[0].id].status == "solved" and v[fields[1].id].status == "undecided"
    s.observe(statement(fields[1], "v", "document", "d4"))
    assert s.compute()[fields[1].id].status == "solved"


def test_key_changes_with_any_input():
    s = Structure(theta=2.0)
    n = s.add_node("r", "a", ["x"])
    k0 = s.key(["d1"])
    assert s.key(["d1"]) == k0 and s.key(["d2"]) != k0
    s.observe(statement(n, "x", "document", "d1"))
    assert s.key(["d1"]) != k0


def test_store_round_trip_appends_and_never_refires(tmp_path):
    s = Structure(theta=2.0)
    a = s.add_node("me", "city", ["Greifswald"])
    b = s.add_node("form", "Wohnort", ["Greifswald"])
    rule = Rule("r", [a.id], b.id, lambda vals: {c: math.log(0.95 if c == vals[0] else 0.05) for c in b.all_candidates()})
    s.add_rule(rule)
    s.observe(statement(a, "Greifswald", "person", "you"))
    s.compute()
    store.save(s, tmp_path)
    t = store.load(tmp_path)
    t.add_rule(rule)
    t.compute()
    assert len(t.observations) == len(s.observations) == 2 and t.published() == s.published()
    store.save(t, tmp_path)
    assert len((tmp_path / "observations.jsonl").read_text(encoding="utf-8").splitlines()) == 2
