"""
Pitch generator: given a paper from the corpus and a target audience profile,
produce a markdown package containing:

  1. A one-paragraph hook in the audience's idiom
  2. The recommended bundle (which other corpus papers to send alongside)
  3. The DO-NOT-INCLUDE list (which other corpus papers to omit)
  4. Suggested venues
  5. Suggested reviewer profiles
  6. The "lead with" / "omit from framing" pair
  7. A draft 200-word abstract rewritten in the audience's language

This is rule-based templating, not LLM generation. The output is meant to be
edited, not sent verbatim. It saves you the cognitive cost of re-deriving
the staging principle for every submission.
"""

from __future__ import annotations

import re
import textwrap
from pathlib import Path
from typing import List, Optional

from .audience_profiles import AudienceProfile, get_profile, domain_to_default_audience
from .paper_inventory import Paper


def _short_abstract(abstract: str, target_words: int = 90) -> str:
    """Truncate abstract to ~target_words words at a sentence boundary."""
    if not abstract:
        return ""
    words = abstract.split()
    if len(words) <= target_words:
        return abstract.strip()
    head = " ".join(words[:target_words])
    last_period = head.rfind(".")
    if last_period > target_words * 4:  # at least one full sentence
        return head[:last_period + 1].strip()
    return head.strip() + "..."


def _bundle_match(paper_id: str, keyword: str) -> bool:
    return keyword.lower() in paper_id.lower()


def _select_bundle(paper: Paper, audience: AudienceProfile,
                   corpus: List[Paper]) -> tuple[List[Paper], List[Paper]]:
    """Return (include, exclude) lists from the corpus given audience's bundling rules."""
    pid = paper.short_id().lower()
    include: List[Paper] = []
    exclude: List[Paper] = []
    for other in corpus:
        if other.path == paper.path:
            continue
        oid = other.short_id().lower()
        # Always exclude things on the avoid list
        if any(_bundle_match(oid, kw) for kw in audience.avoid_bundling):
            exclude.append(other)
            continue
        # Include things matching the bundle list (but not the source paper itself)
        if any(_bundle_match(oid, kw) for kw in audience.bundle_with):
            if oid != pid:
                include.append(other)
    return include, exclude


def _format_list(items: List[str], bullet: str = "-") -> str:
    if not items:
        return f"{bullet} _(none)_"
    return "\n".join(f"{bullet} {it}" for it in items)


def _recommend_audience(paper: Paper) -> AudienceProfile:
    aid = domain_to_default_audience(paper.domain)
    return get_profile(aid)


def render_pitch(paper: Paper, audience: AudienceProfile,
                 corpus: List[Paper]) -> str:
    """Generate the markdown pitch package."""
    include_bundle, exclude_bundle = _select_bundle(paper, audience, corpus)

    title = paper.title or paper.short_id()
    short_abs = _short_abstract(paper.abstract, target_words=90)

    lines: List[str] = []
    lines.append(f"# Submission package: {title}")
    lines.append("")
    lines.append(f"**Source paper:** `{paper.path}`")
    lines.append(f"**Domain:** {paper.domain}")
    lines.append(f"**Target audience:** {audience.name} (`{audience.audience_id}`)")
    lines.append("")

    # ---- Hook ----
    lines.append("## One-paragraph hook")
    lines.append("")
    lines.append("> _Edit before sending. Generated to match the audience idiom._")
    lines.append("")
    if short_abs:
        # Reframe the abstract in the audience idiom by prepending the lead idiom
        # and suffixing the audience-relevant lead-with framing.
        lead_idiom = audience.idiom[0] if audience.idiom else ""
        hook = (
            f"This paper presents {title.lower() if title else 'work'} "
            f"framed as {lead_idiom}. "
            f"{short_abs}"
        )
        lines.append(hook.strip())
    else:
        lines.append("_No abstract extracted from source paper. Edit `paper_inventory.py` "
                     "extraction or paste an abstract in by hand._")

    lines.append("")

    # ---- Lead with / omit ----
    lines.append("## Foreground in submission")
    lines.append("")
    lines.append(_format_list(audience.lead_with))
    lines.append("")
    lines.append("## Omit / downplay (will trigger pattern-match)")
    lines.append("")
    lines.append(_format_list(audience.omit))
    lines.append("")

    # ---- Bundle ----
    lines.append("## Recommended bundle")
    lines.append("")
    if include_bundle:
        lines.append("Include alongside the source paper:")
        lines.append("")
        for p in include_bundle:
            lines.append(f"- `{p.path}` — {p.title or p.short_id()}")
    else:
        lines.append("_Submit the source paper alone. No corpus material clears the bundling rules for this audience._")
    lines.append("")
    lines.append("## DO NOT bundle")
    lines.append("")
    if exclude_bundle:
        lines.append("These exist in the corpus but should not be sent to this audience:")
        lines.append("")
        for p in exclude_bundle[:25]:
            lines.append(f"- ~~`{p.path}`~~ — {p.title or p.short_id()}")
        if len(exclude_bundle) > 25:
            lines.append(f"- _(plus {len(exclude_bundle) - 25} more)_")
    else:
        lines.append("_(no exclusions matched)_")
    lines.append("")

    # ---- Venues ----
    lines.append("## Target venues")
    lines.append("")
    lines.append(_format_list(audience.venues))
    lines.append("")

    # ---- Reviewer profile ----
    lines.append("## Reviewer profiles to seek")
    lines.append("")
    lines.append(_format_list(audience.reviewer_profile))
    lines.append("")

    # ---- Idiom note ----
    lines.append("## Audience idiom (use these phrasings)")
    lines.append("")
    lines.append(_format_list(audience.idiom))
    lines.append("")

    # ---- Generated abstract draft ----
    lines.append("## Audience-tuned abstract draft")
    lines.append("")
    lines.append("> _200-word skeleton. Replace bracketed parts with paper-specific content._")
    lines.append("")
    lines.append(_render_abstract_skeleton(paper, audience))
    lines.append("")

    # ---- Cover-letter snippet ----
    lines.append("## Cover-letter snippet")
    lines.append("")
    lines.append("> _Drop into the cover letter; edit names/dates._")
    lines.append("")
    lines.append(_render_cover_snippet(paper, audience))
    lines.append("")

    return "\n".join(lines)


