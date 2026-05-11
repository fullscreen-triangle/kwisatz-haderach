"""Eligibility assessment — honest scoring against Kundai's profile.

Score breakdown (max 100):
  Stack match         (0–40): job tech requirements vs. skill scores
  Experience match    (0–25): depth/years vs. role seniority
  Work authorization  (0–10): legal to work in the posting's location
  Domain / context    (0–15): company type, domain, AI-First signals
  Gap risk            (0–10): penalty for red-flag mismatches; bonus for mitigators
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .parser import JobPosting
from .profile import PROFILE, skill_score


@dataclass
class SkillMatch:
    keyword: str
    score: int          # 0–10
    found_in_profile: bool

    @property
    def bar(self) -> str:
        filled = self.score
        return "█" * filled + "░" * (10 - filled)


@dataclass
class EligibilityReport:
    total: int                          # 0–100
    stack_score: int                    # 0–40
    experience_score: int               # 0–25
    auth_score: int                     # 0–10
    domain_score: int                   # 0–15
    gap_score: int                      # 0–10
    skill_matches: list[SkillMatch]
    recommendation: str                 # apply | apply_with_caveats | stretch | skip
    notes: list[str]                    # bullet-point reasoning

    @property
    def recommendation_icon(self) -> str:
        return {
            "apply":             "✅",
            "apply_with_caveats":"🟡",
            "stretch":           "⚠️ ",
            "skip":              "🔴",
        }.get(self.recommendation, "❓")

    @property
    def grade(self) -> str:
        if self.total >= 80:
            return "Strong match"
        if self.total >= 65:
            return "Good match"
        if self.total >= 50:
            return "Moderate match"
        if self.total >= 35:
            return "Stretch"
        return "Poor match"


_SENIORITY_LEVELS = {
    "junior":    1,
    "associate": 1,
    "mid":       2,
    "medior":    2,
    "senior":    3,
    "lead":      4,
    "principal": 5,
    "staff":     5,
}

_AI_SIGNALS = [
    "ai", "llm", "ai-first", "openai", "anthropic", "claude", "gpt",
    "machine learning", "generative", "langchain", "rag",
]

_DOMAIN_MATCH = {
    # domains where Kundai's background adds direct value
    "legaltech":   ["kanzlei", "law", "legal", "anwalt", "rechtsanwalt", "compliance"],
    "devtools":    ["developer tool", "dev tool", "ide", "vscode", "cli", "sdk"],
    "academic":    ["research", "wissenschaft", "university", "forschung"],
    "biotech":     ["bioinformatics", "genomics", "lipidomics", "biology", "life science"],
    "fintech":     ["banking", "finance", "fintech", "payment", "trading"],
}


def assess(posting: JobPosting) -> EligibilityReport:
    notes: list[str] = []
    skill_matches: list[SkillMatch] = []

    # ── 1. Stack match (0–40) ──────────────────────────────────────────────
    tech = posting.tech_stack or _infer_tech_from_text(posting.raw_text)
    raw_stack_scores: list[int] = []

    for kw in tech:
        s = skill_score(kw)
        skill_matches.append(SkillMatch(keyword=kw, score=s, found_in_profile=s > 0))
        raw_stack_scores.append(s)

    if raw_stack_scores:
        avg = sum(raw_stack_scores) / len(raw_stack_scores)
        stack_score = min(40, int(avg / 10 * 40))
    else:
        stack_score = 20  # neutral if no tech detected
        notes.append("Could not parse tech stack from job posting — used neutral score")

    unmatched = [m.keyword for m in skill_matches if m.score == 0]
    if unmatched:
        notes.append(f"Skills not in profile: {', '.join(unmatched)}")

    weak = [m.keyword for m in skill_matches if 0 < m.score < 5]
    if weak:
        notes.append(f"Weak coverage: {', '.join(weak)} (score ≤4/10)")

    # ── 2. Experience match (0–25) ─────────────────────────────────────────
    text_lower = posting.raw_text.lower()
    title_lower = posting.title.lower()

    seniority = 2  # default: mid-level
    for label, level in _SENIORITY_LEVELS.items():
        if label in title_lower or label in text_lower[:500]:
            seniority = level
            break

    # Kundai's honest experience level: strong independent work, no formal employment
    # Equivalent to ~2–3 years if projects were in a company setting
    candidate_level = 2.5

    if seniority <= 2:
        exp_score = 22
        notes.append("Role seniority aligns with portfolio depth (mid / medior level)")
    elif seniority == 3:
        exp_score = 16
        notes.append(
            "Role is 'senior' — portfolio is complex but lacks formal employment history; "
            "address this directly in cover letter"
        )
    else:
        exp_score = 10
        notes.append(
            f"Role requires lead/principal seniority — significant experience gap on paper"
        )

    # ── 3. Work authorization (0–10) ───────────────────────────────────────
    location_lower = posting.location.lower()
    is_germany = any(
        loc in location_lower
        for loc in ["germany", "deutschland", "berlin", "munich", "münchen",
                    "hamburg", "frankfurt", "cologne", "köln", "remote"]
    )
    is_eu_remote = posting.remote or "remote" in text_lower[:1000]
    is_ch = "zurich" in location_lower or "zürich" in location_lower or "switzerland" in location_lower

    if is_germany or is_eu_remote:
        auth_score = 10
        notes.append("Work authorization: German Aufenthaltserlaubnis covers this role")
    elif is_ch:
        auth_score = 6
        notes.append(
            "Switzerland: German permit generally does not grant CH work rights — "
            "verify if employer can accommodate or sponsor"
        )
    else:
        auth_score = 3
        notes.append(
            "Location unclear or non-EU — may require visa sponsorship; verify with employer"
        )

    # ── 4. Domain / context fit (0–15) ────────────────────────────────────
    domain_score = 8  # neutral base

    # AI-First signal → strong fit
    ai_signal_count = sum(1 for sig in _AI_SIGNALS if sig in text_lower)
    if ai_signal_count >= 3:
        domain_score = min(15, domain_score + 5)
        notes.append("AI-First role — LLM expertise is primary requirement, strong fit")
    elif ai_signal_count >= 1:
        domain_score = min(15, domain_score + 2)

    # Domain matches
    for domain, keywords in _DOMAIN_MATCH.items():
        if any(kw in text_lower for kw in keywords):
            domain_score = min(15, domain_score + 2)
            notes.append(f"Domain bonus: {domain} — background adds direct value")
            break

    # Dev-tools bonus (VSCode ext experience)
    if any(kw in text_lower for kw in ["developer tool", "vscode", "ide", "cli", "sdk", "extension"]):
        domain_score = min(15, domain_score + 3)
        notes.append("Developer-tooling role — VSCode extension experience is a direct match")

    # ── 5. Gap risk (0–10) ─────────────────────────────────────────────────
    gap_score = 5  # neutral

    # Mitigators
    if ai_signal_count >= 2:
        gap_score = min(10, gap_score + 2)
    if stack_score >= 32:
        gap_score = min(10, gap_score + 1)

    # Penalties
    years_re = re.search(r"(\d+)\+?\s*(?:years?|jahre?)", text_lower)
    if years_re:
        required_years = int(years_re.group(1))
        if required_years >= 5:
            gap_score = max(0, gap_score - 3)
            notes.append(
                f"Job requires {required_years}+ years — formal employment history is thin; "
                "portfolio complexity is the counterargument"
            )
        elif required_years >= 3:
            gap_score = max(0, gap_score - 1)

    # No formal employment acknowledgement
    notes.append(
        "Honest flag: no formal tech employment on record — "
        "projects are complex and public but this may be screened at CV stage"
    )

    # ── Total ──────────────────────────────────────────────────────────────
    total = stack_score + exp_score + auth_score + domain_score + gap_score

    # ── Recommendation ─────────────────────────────────────────────────────
    if total >= 75:
        recommendation = "apply"
    elif total >= 58:
        recommendation = "apply_with_caveats"
    elif total >= 42:
        recommendation = "stretch"
    else:
        recommendation = "skip"

    return EligibilityReport(
        total=total,
        stack_score=stack_score,
        experience_score=exp_score,
        auth_score=auth_score,
        domain_score=domain_score,
        gap_score=gap_score,
        skill_matches=skill_matches,
        recommendation=recommendation,
        notes=notes,
    )


def _infer_tech_from_text(text: str) -> list[str]:
    """Fallback: find tech words even if parser.tech_stack is empty."""
    from .parser import _extract_tech
    return _extract_tech(text)
