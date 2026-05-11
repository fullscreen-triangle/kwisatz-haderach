"""LLM-powered generation: resume, cover letter, and eligibility narrative.

Requires ANTHROPIC_API_KEY environment variable.
If the key is absent, generation is skipped and the caller is notified.
"""

from __future__ import annotations

import json
import os
import sys
from typing import Optional

from .parser import JobPosting
from .profile import PROFILE
from .assessor import EligibilityReport

_MODEL = "claude-sonnet-4-6"
_MAX_TOKENS = 2048

_KEY_ENV = "ANTHROPIC_API_KEY"


def _client():
    try:
        import anthropic
    except ImportError:
        print(
            "  ⚠  'anthropic' not installed — pip install anthropic",
            file=sys.stderr,
        )
        return None
    key = os.environ.get(_KEY_ENV)
    if not key:
        print(
            f"  ⚠  {_KEY_ENV} not set — skipping LLM generation.\n"
            f"     Set it with: set {_KEY_ENV}=your_key  (Windows)\n"
            f"     or export {_KEY_ENV}=your_key  (bash/zsh)",
            file=sys.stderr,
        )
        return None
    return anthropic.Anthropic(api_key=key)


def _call(system: str, user: str) -> Optional[str]:
    client = _client()
    if client is None:
        return None
    try:
        msg = client.messages.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return msg.content[0].text
    except Exception as exc:
        print(f"  ✗  API call failed: {exc}", file=sys.stderr)
        return None


def generate_resume(posting: JobPosting, report: EligibilityReport) -> Optional[str]:
    """Return a tailored markdown resume, or None if API unavailable."""
    profile_json = json.dumps(
        {k: v for k, v in PROFILE.items() if k != "honest_gaps"},
        indent=2,
        ensure_ascii=False,
    )
    lang_note = (
        "Write the resume in German (Sie-form)."
        if posting.language == "de" and _looks_german_company(posting.raw_text)
        else "Write the resume in English."
    )

    system = (
        "You are an expert technical resume writer. "
        "Generate a clean, honest, tailored one-page resume in Markdown. "
        "Do not invent experience that isn't in the profile. "
        "Frame independent project work as production-quality professional work — because it is. "
        "Sections: Summary, Technical Skills, Projects, Education. "
        "Adjust keyword density to the job naturally, without stuffing. "
        "Output only the Markdown — no preamble, no trailing commentary."
    )

    user = (
        f"{lang_note}\n\n"
        f"CANDIDATE PROFILE:\n{profile_json}\n\n"
        f"JOB POSTING:\n{posting.raw_text[:3000]}\n\n"
        f"DETECTED TECH STACK: {', '.join(posting.tech_stack)}\n"
        f"ELIGIBILITY SCORE: {report.total}/100\n"
        f"KEY GAPS TO HANDLE HONESTLY: {'; '.join(PROFILE['honest_gaps'][:3])}\n"
    )

    return _call(system, user)


def generate_cover_letter(posting: JobPosting, report: EligibilityReport) -> Optional[str]:
    """Return a cover letter in the job's language, or None if API unavailable."""
    lang_is_german = posting.language == "de"

    system = (
        "You are an expert at writing authentic cover letters that sound like a real person wrote them. "
        "Direct, specific, no corporate-speak. "
        "Address the biggest gap honestly and reframe it as a strength where true. "
        "Maximum 4 short paragraphs. "
        "Output only the letter — no subject line, no preamble, no trailing commentary."
    )

    lang_note = (
        "Write in German. Use 'Sie' formality. Reference Henning Zacher if company is Softwarepiloten/KanzleiPilot."
        if lang_is_german
        else "Write in English."
    )

    user = (
        f"{lang_note}\n\n"
        f"CANDIDATE: {PROFILE['name']}\n"
        f"APPLYING TO: {posting.title} at {posting.company}\n\n"
        f"CANDIDATE SUMMARY: {PROFILE['summary']}\n\n"
        f"KEY PROJECTS (use these for specifics, don't invent others):\n"
        + "\n".join(
            f"- {p['name']}: {p['description']}"
            for p in PROFILE["projects"]
        )
        + f"\n\nJOB POSTING:\n{posting.raw_text[:2500]}\n\n"
        f"ELIGIBILITY NOTES (be aware of these, do not recite them verbatim):\n"
        + "\n".join(f"- {n}" for n in report.notes[:5])
    )

    return _call(system, user)


def generate_assessment_narrative(posting: JobPosting, report: EligibilityReport) -> Optional[str]:
    """5-sentence brutally honest eligibility narrative."""
    system = (
        "You are a brutally honest career advisor. "
        "Give a 5-sentence assessment of the candidate's genuine eligibility for this job. "
        "Include: what is genuinely strong, what is genuinely weak, "
        "and a final sentence on whether they should apply and why. "
        "No fluff. No encouragement for its own sake. "
        "Output only the 5 sentences — no preamble."
    )

    user = (
        f"CANDIDATE: {PROFILE['name']}\n"
        f"ROLE: {posting.title} at {posting.company}\n"
        f"NUMERIC SCORE: {report.total}/100 ({report.grade})\n"
        f"RECOMMENDATION: {report.recommendation}\n\n"
        f"SKILL MATCHES:\n"
        + "\n".join(
            f"  {m.keyword}: {m.score}/10"
            for m in sorted(report.skill_matches, key=lambda x: -x.score)[:8]
        )
        + f"\n\nHONEST GAPS:\n"
        + "\n".join(f"  - {g}" for g in PROFILE["honest_gaps"])
        + f"\n\nSTRENGTHS:\n"
        + "\n".join(f"  - {s}" for s in PROFILE["strengths"])
    )

    return _call(system, user)


def _looks_german_company(text: str) -> bool:
    """Heuristic: is the company likely German-speaking?"""
    import re
    return bool(re.search(r"\b(GmbH|AG|UG|KG|OHG)\b", text))
