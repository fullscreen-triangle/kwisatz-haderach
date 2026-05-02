"""
Audience profiles: who can evaluate which kind of work, in what idiom,
with what bundle, and what to NOT include in the package.

Each profile is keyed by `audience_id` and includes:
  - which corpus domains the audience can evaluate
  - target venues (journals, conferences, labs)
  - the audience's preferred framing/idiom
  - what to LEAD with for this audience
  - what to OMIT (bundles or framings that trigger crackpot pattern-match)
  - bundle_recommendation: which corpus papers to include alongside
  - example reviewer profiles (named research areas, not specific people)

The profiles are conservative defaults derived from the conversation. They
should be edited against your real reception data — when one of your papers
lands well or poorly with a specific reviewer, update that audience's profile.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class AudienceProfile:
    audience_id: str
    name: str
    domains: List[str]               # which corpus domains this audience reads
    venues: List[str]                # journals, conferences, labs
    idiom: List[str]                 # framing the audience expects
    lead_with: List[str]             # what should be foregrounded
    omit: List[str]                  # what to NOT mention in this package
    bundle_with: List[str]           # paper-id keywords to include alongside
    avoid_bundling: List[str]        # paper-id keywords to NOT include
    reviewer_profile: List[str]      # types of reviewers / labs


# ----- AUDIENCES -----

PROFILES: Dict[str, AudienceProfile] = {
    "sports_science": AudienceProfile(
        audience_id="sports_science",
        name="Sports science / applied physiology",
        domains=["driving"],
        venues=[
            "Journal of Sports Sciences",
            "Medicine & Science in Sports & Exercise",
            "European Journal of Applied Physiology",
            "Frontiers in Physiology (Exercise Physiology section)",
            "Journal of Strength and Conditioning Research",
        ],
        idiom=[
            "single-subject self-experiment with quantitative prediction",
            "GPS- and clock-synced physiological measurements",
            "VO2max / lactate threshold framing",
            "biomechanical kinematic chain language",
            "phase-locking measured in cardiac/gait/respiratory rhythms",
        ],
        lead_with=[
            "the variance-minimisation 400m run paper",
            "predicted vs measured τ_restoration with 100% match",
            "caesium-clock-synced GPS at ±100ns",
            "8-segment kinematic chain validated empirically",
        ],
        omit=[
            "metaphysical claims",
            "bounded phase space axiom (mention only as 'a thermodynamic framework')",
            "consciousness sufficiency theorem",
            "membrane substrate / human-machine singularity",
            "free will / determinism arguments",
        ],
        bundle_with=["variance-minimisation", "philharmonic-f1"],
        avoid_bundling=[
            "membrane", "consciousness", "religion", "mechanistic_synthesis",
            "geometry_of_reality", "kelvin-paradox",
        ],
        reviewer_profile=[
            "exercise physiologists with quantitative-modelling background",
            "biomechanics researchers running multi-sensor pipelines",
            "sports-engineering researchers (instrumentation-focused)",
        ],
    ),

    "sensory_substitution": AudienceProfile(
        audience_id="sensory_substitution",
        name="Sensory substitution / haptics / BCI",
        domains=["membrane", "biology"],
        venues=[
            "IEEE Transactions on Haptics",
            "Frontiers in Neuroscience (Neuroprosthetics)",
            "Multisensory Research",
            "Journal of Neural Engineering",
            "Bach-y-Rita-tradition labs (USCF, Wisconsin)",
        ],
        idiom=[
            "tactile sensory channel as carrier",
            "no learning curve required (uses existing somatosensory infrastructure)",
            "bandwidth comparison vs. existing tongue-display / vest devices",
            "cortical plasticity / sensory remapping language",
            "the 'clothes' phenomenology of pre-attentive integration",
        ],
        lead_with=[
            "the biological-membrane-computing-interface paper",
            "use of native tactile pathway (no electrode array)",
            "comparison with cochlear implants / BrainPort training requirements",
            "pre-attentive somatosensory integration as the substrate",
        ],
        omit=[
            "singularity / human-machine singularity framing",
            "skill download / society implications",
            "consciousness as decay-curve intersection (only as supporting)",
            "religion / God-invocation",
        ],
        bundle_with=["biological-membrane", "measurement-modalities"],
        avoid_bundling=["religion", "kelvin-paradox", "geometry_of_reality"],
        reviewer_profile=[
            "haptics researchers working on semantic tactile channels",
            "sensory-substitution labs (BrainPort, Neosensory tradition)",
            "Bayesian-perception cognitive scientists",
        ],
    ),

    "biocomputing": AudienceProfile(
        audience_id="biocomputing",
        name="Biological / molecular computing",
        domains=["membrane", "biology"],
        venues=[
            "Nature Computational Science",
            "ACS Synthetic Biology",
            "Bioinformatics",
            "Journal of the Royal Society Interface",
            "Natural Computing",
        ],
        idiom=[
            "BMD as information catalyst (Mizraji 2021 lineage)",
            "S-entropy navigation as compression",
            "BMD networks as integrated logic circuits",
            "thermodynamic cost (Landauer) framing",
        ],
        lead_with=[
            "oscillatory-integrated-biological-logic-circuits paper",
            "BMD transistor measurements (42.1 on/off, <1μs switching)",
            "tri-dimensional R-C-L circuit operation",
            "Circuit-Pathway Duality Theorem",
        ],
        omit=[
            "religion / God-invocation",
            "society / skill download",
            "free will / determinism arguments",
        ],
        bundle_with=["oscillatory-integrated", "biological-membrane"],
        avoid_bundling=["religion", "kelvin-paradox"],
        reviewer_profile=[
            "synthetic biology researchers",
            "molecular computing labs",
            "thermodynamics-of-computation researchers",
        ],
    ),

    "computational_imaging": AudienceProfile(
        audience_id="computational_imaging",
        name="Computational imaging / astronomy software",
        domains=["astronomy", "microscopy"],
        venues=[
            "Astronomy & Computing",
            "Publications of the Astronomical Society of the Pacific",
            "IEEE Transactions on Computational Imaging",
            "Optics Express",
            "Nature Astronomy (methods sections)",
        ],
        idiom=[
            "scalar-field reformulation of telescope endpoints",
            "kernel-projection unification of classical observables",
            "browser-native runtime / consumer-hardware feasibility",
            "synthetic-sky validation followed by survey-data benchmark plan",
        ],
        lead_with=[
            "emergent-light-field paper",
            "harmonic-scattering cycle-rank multi-source theorem",
            "96% recall + FPR<5e-3 on synthetic 216-source catalogue",
            "browser-native at 15Hz on consumer laptop",
        ],
        omit=[
            "three-routes-to-G framework",
            "categorical-completion theology",
            "consciousness papers",
        ],
        bundle_with=["emergent-light-field", "harmonic-scattering"],
        avoid_bundling=["religion", "consciousness", "membrane"],
        reviewer_profile=[
            "computational-imaging researchers",
            "survey-pipeline engineers (LSST, ZTF tradition)",
            "astronomical-instrumentation reviewers",
        ],
    ),

    "mass_spec_methods": AudienceProfile(
        audience_id="mass_spec_methods",
        name="Mass spectrometry methods / instrumentation",
        domains=["instruments"],
        venues=[
            "Journal of the American Society for Mass Spectrometry",
            "Analytical Chemistry",
            "Rapid Communications in Mass Spectrometry",
            "International Journal of Mass Spectrometry",
        ],
        idiom=[
            "single Lagrangian unifying TOF/quadrupole/Orbitrap/FT-ICR",
            "validated against NIST CCCBDB / NIST 17 library",
            "ion-trajectory simulation comparison with SIMION",
            "GPU-accelerated browser-native pipeline as deliverable",
        ],
        lead_with=[
            "partition-Lagrangian unification of all four analyser equations",
            "39 NIST compounds, errors < 10^-4 across all four analysers",
            "browser-native six-pass GPU pipeline at 25MB working set",
            "Cu resistivity from partition lag (1.68×10⁻⁸ Ω·m)",
        ],
        omit=[
            "force-elimination metaphysics (frame as 'unified Lagrangian formulation')",
            "the broader framework / philosophical chapters",
            "religion / God-invocation",
        ],
        bundle_with=["mass-partitioning-lagrange", "ion-journey",
                     "ion-trajectory", "shader-depth"],
        avoid_bundling=["religion", "consciousness", "membrane",
                         "kelvin-paradox"],
        reviewer_profile=[
            "MS instrumentation researchers (ASMS community)",
            "ion-optics simulation experts",
            "computational analytical chemists",
        ],
    ),

    "ml_architecture": AudienceProfile(
        audience_id="ml_architecture",
        name="ML architecture (transformer / attention research)",
        domains=["finance", "software"],
        venues=[
            "ICLR", "NeurIPS", "ICML",
            "Transactions on Machine Learning Research",
            "JMLR (for theoretical contributions)",
        ],
        idiom=[
            "novel attention mechanism with provable contraction",
            "Banach fixed-point convergence vs. Universal Transformers / DEQs",
            "spectral-domain attention via DFT (FNet-adjacent)",
            "graph-completion attention with directional uncertainty flow",
            "chamber-specific LoRA with rank decreasing per stage",
        ],
        lead_with=[
            "ruminant-architecture paper",
            "contraction proof + benchmark plan (GLUE/MMLU/MATH)",
            "spectral attention as complementary to dot-product attention",
            "53% LoRA parameter savings via chamber-specific ranks",
        ],
        omit=[
            "fourth-stomach naming joke (call it 'four-chamber' or 'multi-stage')",
            "religion / God-invocation",
            "consciousness papers",
            "membrane substrate",
        ],
        bundle_with=["ruminant-architecture"],
        avoid_bundling=["religion", "consciousness", "membrane",
                         "kelvin-paradox"],
        reviewer_profile=[
            "ML researchers in attention mechanisms",
            "deep-equilibrium-model / fixed-point inference researchers",
            "parameter-efficient fine-tuning specialists",
        ],
    ),

    "quant_finance": AudienceProfile(
        audience_id="quant_finance",
        name="Quantitative finance / portfolio research",
        domains=["finance"],
        venues=[
            "Journal of Financial Economics",
            "Quantitative Finance",
            "Journal of Portfolio Management",
            "Risk",
            "SSRN (working papers)",
        ],
        idiom=[
            "Markowitz mean-variance recovered as special case",
            "Fiedler value for shock propagation",
            "fluctuation-dissipation for VIX vs. realised vol",
            "out-of-sample Sharpe / max drawdown / turnover backtest",
        ],
        lead_with=[
            "the 25-year SPX walk-forward backtest (REQUIRED before submission)",
            "DTI as partition function with traditional indices as projections",
            "Markowitz emergence from zero-uncertainty limit",
            "Maxwell-Boltzmann χ² test on inter-transaction times",
        ],
        omit=[
            "consciousness / membrane / religion",
            "philosophical chapters",
        ],
        bundle_with=["distributed-thermodynamic-index",
                     "portfolio-fuzzy-circuit-graph"],
        avoid_bundling=["religion", "consciousness", "membrane",
                         "kelvin-paradox"],
        reviewer_profile=[
            "quants with academic publications",
            "econophysics researchers (Mantegna / Stanley tradition)",
            "Bayesian portfolio-optimisation researchers",
        ],
    ),

    "philosophy_of_mind": AudienceProfile(
        audience_id="philosophy_of_mind",
        name="Philosophy of mind / consciousness studies",
        domains=["neuroscience", "philosophy"],
        venues=[
            "Journal of Consciousness Studies",
            "Phenomenology and the Cognitive Sciences",
            "Neuroscience of Consciousness",
            "Synthese (for analytical philosophy)",
            "Mind & Language",
        ],
        idiom=[
            "consciousness as decay-curve intersection (specific mechanism)",
            "psychon = (γ, Γ_f) trajectory-terminus pair",
            "explicit engagement with global workspace / IIT alternatives",
            "compatibilist framing where appropriate (Frankfurt / Dennett)",
        ],
        lead_with=[
            "consciousness papers with quantitative validation",
            "Q_dream/Q_thought = 0.975 prediction confirmed",
            "87/87 therapeutic effects validated",
            "comparison with global workspace theory predictions",
        ],
        omit=[
            "membrane substrate (only as future implementation, not load-bearing)",
            "religion / God-invocation",
            "society / skill download",
        ],
        bundle_with=["pyschon", "phase-space-mechanics", "therapeutic-effect"],
        avoid_bundling=["religion", "kelvin-paradox", "ruminant"],
        reviewer_profile=[
            "consciousness studies researchers (preferably empirically inclined)",
            "predictive-processing / Bayesian-brain theorists",
            "philosophers working on global workspace / IIT extensions",
        ],
    ),

    "philosophy_of_religion": AudienceProfile(
        audience_id="philosophy_of_religion",
        name="Philosophy of religion / analytical theology",
        domains=["philosophy"],
        venues=[
            "Faith and Philosophy",
            "Religious Studies",
            "International Journal for Philosophy of Religion",
            "Sophia",
            "Open Theology",
        ],
        idiom=[
            "apophatic theology / via negativa rederived mechanistically",
            "Gödel's posthumous Nachlass + ontological argument as antecedent",
            "Cusanus / Pseudo-Dionysius / Maimonides lineage",
            "transcendental argument from finite-observer constraints",
        ],
        lead_with=[
            "mechanistic_synthesis_of_purpose paper",
            "convergence with Gödelian residue paper",
            "explicit engagement with Plantinga / Swinburne / van Inwagen",
            "the wrong-makes-right / mischaracterisation theorem",
        ],
        omit=[
            "membrane / engineering (only as distant implementation)",
            "society / skill download",
            "transhumanist framings (avoid all transhumanism vocabulary)",
        ],
        bundle_with=["mechanistic_synthesis_of_purpose",
                     "necessity-for-circular-validation",
                     "geometry_of_reality"],
        avoid_bundling=["membrane", "ruminant", "variance-minimisation"],
        reviewer_profile=[
            "philosophers of religion in apophatic / Eastern traditions",
            "Gödel-Nachlass scholars",
            "analytical theologians",
        ],
    ),

    "philosophy_of_physics": AudienceProfile(
        audience_id="philosophy_of_physics",
        name="Philosophy of physics / foundations",
        domains=["theory", "philosophy"],
        venues=[
            "Foundations of Physics",
            "Studies in History and Philosophy of Modern Physics",
            "British Journal for the Philosophy of Science",
            "Synthese (for foundational arguments)",
        ],
        idiom=[
            "explicit engagement with block universe debate (B-theory vs. growing-block vs. presentism)",
            "Loschmidt resolution as logical rather than statistical",
            "categorical entropy alongside kinetic entropy",
            "Penrose CCC / dark-matter-from-geometry as comparable proposals",
        ],
        lead_with=[
            "loschmidt-paradox paper",
            "composition-inflation mechanism",
            "kelvin-paradox paper with dark matter ratio prediction",
            "explicit engagement with the standard alternatives",
        ],
        omit=[
            "religion explicitly framed (frame architectural entity in non-theological terms first)",
            "transhumanism / skill download",
            "membrane society",
        ],
        bundle_with=["loschmidt", "composition-inflation",
                     "bounded-phase-space", "kelvin-paradox"],
        avoid_bundling=["religion", "ruminant", "variance-minimisation"],
        reviewer_profile=[
            "philosophers of physics (foundations group)",
            "philosophers of time (B-theorists / growing-block theorists)",
            "philosophers of entropy / thermodynamics",
        ],
    ),
}


def list_audiences() -> List[str]:
    return sorted(PROFILES.keys())


def get_profile(audience_id: str) -> AudienceProfile:
    if audience_id not in PROFILES:
        raise KeyError(
            f"Unknown audience '{audience_id}'. Available: {list_audiences()}"
        )
    return PROFILES[audience_id]


def audiences_for_domain(domain: str) -> List[AudienceProfile]:
    """Return all audience profiles that can evaluate a given corpus domain."""
    return [p for p in PROFILES.values() if domain in p.domains]


def domain_to_default_audience(domain: str) -> str:
    """Heuristic default audience for a domain. Used when no audience is specified."""
    defaults = {
        "astronomy": "computational_imaging",
        "biology": "biocomputing",
        "membrane": "sensory_substitution",
        "microscopy": "computational_imaging",
        "instruments": "mass_spec_methods",
        "neuroscience": "philosophy_of_mind",
        "software": "ml_architecture",
        "data": "ml_architecture",
        "automobile": "sports_science",
        "driving": "sports_science",
        "finance": "quant_finance",
        "portfolio": "quant_finance",
        "religion": "philosophy_of_religion",
        "theory": "philosophy_of_physics",
        "philosophy": "philosophy_of_physics",
    }
    return defaults.get(domain, "computational_imaging")
