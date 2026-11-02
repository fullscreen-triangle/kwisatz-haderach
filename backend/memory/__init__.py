"""
memory — the desk's working memory, as a propagation structure.

Ported from "Publishing a Catalogue Value Only When It Beats Its Best Alternative"
(conspirator/docs/propagation-structure; reference code validation/ps/margin.py). The
memory holds NODES — a (record, slot) pair, e.g. ("form:anmeldung", "Geburtsdatum") or
("me", "birth date") — each with a finite candidate set that always contains ⊥ ("none of
these"). OBSERVATIONS give every candidate a likelihood; a value is PUBLISHED only when
its class leads the best other class by θ nats:

  solved     a class other than ⊥ leads by ≥ θ — its value is published
  declined   ⊥ leads by ≥ θ — nothing is published, and that is a finding
  undecided  observations, but no class leads by θ — leader and runner-up recorded
  assumed    no observation — only the completion (a default) exists, never published

RULES turn published values into derived observations of other nodes (keep semantics: a
derived observation stays when its premise later loses its status; a premise published
with a new value fires the rule again). Depth to evidence is the least number of rule
applications from a direct observation.

What the desk gains: a model may PROPOSE candidates (they go to the `virtual` graph), but
only observations move margins, and only the published graphs (stated, derived) answer —
`published()` is all a prompt is ever given. A model never reads its own unchecked claim
back as a fact.

The paper's bound (|C|−1)e^(−θ) on ever publishing a wrong value holds when the
observation models are correct and candidates are fixed before observation. Here the
models are stated reliabilities per channel (observe.py), and candidates may come from a
proposer after documents were read — so the bound is an assumption to watch, not a
guarantee. The decision rule is the same either way.

  structure.py  nodes, observations, rules, margins, statuses, depth, graphs, stage key
  observe.py    observation models: a statement by a channel of stated reliability
  store.py      one memory per file, append-only observations, atomic snapshots
"""
