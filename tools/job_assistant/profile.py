"""
Kundai's professional profile.

This is the single source of truth used by the assessor and generator.
Edit this file to keep it current as skills and projects evolve.
"""

from __future__ import annotations

PROFILE: dict = {
    "name": "Kundai Farai Sachikonye",
    "location": "Germany",
    "nationality": "Zimbabwean",
    "work_authorization": {
        "germany": "Aufenthaltserlaubnis (valid — renewal tracked separately)",
        "eu_remote": "permitted via German residence permit for most remote arrangements",
        "non_eu": "requires visa sponsorship",
    },
    "languages": {
        "English": "native/fluent",
        "German": "conversational — living and working in Germany",
    },

    # ── summary ───────────────────────────────────────────────────────────────
    "summary": (
        "AI-First developer with a strong academic foundation in computational science. "
        "Spent the last year building production-quality AI developer tools — autonomous "
        "code-repair pipelines, VSCode extensions, and LLM orchestration layers — independently, "
        "from scratch, and with a TDD discipline. Strong in TypeScript, Node.js, and Python; "
        "working knowledge of React and GraphQL; deep expertise in LLM integration and AI workflow design."
    ),

    # ── skills ────────────────────────────────────────────────────────────────
    # Score 1–10: honest self-assessment.
    # 8-10 = deep, production-tested  |  5-7 = working knowledge  |  1-4 = exposure only
    "skills": {
        "TypeScript":      10,
        "JavaScript":       9,
        "Node.js":          9,
        "Python":           8,
        "Jest / TDD":       9,
        "LLM integration":  10,
        "Claude API":       10,
        "OpenAI API":        9,
        "VSCode Extension API": 9,
        "REST APIs":         8,
        "Git / GitHub":      8,
        "PostgreSQL":        7,
        "SQL":               7,
        "React":             6,
        "GraphQL":           5,
        "Apollo":            5,
        "MongoDB":           5,
        "Express.js":        6,
        "Docker":            4,
        "CSS / HTML":        5,
        "FastAPI":           5,
        "Next.js":           4,
        "AWS":               3,
        "Azure":             3,
        "Kubernetes":        2,
    },

    # ── projects ──────────────────────────────────────────────────────────────
    "projects": [
        {
            "name": "kwisatz-haderach",
            "url": "https://github.com/fullscreen-triangle/kwisatz-haderach",
            "type": "VSCode Extension",
            "stack": ["TypeScript", "Node.js", "Jest", "VSCode Extension API"],
            "description": (
                "Citation-intelligence extension for academic documents. "
                "Plugin architecture (base-proof-assistant + Coq/Lean4 adapters), "
                "LLM-backed text analysis pipeline, 30-test TDD suite. "
                "Bug: discovered a silent Unicode corruption in regex character classes via failing tests — "
                "fixed with explicit escape sequences."
            ),
            "highlights": ["TDD (30/30 tests)", "plugin architecture", "LLM text analysis"],
        },
        {
            "name": "zangalewa / AutoErrorResolver",
            "url": "https://github.com/fullscreen-triangle/zangalewa",
            "type": "AI Code Workflow Platform",
            "stack": ["TypeScript", "Node.js", "Python", "Claude API", "OpenAI API"],
            "description": (
                "Runtime exception capture → LLM diagnosis → patch generation → "
                "git-isolated apply → commit or rollback. "
                "Multi-LLM provider abstraction, token-usage tracking, caching layer, diff viewer. "
                "Metacognitive layer: detects recurring workflows and proposes automation; "
                "tracks user expertise level and adapts responses."
            ),
            "highlights": [
                "autonomous error repair loop",
                "git-isolated patch application",
                "multi-LLM abstraction",
                "metacognitive workflow detection",
            ],
        },
        {
            "name": "pugachev-cobra",
            "url": "https://github.com/fullscreen-triangle/zangalewa/tree/main/pugachev-cobra",
            "type": "VSCode Extension",
            "stack": ["TypeScript", "VSCode Extension API"],
            "description": "VSCode frontend for the zangalewa AI code-workflow stack.",
            "highlights": ["VSCode extension API", "AI workflow UI"],
        },
        {
            "name": "kwasa-kwasa",
            "url": "https://github.com/fullscreen-triangle/kwasa-kwasa",
            "type": "Framework + VSCode Extensions",
            "stack": ["TypeScript", "Python"],
            "description": "Semantic computing framework with a suite of VSCode extensions.",
            "highlights": ["semantic text analysis", "framework design"],
        },
    ],

    # ── education ─────────────────────────────────────────────────────────────
    "education": [
        {
            "institution": "Technische Universität München (TUM)",
            "degree": "PhD candidate (discontinued)",
            "field": "Computational Lipidomics",
            "notes": (
                "Departed the programme to pursue independent software development. "
                "Strong foundation in scientific computing, statistical modelling, "
                "and cross-domain mathematical abstraction."
            ),
        },
    ],

    # ── honest gaps ───────────────────────────────────────────────────────────
    # Used by the assessor for transparent eligibility scoring.
    "honest_gaps": [
        "No formal employment history in software development — all work is self-directed (1 year)",
        "React: working knowledge; not primary expertise",
        "GraphQL / Apollo: working knowledge; limited production use",
        "MongoDB: limited; primary DB experience is PostgreSQL",
        "No team-based professional collaboration history (solo developer)",
        "Employment gap since PhD exit (~1 year)",
    ],

    # ── strengths that offset gaps ────────────────────────────────────────────
    "strengths": [
        "Complex, verifiable public portfolio — not toy projects",
        "TDD discipline proven by 30-test suite with a real bug caught by tests",
        "AI/LLM expertise is primary skill, not adjacent — directly relevant to AI-First roles",
        "Strong mathematical and scientific reasoning from academic background",
        "Self-directed: designed and built production-quality systems independently",
        "VSCode extension development is a niche, valued, and demonstrable skill",
    ],
}

