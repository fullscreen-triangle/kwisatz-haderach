"""
Kundai's academic research profile — used for domain matching and response generation.
"""

from __future__ import annotations

RESEARCH_PROFILE: dict = {
    "name": "Kundai Farai Sachikonye",
    "affiliation": "Independent researcher",
    "former_affiliation": "Technische Universität München (TUM)",
    "former_role": "PhD candidate, Computational Lipidomics",

    # Primary research domains — used for domain-match scoring
    "domains": [
        "computational biology",
        "lipidomics",
        "mass spectrometry",
        "bioinformatics",
        "neuroscience",
        "consciousness",
        "information theory",
        "physics",
        "thermodynamics",
        "statistical mechanics",
        "machine learning",
        "artificial intelligence",
        "astronomy",
        "cosmology",
        "microscopy",
        "imaging",
        "pharmacology",
        "drug discovery",
        "finance",
        "financial mathematics",
        "philosophy of science",
        "complex systems",
        "dynamical systems",
        "operating systems",
        "membrane computing",
        "semantic computing",
    ],

    # Domain keywords that appear in journal/paper titles — for email matching
    "domain_keywords": [
        # biology/chemistry
        "lipid", "lipidom", "mass spectr", "metabol", "proteom",
        "bioinformat", "computational biology", "systems biology",
        "membrane", "cellular", "molecular",
        # neuroscience
        "neural", "neuroscien", "brain", "cognit", "conscious",
        # physics
        "physics", "quantum", "thermodynam", "statistical mechanic",
        "entropy", "phase space", "dynamical system",
        # ML/AI
        "machine learning", "deep learning", "neural network",
        "artificial intelligence", "language model",
        # astronomy
        "astronomy", "astrophys", "cosmolog", "galactic",
        # microscopy/imaging
        "microscop", "imaging", "spectroscop",
        # pharmacology
        "pharmacol", "drug", "therapeut",
        # finance
        "financ", "econom", "market", "quantitative",
        # philosophy/complexity
        "philosoph", "complex system", "information theory",
        "emergence", "self-organiz",
    ],

    # journals/publishers where he has existing relationships
    "accepted_roles": [],   # populated by the tracker

    "preferred_response_language": "English",   # for most journals
}


def domain_match_score(text: str) -> tuple[int, list[str]]:
    """
    Return (score 0-10, matched keywords) based on how well the email text
    matches Kundai's research domains.
    """
    text_lower = text.lower()
    matches = [kw for kw in RESEARCH_PROFILE["domain_keywords"] if kw in text_lower]
    score = min(10, len(matches) * 2)
    return score, matches
