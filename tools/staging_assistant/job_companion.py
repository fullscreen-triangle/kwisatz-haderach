"""
Job-application companion.

Inputs:
  - a job description (text file or stdin)
  - the paper inventory (from paper_inventory.py)

Outputs:
  - ranked list of corpus papers most relevant to the job description
  - a cover-letter draft using the top-matching paper as the lead artefact
  - a "do not mention" list (papers in the corpus that are likely to
    pattern-match against the wrong category for this employer)

Matching is keyword-overlap-based against the paper title/abstract/keywords
plus a small overlap with the audience profile's idiom for the inferred
domain. It is not LLM-driven; the output is a draft to edit.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .audience_profiles import (
    AudienceProfile, PROFILES, get_profile, domain_to_default_audience,
)
from .paper_inventory import Paper


# Common words to ignore when computing overlap
STOPWORDS = set("""
a an the of to in for on with from by as is are was were be been being
this that these those it its at not no we our their they you your i my
which while when where why how all any some other another also more most
up down out over under than then so such if but or and into through
about between among through during after before above below within without
work years year month months week weeks day days time times use using used
will would could should may might can shall must each per via etc eg ie
job role position company team based see http https www com github
""".split())


def _tokenise(text: str) -> List[str]:
    if not text:
        return []
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s\-_]", " ", text)
    tokens = text.split()
    return [t for t in tokens if len(t) > 2 and t not in STOPWORDS]


def _score_paper_against_job(paper: Paper, job_tokens: Counter) -> float:
    """Weighted overlap between paper text and job description."""
    paper_text = " ".join([
        paper.title, paper.abstract, paper.keywords,
        " ".join(paper.sections),
    ])
    paper_tokens = Counter(_tokenise(paper_text))
    if not paper_tokens or not job_tokens:
        return 0.0

    score = 0.0
    for token, paper_freq in paper_tokens.items():
        job_freq = job_tokens.get(token, 0)
        if job_freq:
            score += min(paper_freq, job_freq)

    # Normalise by sqrt of paper length to avoid penalising/rewarding length too heavily
    norm = (sum(paper_tokens.values()) ** 0.5) or 1.0
    return score / norm


def _infer_domain_from_job(job_text: str) -> Optional[str]:
    """Heuristic: scan the job description for domain hints."""
    text = job_text.lower()
    domain_hints: List[Tuple[str, List[str]]] = [
        ("driving", ["formula 1", "f1", "powertrain", "motorsport", "automotive",
                      "autonomous", "vehicle", "lap time", "race", "ev"]),
        ("astronomy", ["astronomy", "astrophysics", "telescope", "observatory",
                       "cosmology", "exoplanet", "survey pipeline"]),
        ("instruments", ["mass spectrometry", "mass-spec", "instrumentation",
                         "ion optics", "analyzer", "tof", "orbitrap"]),
        ("biology", ["bioinformatics", "molecular biology", "biochemistry",
                     "synthetic biology", "lipidomics", "cell biology",
                     "biology", "biomedical"]),
        ("membrane", ["bci", "brain-computer", "neural interface",
                      "haptics", "sensory substitution", "neuroprosthetics"]),
        ("software", ["software engineer", "ml engineer", "machine learning",
                      "deep learning", "research engineer", "applied scientist"]),
        ("finance", ["quantitative", "quant ", "portfolio", "trading",
                     "hedge fund", "asset management", "risk", "alpha",
                     "investment"]),
        ("microscopy", ["microscopy", "imaging", "fluorescence",
                        "high-content", "cellular imaging"]),
        ("neuroscience", ["neuroscience", "brain", "cognition",
                          "consciousness", "fmri", "eeg"]),
    ]
    for domain, keywords in domain_hints:
        if any(kw in text for kw in keywords):
            return domain
    return None


@dataclass
class JobMatch:
    domain_inferred: Optional[str]
    audience_inferred: AudienceProfile
    ranked_papers: List[Tuple[Paper, float]]   # descending
    do_not_mention: List[Paper]


def match_job(job_text: str, corpus: List[Paper]) -> JobMatch:
    job_tokens = Counter(_tokenise(job_text))

    scored: List[Tuple[Paper, float]] = []
    for paper in corpus:
        s = _score_paper_against_job(paper, job_tokens)
        if s > 0:
            scored.append((paper, s))
    scored.sort(key=lambda t: t[1], reverse=True)

    # Domain inference + audience inference
    domain = _infer_domain_from_job(job_text)
    if domain is None and scored:
        domain = scored[0][0].domain
    audience_id = domain_to_default_audience(domain or "software")
    audience = get_profile(audience_id)

    # Do-not-mention list: papers from corpus matching the audience's avoid_bundling
    do_not: List[Paper] = []
    for paper in corpus:
        pid = paper.short_id().lower()
        if any(kw.lower() in pid for kw in audience.avoid_bundling):
            do_not.append(paper)

    return JobMatch(
        domain_inferred=domain,
        audience_inferred=audience,
        ranked_papers=scored[:25],
        do_not_mention=do_not,
    )


def render_cover_letter(job_text: str, match: JobMatch,
                        applicant_name: str = "Kundai Farai Sachikonye",
                        applicant_email: str = "kundai.sachikonye@bitspark.com",
                        applicant_extras: Optional[List[str]] = None,
                        ) -> str:
    """Produce a cover-letter draft for the highest-matching paper."""
    if not match.ranked_papers:
        return ("# No matching papers in corpus\n\n"
                "The job description didn't match any paper above the threshold. "
                "Either the corpus doesn't have a directly relevant paper, or "
                "the keyword inventory needs extending.")

    top_paper, top_score = match.ranked_papers[0]
    audience = match.audience_inferred
    second_paper = match.ranked_papers[1][0] if len(match.ranked_papers) > 1 else None

    extras = applicant_extras or [
        "Background: ex-PhD candidate in Computational Lipidomics at TUM Munich",
        "Personal: 10.7s 100m sprinter, semi-professional",
    ]

    # Use the actual paper's first abstract sentence, not the audience's
    # generic lead-with phrase which is profile-level.
    paper_summary = ""
    if top_paper.abstract:
        first_sentence_match = re.search(r"^(.+?[\.\?\!])(?:\s|$)",
                                         top_paper.abstract.strip())
        if first_sentence_match:
            paper_summary = first_sentence_match.group(1).strip()
            # Cap length defensively
            if len(paper_summary) > 350:
                paper_summary = paper_summary[:347] + "..."
    if not paper_summary:
        paper_summary = "[ONE-SENTENCE DESCRIPTION OF THE PAPER'S CENTRAL RESULT]"
    idiom = audience.idiom[0] if audience.idiom else (
        "rigorous quantitative methodology")

    lines: List[str] = []
    lines.append(f"# Cover letter draft")
    lines.append("")
    lines.append(f"**Inferred domain:** {match.domain_inferred or 'software (default)'}")
    lines.append(f"**Inferred audience profile:** {audience.name}")
    lines.append(f"**Top-matching paper:** `{top_paper.path}` (score {top_score:.3f})")
    if second_paper:
        lines.append(f"**Second-matching paper:** `{second_paper.path}`")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("Dear Hiring Manager,")
    lines.append("")
    lines.append(
        f"I am writing to apply for the [ROLE] at [COMPANY]. The position's "
        f"emphasis on [PARAPHRASE 1-2 SPECIFIC REQUIREMENTS FROM JOB DESCRIPTION] "
        f"aligns directly with work I have completed and validated."
    )
    lines.append("")
    lines.append(
        f"Specifically, I have written **\"{top_paper.title or top_paper.short_id()}\"** "
        f"(`{top_paper.path}`). {paper_summary} "
        f"The work uses {idiom} and produces [INSERT 1 SPECIFIC QUANTITATIVE "
        f"RESULT FROM THE PAPER — number with units, validated against "
        f"recognised benchmark]."
    )
    lines.append("")
    if second_paper:
        lines.append(
            f"This is supported by **\"{second_paper.title or second_paper.short_id()}\"**, "
            f"which [STATE THE COMPLEMENTARY CONTRIBUTION IN ONE SENTENCE]."
        )
        lines.append("")
    lines.append(
        "[OPTIONAL: one paragraph mapping your specific experience to "
        "specific requirements in the job description. Use the audience "
        "idiom phrasings — see the staging package for this audience.]"
    )
    lines.append("")
    if extras:
        lines.append("Brief context on me:")
        lines.append("")
        for e in extras:
            lines.append(f"- {e}")
        lines.append("")
    lines.append(
        "I would welcome the chance to discuss how the work described above "
        "could contribute to [SPECIFIC PROGRAMME / PRODUCT / RESEARCH "
        "DIRECTION at COMPANY]. The full submission package — including "
        "audience-tailored framing and supporting material — is available "
        "on request."
    )
    lines.append("")
    lines.append("Sincerely,")
    lines.append("")
    lines.append(applicant_name)
    lines.append(applicant_email)
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## Other corpus papers ranked for this job")
    lines.append("")
    lines.append("| Rank | Score | Paper | Domain |")
    lines.append("|-----:|------:|-------|--------|")
    for i, (paper, score) in enumerate(match.ranked_papers[:15], 1):
        title = (paper.title or paper.short_id()).replace("|", r"\|")[:80]
        lines.append(f"| {i} | {score:.3f} | `{paper.path}` ({title}) | {paper.domain} |")
    lines.append("")

    if match.do_not_mention:
        lines.append("## Do not mention to this audience")
        lines.append("")
        lines.append("These corpus papers exist but should NOT appear in this "
                     "cover letter or be referenced in any communication with "
                     "this employer — they pattern-match to the wrong category.")
        lines.append("")
        for paper in match.do_not_mention[:25]:
            lines.append(f"- `{paper.path}` — {paper.title or paper.short_id()}")
        if len(match.do_not_mention) > 25:
            lines.append(f"- _(plus {len(match.do_not_mention) - 25} more — see audience profile)_")
        lines.append("")

    lines.append("## Audience-idiom phrases to use in the letter body")
    lines.append("")
    for phrase in audience.idiom:
        lines.append(f"- {phrase}")
    lines.append("")

    return "\n".join(lines)