# ── normalised skill lookup ────────────────────────────────────────────────────
# Maps common job-posting keywords → PROFILE skill scores.
# Add entries here when you see job postings use different terminology.

SKILL_ALIASES: dict[str, str] = {
    "ts":              "TypeScript",
    "js":              "JavaScript",
    "node":            "Node.js",
    "nodejs":          "Node.js",
    "python3":         "Python",
    "jest":            "Jest / TDD",
    "vitest":          "Jest / TDD",
    "tdd":             "Jest / TDD",
    "unit testing":    "Jest / TDD",
    "testing":         "Jest / TDD",
    "ai":              "LLM integration",
    "llm":             "LLM integration",
    "openai":          "OpenAI API",
    "claude":          "Claude API",
    "anthropic":       "Claude API",
    "vscode":          "VSCode Extension API",
    "rest":            "REST APIs",
    "restful":         "REST APIs",
    "postgres":        "PostgreSQL",
    "expressjs":       "Express.js",
    "express":         "Express.js",
    "nextjs":          "Next.js",
    "next.js":         "Next.js",
    "mongo":           "MongoDB",
    "nosql":           "MongoDB",
    "gql":             "GraphQL",
    "apollo client":   "Apollo",
    "apollo server":   "Apollo",
    "html":            "CSS / HTML",
    "css":             "CSS / HTML",
    "scss":            "CSS / HTML",
    "tailwind":        "CSS / HTML",
}


def skill_score(keyword: str) -> int:
    """Return Kundai's score (1–10) for a job keyword. 0 = not found."""
    kw = keyword.strip().lower()
    skills_lower = {k.lower(): v for k, v in PROFILE["skills"].items()}
    if kw in skills_lower:
        return skills_lower[kw]
    canonical = SKILL_ALIASES.get(kw)
    if canonical:
        return PROFILE["skills"].get(canonical, 0)
    return 0