def _render_abstract_skeleton(paper: Paper, audience: AudienceProfile) -> str:
    """A skeletal abstract pre-filled with audience-idiom phrases."""
    lead = audience.lead_with[0] if audience.lead_with else "the central result"
    idiom = audience.idiom[0] if audience.idiom else "rigorous quantitative methods"
    venue_examples = ", ".join(audience.venues[:2]) if audience.venues else "this venue"

    parts = [
        f"We report {lead}.",
        f"Using {idiom}, we [DESCRIBE METHOD IN 1-2 SENTENCES; "
        "this is where audience-specific technical vocabulary lives].",
        f"[STATE THE SPECIFIC EMPIRICAL RESULT IN AUDIENCE TERMS — "
        "numbers with units, comparison to prior baseline].",
        f"[STATE WHAT THIS REPLACES OR EXTENDS — frame against the standard "
        f"reference points readers of {venue_examples} expect].",
        f"[OPTIONAL: one sentence on broader implication, but stay within "
        f"the audience's evaluative scope. Avoid: {', '.join(audience.omit[:2]) if audience.omit else 'overreach'}].",
    ]
    text = " ".join(parts)
    return textwrap.fill(text, width=88)


def _render_cover_snippet(paper: Paper, audience: AudienceProfile) -> str:
    title = paper.title or paper.short_id()
    venue = audience.venues[0] if audience.venues else "this venue"
    reviewer_type = (audience.reviewer_profile[0]
                     if audience.reviewer_profile else "the appropriate reviewer")
    lead = audience.lead_with[0] if audience.lead_with else "the central result"
    idiom = audience.idiom[1] if len(audience.idiom) > 1 else (
        audience.idiom[0] if audience.idiom else "the audience's standard methodology"
    )

    text = (
        f"Dear Editor,\n\n"
        f"I am submitting \"{title}\" for consideration at {venue}. "
        f"The work [DESCRIBE METHOD IN ONE SENTENCE]; the central result "
        f"is {lead}. The submission uses {idiom}, "
        f"and the closest prior work is [CITE 1-2 NEAREST PAPERS IN VENUE'S "
        f"PUBLICATION HISTORY].\n\n"
        f"I would suggest reviewers with backgrounds in: "
        f"{reviewer_type}. [LIST 2-3 SUGGESTED REVIEWERS BY NAME if known.]\n\n"
        f"This work is not under consideration elsewhere. I have no conflicts "
        f"of interest to declare.\n\n"
        f"Sincerely,\nKundai Farai Sachikonye"
    )
    return text


def render_all_audiences_for_paper(paper: Paper, corpus: List[Paper]) -> str:
    """Render a comparison across all audiences that could plausibly receive this paper."""
    from .audience_profiles import audiences_for_domain, PROFILES

    domain_audiences = audiences_for_domain(paper.domain)
    if not domain_audiences:
        # Fall back to default audience for this domain
        domain_audiences = [_recommend_audience(paper)]

    lines: List[str] = []
    title = paper.title or paper.short_id()
    lines.append(f"# Multi-audience staging: {title}")
    lines.append("")
    lines.append(f"**Source paper:** `{paper.path}`")
    lines.append(f"**Domain:** {paper.domain}")
    lines.append(f"**Audiences considered:** {len(domain_audiences)}")
    lines.append("")
    lines.append("Each audience produces a different optimal package. "
                 "Pick the audience whose reviewer pool is most likely to "
                 "evaluate this paper sympathetically, then use the per-audience "
                 "package below.")
    lines.append("")

    for aud in domain_audiences:
        lines.append("---")
        lines.append("")
        lines.append(render_pitch(paper, aud, corpus))
        lines.append("")
    return "\n".join(lines)
