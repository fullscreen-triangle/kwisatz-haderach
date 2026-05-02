"""
Synergy detection across the repo inventory.

For each repo, we tag which framework concepts appear in its description +
README + topics. We then compute pairwise synergy scores using a weighted
overlap that rewards:

  - shared concepts (more shared = more synergy)
  - rare concepts (concepts appearing in few repos are stronger signals)
  - cross-domain pairings (e.g., a software repo sharing a concept with a
    biology repo is a stronger synergy than two software repos sharing the
    same concept)

Output: a structured JSON report and a human-readable Markdown report.
"""

from __future__ import annotations

import json
import math
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict, field
from itertools import combinations
from pathlib import Path
from typing import Dict, List, Tuple

from . import framework_concepts as fc
from .inventory import RepoInfo


@dataclass
class TaggedRepo:
    name: str
    full_name: str
    description: str
    html_url: str
    pushed_at: str
    language: str
    size_kb: int
    concepts: Dict[str, float]   # concept_name -> hit weight
    domains: Dict[str, float]    # domain -> total weight in this repo


@dataclass
class SynergyPair:
    a: str
    b: str
    score: float
    shared_concepts: List[str]
    cross_domain: bool
    a_url: str = ""
    b_url: str = ""


def tag_repo(repo: RepoInfo) -> TaggedRepo:
    text_parts = [
        repo.description or "",
        repo.name.replace("-", " ").replace("_", " "),
        " ".join(repo.topics or []),
        repo.readme or "",
    ]
    full_text = "\n".join(text_parts)
    concept_hits = fc.tag_text(full_text)

    cidx = fc.concept_index()
    domain_weights: Dict[str, float] = defaultdict(float)
    for cname, weight in concept_hits.items():
        domain = cidx[cname].domain
        domain_weights[domain] += weight

    return TaggedRepo(
        name=repo.name,
        full_name=repo.full_name,
        description=repo.description or "",
        html_url=repo.html_url,
        pushed_at=repo.pushed_at,
        language=repo.language or "",
        size_kb=repo.size_kb,
        concepts=concept_hits,
        domains=dict(domain_weights),
    )


def tag_inventory(inventory: List[RepoInfo]) -> List[TaggedRepo]:
    return [tag_repo(r) for r in inventory]


def concept_idf(tagged: List[TaggedRepo]) -> Dict[str, float]:
    """
    Inverse-document-frequency for each concept across the tagged corpus.
    A concept appearing in 1 of 60 repos is more informative than one
    appearing in 50 of 60. Smoothed.
    """
    n_repos = max(len(tagged), 1)
    df: Counter = Counter()
    for t in tagged:
        for cname in t.concepts:
            df[cname] += 1
    return {cname: math.log((n_repos + 1) / (count + 1)) + 1.0
            for cname, count in df.items()}


def primary_domain(tagged: TaggedRepo) -> str:
    if not tagged.domains:
        return "unknown"
    return max(tagged.domains.items(), key=lambda kv: kv[1])[0]


def compute_synergies(
    tagged: List[TaggedRepo],
    min_shared: int = 1,
    cross_domain_bonus: float = 1.5,
) -> List[SynergyPair]:
    idf = concept_idf(tagged)
    cidx = fc.concept_index()
    pairs: List[SynergyPair] = []

    for a, b in combinations(tagged, 2):
        shared = set(a.concepts.keys()) & set(b.concepts.keys())
        if len(shared) < min_shared:
            continue

        # Weighted overlap using IDF and concept weights.
        # Each shared concept contributes idf * sqrt(weight_a * weight_b).
        score = 0.0
        for cname in shared:
            w = idf.get(cname, 1.0)
            score += w * math.sqrt(a.concepts[cname] * b.concepts[cname])

        # Cross-domain bonus: if the two repos' primary domains differ,
        # boost the score. This rewards the seventeen-derivations
        # convergence-across-domains property of the corpus.
        a_dom = primary_domain(a)
        b_dom = primary_domain(b)
        cross = a_dom != b_dom and a_dom != "unknown" and b_dom != "unknown"
        if cross:
            score *= cross_domain_bonus

        pairs.append(SynergyPair(
            a=a.name,
            b=b.name,
            score=round(score, 4),
            shared_concepts=sorted(shared),
            cross_domain=cross,
            a_url=a.html_url,
            b_url=b.html_url,
        ))

    pairs.sort(key=lambda p: p.score, reverse=True)
    return pairs


