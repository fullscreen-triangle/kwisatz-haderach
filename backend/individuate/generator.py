"""
The okgg Generator with its words changed from a bibliography to a life.

Only the two prompts differ. Parsing, the selector rule (no value may name a single item),
the call log and the transport are the vendored engine's, unchanged. Mail arrives in German
and English and the witness matches cue words against the raw text, so the model is asked
for keywords in both languages.
"""

from __future__ import annotations

import json

import numpy as np

from .engine import Generator, Observations, Proposal


class LifeGenerator(Generator):
    def propose(self, obs: Observations, block: list[int], address: str, rng: np.random.Generator,
                limit: int = 120) -> Proposal | None:
        shown = sorted(block) if len(block) <= limit else sorted(rng.choice(block, limit, replace=False).tolist())
        snippets = len(shown) <= 30
        ctx = f"All of them already share the following: {address}.\n" if address else ""
        prompt = (
            "You are organising the open items of one person's life: messages, tasks and plans. Split the items "
            "below into 2 to 4 groups by ONE property: the area of life they belong to, the kind of action they "
            "need, the kind of party they involve, or when they matter.\n" + ctx +
            "Rules: every group must contain at least 2 items. Group names are short general descriptions, never "
            "an item's title and never a person's name. For each group give 4 to 8 lowercase keywords that would "
            "occur in the text of an item in that group. The items are written in German or English: give the "
            "keywords in both languages where they differ.\n\nItems:\n" +
            self._members(obs, shown, snippets) +
            '\n\nAnswer with JSON only: {"property": "...", "groups": [{"name": "...", "keywords": ["...", "..."]}], '
            '"assignment": {"P1": "<group name>", "P2": "<group name>"}}'
        )
        raw = self._ask(prompt, num_predict=min(2600, 450 + 16 * len(shown)))
        return self._parse(raw, obs, block, shown)

    def revise(self, obs: Observations, p: Proposal, S: np.ndarray) -> dict[int, int]:
        lines = []
        for i, x in enumerate(p.shown, 1):
            found = [p.values[v] for v in range(len(p.values)) if S[x] >> v & 1]
            lines.append(f"P{i}: " + (("text supports: " + ", ".join(found)) if found else "text shows none of the groups"))
        prompt = (
            f'You grouped items by "{p.prop}" into: ' + "; ".join(p.values) +
            ". Their texts were checked against your keywords:\n" + "\n".join(lines) +
            "\nRevise your assignment so that it agrees with the texts wherever they support a group. "
            'Answer with JSON only: {"assignment": {"P1": "<group name>", "P2": "<group name>"}}'
        )
        raw = self._ask(prompt, num_predict=min(2400, 300 + 14 * len(p.shown)))
        out = {}
        try:
            asg = json.loads(raw).get("assignment", {}) or {}
            low = [v.lower() for v in p.values]
            for i, x in enumerate(p.shown, 1):
                g = asg.get(f"P{i}")
                if isinstance(g, list):
                    g = g[0] if g else None
                if isinstance(g, str) and g.strip().lower() in low:
                    out[x] = low.index(g.strip().lower())
        except Exception:
            pass
        return out
