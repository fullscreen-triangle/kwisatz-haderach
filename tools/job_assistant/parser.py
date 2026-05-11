"""Parse raw job posting text into a structured JobPosting dataclass.

This is regex/heuristic-based — no LLM needed. It extracts:
  - title, company, location, salary range, contract type
  - tech stack (keyword match against a known set)
  - language of the posting (DE or EN)
  - full raw text (passed to assessor and generator)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional


# Common tech keywords we want to detect in job postings
_TECH_KEYWORDS = [
    "TypeScript", "JavaScript", "Python", "Java", "Go", "Rust", "C#", "C++", "Ruby",
    "PHP", "Swift", "Kotlin",
    "React", "Next.js", "Vue", "Angular", "Svelte", "Ember",
    "Node.js", "Express", "Fastify", "NestJS", "Django", "FastAPI", "Flask", "Rails",
    "GraphQL", "Apollo", "REST", "gRPC",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "SQLite",
    "Docker", "Kubernetes", "Terraform", "AWS", "Azure", "GCP", "Vercel", "Heroku",
    "Git", "GitHub", "GitLab", "CI/CD", "Jenkins", "GitHub Actions",
    "Jest", "Vitest", "Cypress", "Playwright", "pytest",
    "TDD", "BDD", "Agile", "Scrum",
    "LLM", "OpenAI", "Anthropic", "Claude", "GPT",
    "VSCode", "WebSockets", "Kafka", "RabbitMQ",
]
_TECH_SET = {kw.lower(): kw for kw in _TECH_KEYWORDS}

# German common-word ratio for language detection
_DE_MARKERS = {
    "und", "die", "der", "das", "ist", "in", "für", "mit", "von", "auf",
    "eine", "einen", "wir", "sie", "ihr", "haben", "werden", "bei", "als",
    "du", "dich", "uns", "oder", "nicht", "auch", "sich", "dem",
}

_SALARY_PATTERNS = [
    # €70.000 – €90.000, EUR 70k, 70,000 EUR, etc.
    re.compile(
        r"(?:€|EUR|CHF|GBP)\s?(\d[\d.,]+)\s*(?:[-–—]|bis|to)\s*"
        r"(?:€|EUR|CHF|GBP)?\s?(\d[\d.,]+)",
        re.IGNORECASE,
    ),
    re.compile(
        r"(\d[\d.,]+)\s*(?:€|EUR|CHF)\s*(?:[-–—]|bis|to)\s*(\d[\d.,]+)\s*(?:€|EUR|CHF)?",
        re.IGNORECASE,
    ),
    # "up to €90k" / "bis zu 80.000"
    re.compile(r"(?:up to|bis zu)\s*(?:€|EUR)?\s?(\d[\d.,]+)", re.IGNORECASE),
    # "salary: 70k" shorthand
    re.compile(r"(\d{2,3})[kK]\b"),
]

_LOCATION_KEYWORDS = re.compile(
    r"\b(Remote|Hybrid|Berlin|Munich|München|Hamburg|Frankfurt|Stuttgart|Cologne|Köln|"
    r"Düsseldorf|Leipzig|Nuremberg|Nürnberg|Zurich|Zürich|Vienna|Wien|Bern|"
    r"London|Amsterdam|Paris|Barcelona|Lisbon|Lissabon)\b",
    re.IGNORECASE,
)

_CONTRACT_KEYWORDS = {
    "full-time": ["full.time", "vollzeit", "full time"],
    "part-time": ["part.time", "teilzeit", "part time"],
    "contract":  ["freiberuflich", "freelance", "contractor", "befristet"],
    "permanent": ["unbefristet", "permanent", "festanstellung"],
}


@dataclass
class JobPosting:
    raw_text: str
    title: str = "Unknown"
    company: str = "Unknown"
    location: str = "Unknown"
    remote: bool = False
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_raw: str = ""
    contract_type: str = "unknown"
    tech_stack: list[str] = field(default_factory=list)
    language: str = "en"        # "de" or "en"
    word_count: int = 0

    @property
    def salary_display(self) -> str:
        if self.salary_raw:
            return self.salary_raw
        if self.salary_min and self.salary_max:
            return f"€{self.salary_min:,} – €{self.salary_max:,}"
        if self.salary_min:
            return f"from €{self.salary_min:,}"
        return "Not specified"


def parse(text: str) -> JobPosting:
    posting = JobPosting(raw_text=text)
    posting.word_count = len(text.split())
    posting.language = _detect_language(text)
    posting.tech_stack = _extract_tech(text)
    posting.remote = bool(re.search(r"\bremote\b", text, re.IGNORECASE))
    posting.location = _extract_location(text)
    posting.contract_type = _extract_contract_type(text)
    _extract_salary(posting, text)
    _extract_title_company(posting, text)
    return posting


def _detect_language(text: str) -> str:
    words = re.findall(r"\b\w+\b", text.lower())
    sample = words[:200]
    de_count = sum(1 for w in sample if w in _DE_MARKERS)
    return "de" if de_count / max(len(sample), 1) > 0.06 else "en"


def _extract_tech(text: str) -> list[str]:
    found = {}
    lower = text.lower()
    for kw_lower, kw_canonical in _TECH_SET.items():
        # Word-boundary match
        if re.search(r"\b" + re.escape(kw_lower) + r"\b", lower):
            found[kw_lower] = kw_canonical
    # Deduplicate (e.g. "node" and "node.js" both present → keep canonical)
    return sorted(set(found.values()))


def _extract_location(text: str) -> str:
    matches = _LOCATION_KEYWORDS.findall(text)
    if not matches:
        return "Unknown"
    # Return unique matches preserving order
    seen: set[str] = set()
    result = []
    for m in matches:
        if m.lower() not in seen:
            seen.add(m.lower())
            result.append(m)
    return ", ".join(result[:3])  # max 3 locations


def _extract_contract_type(text: str) -> str:
    lower = text.lower()
    for ctype, patterns in _CONTRACT_KEYWORDS.items():
        for pat in patterns:
            if re.search(pat, lower):
                return ctype
    return "full-time"  # safe default for tech jobs


def _extract_salary(posting: JobPosting, text: str) -> None:
    for pat in _SALARY_PATTERNS:
        m = pat.search(text)
        if m:
            posting.salary_raw = m.group(0).strip()
            nums = re.findall(r"\d[\d.,]*", posting.salary_raw)
            parsed = []
            for n in nums:
                n = n.replace(".", "").replace(",", "")
                try:
                    v = int(n)
                    if v < 1000:   # "70k" shorthand
                        v *= 1000
                    if 15_000 < v < 500_000:
                        parsed.append(v)
                except ValueError:
                    pass
            if len(parsed) >= 2:
                posting.salary_min, posting.salary_max = sorted(parsed[:2])
            elif parsed:
                posting.salary_max = parsed[0]
            return


def _extract_title_company(posting: JobPosting, text: str) -> None:
    """Best-effort extraction of job title and company from the first few lines."""
    lines = [l.strip() for l in text.splitlines() if l.strip()][:20]

    # Company: look for common patterns
    for line in lines:
        m = re.search(
            r"(?:bei|at|@|for|company[:\s]+|unternehmen[:\s]+)\s*([A-ZÄÖÜa-zäöüß][^\n,|]{3,50})",
            line, re.IGNORECASE,
        )
        if m:
            posting.company = m.group(1).strip()
            break
    # If still unknown, use the first capitalized line that looks like a company name
    if posting.company == "Unknown":
        for line in lines[:5]:
            if re.match(r"[A-ZÄÖÜ][a-zA-ZÄÖÜäöü\s&.,-]{4,60}(GmbH|AG|Ltd|Inc|SE|UG|SAS|BV)?$", line):
                posting.company = line
                break

    # Title: look for role keywords in the first 10 lines
    title_re = re.compile(
        r"(Senior|Junior|Mid|Lead|Principal|Staff)?\s*"
        r"(Full[- ]?Stack|Frontend|Backend|DevOps|Platform|Software|AI|ML|Data)\s*"
        r"(Engineer|Developer|Architect|Scientist|Analyst|Consultant)",
        re.IGNORECASE,
    )
    for line in lines[:10]:
        m = title_re.search(line)
        if m:
            posting.title = m.group(0).strip()
            break
    # Fallback: first non-trivial line
    if posting.title == "Unknown" and lines:
        posting.title = lines[0][:80]