def write_json_report(
    tagged: List[TaggedRepo],
    pairs: List[SynergyPair],
    output_path: Path,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "tagged_repos": [asdict(t) for t in tagged],
        "synergy_pairs": [asdict(p) for p in pairs],
    }
    with output_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


def write_markdown_report(
    tagged: List[TaggedRepo],
    pairs: List[SynergyPair],
    output_path: Path,
    top_n_pairs: int = 50,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cidx = fc.concept_index()

    by_domain: Dict[str, List[TaggedRepo]] = defaultdict(list)
    for t in tagged:
        by_domain[primary_domain(t)].append(t)

    lines: List[str] = []
    lines.append("# GitHub Repo Synergy Report\n")
    lines.append(f"Total repos analysed: **{len(tagged)}**.\n")

    # ---- Inventory by primary domain ----
    lines.append("\n## Inventory by primary domain\n")
    for domain in sorted(by_domain.keys()):
        repos = sorted(by_domain[domain], key=lambda t: t.name.lower())
        lines.append(f"\n### {domain}  ({len(repos)} repos)\n")
        lines.append("| Repo | Concepts hit | Description |")
        lines.append("|------|--------------|-------------|")
        for t in repos:
            concept_list = ", ".join(sorted(t.concepts.keys())) or "_(none matched)_"
            desc = (t.description or "").replace("|", r"\|").strip()
            if len(desc) > 100:
                desc = desc[:97] + "..."
            lines.append(f"| [{t.name}]({t.html_url}) | {concept_list} | {desc} |")

    # ---- Top synergy pairs ----
    lines.append(f"\n## Top {top_n_pairs} synergy pairs\n")
    lines.append("Score combines IDF-weighted shared-concept count with a "
                 f"{1.5}x cross-domain bonus. Pairs that connect different "
                 "primary domains are flagged.\n")
    lines.append("| Rank | Score | Cross-domain | Pair | Shared concepts |")
    lines.append("|------|-------|:------------:|------|-----------------|")
    for i, p in enumerate(pairs[:top_n_pairs], 1):
        flag = "yes" if p.cross_domain else "no"
        shared = ", ".join(p.shared_concepts)
        pair_md = f"[{p.a}]({p.a_url}) ⇄ [{p.b}]({p.b_url})"
        lines.append(f"| {i} | {p.score:.3f} | {flag} | {pair_md} | {shared} |")

    # ---- Concept frequency ----
    idf = concept_idf(tagged)
    df: Counter = Counter()
    for t in tagged:
        for cname in t.concepts:
            df[cname] += 1
    lines.append("\n## Concept frequency across corpus\n")
    lines.append("| Concept | Domain | Repos with this concept | IDF |")
    lines.append("|---------|--------|------------------------:|----:|")
    for cname, count in df.most_common():
        domain = cidx[cname].domain
        lines.append(f"| {cname} | {domain} | {count} | {idf[cname]:.3f} |")

    # ---- Repos with no concept hits ----
    orphans = [t for t in tagged if not t.concepts]
    if orphans:
        lines.append("\n## Repos with no framework-concept hits\n")
        lines.append("These repos didn't match any concept in the vocabulary. "
                     "Consider whether (a) the README is sparse, (b) the repo "
                     "is outside the framework, or (c) the vocabulary needs "
                     "extending.\n")
        for t in sorted(orphans, key=lambda t: t.name.lower()):
            desc = (t.description or "").strip() or "_(no description)_"
            lines.append(f"- [{t.name}]({t.html_url}) — {desc}")

    with output_path.open("w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
