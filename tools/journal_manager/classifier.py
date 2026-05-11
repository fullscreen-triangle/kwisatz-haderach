"""
Email classifier — no LLM needed, runs instantly.

Returns a SpamScore (0–100, higher = more likely spam) and a Category.

Signal weights:
  Spam signals push score UP.
  Legitimacy signals push score DOWN.

Categories (post-scoring):
  spam              — discard
  likely_spam       — probably discard; skim if curious
  uncertain         — review manually
  offer             — free publication offer worth tracking
  reviewer          — peer review invitation
  editor            — editorial/advisory board appointment
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from .research_profile import domain_match_score


# ── known publisher domains ────────────────────────────────────────────────────

_REPUTABLE_DOMAINS = {
    # Big commercial publishers
    "nature.com", "springer.com", "springernature.com",
    "elsevier.com", "cell.com", "lancet.com",
    "wiley.com", "wileyonlinelibrary.com",
    "acs.org", "rsc.org",
    "ieee.org", "acm.org",
    "aps.org", "iop.org",
    # Open access
    "plos.org", "public.plos.org",
    "frontiersin.org",
    "mdpi.com",
    "hindawi.com",
    "biomedcentral.com", "bmc.com",
    # Societies / universities
    "royalsocietypublishing.org",
    "oxford.ac.uk", "oup.com", "oxfordjournals.org",
    "cambridge.org",
    "pnas.org", "science.org", "sciencemag.org",
    "thelancet.com", "bmj.com", "nejm.org",
    "karger.com", "lww.com",
    "taylorandfrancis.com", "tandfonline.com",
    "sage.com", "sagepub.com",
    # German/European
    "degruyter.com", "thieme.de", "springer.de",
}

_SUSPICIOUS_DOMAINS = {
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
    "163.com", "qq.com", "mail.com", "protonmail.com",
}

# ── text signals ───────────────────────────────────────────────────────────────

# Each tuple: (regex_pattern, score_delta, label)
# Positive delta = spam signal; negative delta = legitimacy signal.

_SIGNALS: list[tuple[re.Pattern, int, str]] = [
    # Generic salutation — strong spam indicator
    (re.compile(r"\bDear\s+(Author|Researcher|Scientist|Scholar|Doctor|Sir|Madam|Colleague)\b", re.I), +25,
     'Generic salutation ("Dear Researcher/Author/Scientist")'),

    # Name used — legitimacy signal
    (re.compile(r"\bDear\s+(?:Dr\.?\s+|Prof\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b"), -20,
     "Personalised salutation (name used)"),

    # Specific paper referenced
    (re.compile(r"\b(?:your (?:paper|article|manuscript|work|study|research)|"
                r"entitled|titled|DOI:|doi\.org)\b", re.I), -25,
     "References specific paper/work"),

    # Fee waiver explicitly offered
    (re.compile(r"\b(?:waive|waiver|free of charge|no (?:publication |article )?(?:fee|charge|cost)|"
                r"complimentary|at no cost|without (?:any )?(?:fee|charge))\b", re.I), -20,
     "Explicit fee waiver offered"),

    # Fast-publication spam
    (re.compile(r"\b(?:publish (?:within|in) \d+ days?|fast.?track|rapid publication|"
                r"7[- ]day|within a week)\b", re.I), +20,
     "Unrealistic turnaround promise"),

    # APC request without waiver
    (re.compile(r"\b(?:article processing charge|APC|submission fee|publication fee|"
                r"processing fee|handling fee)\b", re.I), +15,
     "Requests publication fee (no waiver mentioned)"),

    # Overly broad scope
    (re.compile(r"\b(?:all fields|all disciplines|all areas|any discipline|"
                r"multidisciplinary|interdisciplinary journal)\b", re.I), +10,
     "Claims overly broad scope"),

    # Urgency language
    (re.compile(r"\b(?:limited time|deadline is approaching|last chance|"
                r"hurry|act now|do not miss)\b", re.I), +15,
     "Urgency/pressure language"),

    # Reviewer invitation signals
    (re.compile(r"\b(?:invited to review|review (?:this )?manuscript|"
                r"serve as (?:a )?reviewer|manuscript (?:ID|number|#))\b", re.I), -30,
     "Peer review invitation signals"),

    # Editorial board
    (re.compile(r"\b(?:editorial (?:board|committee)|advisory board|"
                r"associate editor|handling editor|join (?:our|the) (?:board|committee))\b", re.I), -25,
     "Editorial/advisory board appointment"),

    # Known manuscript management systems
    (re.compile(r"\b(?:ScholarOne|Editorial Manager|Manuscript Central|"
                r"EES|eJournal Press|Open Journal Systems|OJS)\b", re.I), -20,
     "Sent via known manuscript management system"),

    # ISSN present
    (re.compile(r"\bISSN[:\s]+\d{4}-\d{3}[\dX]\b", re.I), -10,
     "ISSN provided"),

    # Impact factor mentioned (can be genuine or inflated claim)
    (re.compile(r"\bimpact factor\b", re.I), -5,
     "Impact factor mentioned"),

    # Suspicious: requests CV/photo for editorial role without prior contact
    (re.compile(r"\b(?:please send|attach|submit)\b.{0,40}\b(?:CV|curriculum vitae|photo|headshot)\b", re.I), +10,
     "Requests CV/photo unprompted"),

    # Legitimate: explains why they contacted specifically
    (re.compile(r"\b(?:based on your|in light of your|given your expertise|"
                r"your work on|your recent publication|we have read)\b", re.I), -15,
     "Explains why they contacted you specifically"),
]


@dataclass
class Signal:
    label: str
    delta: int

    @property
    def is_spam(self) -> bool:
        return self.delta > 0


@dataclass
class ClassificationResult:
    raw_score: int                      # 0–100, higher = more spam
    category: str                       # spam | likely_spam | uncertain | offer | reviewer | editor
    signals: list[Signal]
    domain_score: int                   # 0–10, how well email matches research domains
    domain_keywords: list[str]          # matched domain keywords
    sender_domain: str
    sender_is_reputable: bool
    sender_is_suspicious: bool
    journal_name: str                   # extracted journal name, if any
    recommendation: str                 # ignore | manual_review | track_and_consider | respond

    @property
    def spam_signals(self) -> list[Signal]:
        return [s for s in self.signals if s.is_spam]

    @property
    def legit_signals(self) -> list[Signal]:
        return [s for s in self.signals if not s.is_spam]

    @property
    def verdict_icon(self) -> str:
        return {
            "spam":              "🗑️ ",
            "likely_spam":       "⚠️ ",
            "uncertain":         "❓",
            "offer":             "📬",
            "reviewer":          "🔬",
            "editor":            "✏️ ",
        }.get(self.category, "❓")

    @property
    def verdict_label(self) -> str:
        return {
            "spam":          "SPAM — discard",
            "likely_spam":   "LIKELY SPAM — skim before discarding",
            "uncertain":     "UNCERTAIN — review manually",
            "offer":         "LEGITIMATE OFFER — free publication",
            "reviewer":      "REVIEWER INVITATION",
            "editor":        "EDITORIAL APPOINTMENT",
        }.get(self.category, self.category)


def classify(email_text: str) -> ClassificationResult:
    score = 50  # neutral start

    # Apply text signals
    triggered: list[Signal] = []
    for pattern, delta, label in _SIGNALS:
        if pattern.search(email_text):
            # Fee-related signal: if fee waiver also present, cancel out APC penalty
            if delta == +15 and "waiv" in email_text.lower():
                continue
            triggered.append(Signal(label=label, delta=delta))
            score += delta

    score = max(0, min(100, score))

    # Domain match
    dom_score, dom_keywords = domain_match_score(email_text)
    score -= min(15, dom_score * 2)     # good domain match reduces spam score
    score = max(0, min(100, score))

    # Sender domain
    sender_domain = _extract_sender_domain(email_text)
    reputable = any(d in sender_domain for d in _REPUTABLE_DOMAINS) if sender_domain else False
    suspicious = any(d in sender_domain for d in _SUSPICIOUS_DOMAINS) if sender_domain else False

    if reputable:
        score = max(0, score - 25)
    if suspicious:
        score = min(100, score + 30)

    # Categorise
    category = _categorise(score, email_text)

    # Recommendation
    if score >= 70:
        recommendation = "ignore"
    elif score >= 40:
        recommendation = "manual_review"
    elif category in ("reviewer", "editor"):
        recommendation = "respond"
    else:
        recommendation = "track_and_consider"

    return ClassificationResult(
        raw_score=score,
        category=category,
        signals=triggered,
        domain_score=dom_score,
        domain_keywords=dom_keywords,
        sender_domain=sender_domain,
        sender_is_reputable=reputable,
        sender_is_suspicious=suspicious,
        journal_name=_extract_journal_name(email_text),
        recommendation=recommendation,
    )


def _categorise(score: int, text: str) -> str:
    text_lower = text.lower()

    if score >= 70:
        return "spam"
    if score >= 45:
        return "likely_spam"

    # Below 45 = probably legitimate — now determine sub-type
    if re.search(r"\b(?:invited to review|review (?:this )?manuscript|"
                 r"serve as (?:a )?reviewer|manuscript (?:ID|number))\b", text_lower):
        return "reviewer"

    if re.search(r"\b(?:editorial (?:board|committee)|advisory board|"
                 r"associate editor|handling editor|join (?:our|the) (?:board|committee))\b", text_lower):
        return "editor"

    if score < 45:
        return "offer"

    return "uncertain"


def _extract_sender_domain(text: str) -> str:
    m = re.search(r"[Ff]rom[:\s]+.+?@([\w.\-]+)", text)
    if m:
        return m.group(1).lower()
    m = re.search(r"[\w.\-+]+@([\w.\-]+)", text)
    if m:
        return m.group(1).lower()
    return ""


def _extract_journal_name(text: str) -> str:
    patterns = [
        re.compile(r"(?:journal of|journal on|the [\w\s]+ journal)[^,\n.]{0,60}", re.I),
        re.compile(r"(?:International Journal|European Journal|Asian Journal)[^,\n.]{0,60}", re.I),
        re.compile(r"(?:Frontiers in|PLOS|Nature [\w]+|Science [\w]+)[^,\n.]{0,60}", re.I),
    ]
    for pat in patterns:
        m = pat.search(text)
        if m:
            return m.group(0).strip()
    return ""
