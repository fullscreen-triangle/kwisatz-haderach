"""
Framework-concept vocabulary derived from Kundai Sachikonye's corpus.

Each concept is a cluster of synonymous or closely-related terms. When tagging
repos, any term in the cluster matches the concept. Weights bias rare/specific
concepts higher, since shared rare concepts are stronger synergy signals than
shared common ones.

Domains help cross-domain synergy detection: two repos sharing a concept
that appears in different domain clusters across the corpus is a stronger
synergy candidate than two repos in the same domain sharing the same concept.
"""

from dataclasses import dataclass, field
from typing import List, Dict


@dataclass(frozen=True)
class Concept:
    name: str
    domain: str
    terms: tuple
    weight: float = 1.0


# Core foundational concepts (high weight; appearing anywhere is strong signal)
FOUNDATIONS = [
    Concept(
        "bounded_phase_space", "foundation",
        ("bounded phase space", "bounded phase-space", "bps law",
         "liouville measure", "finite phase space"),
        weight=2.5,
    ),
    Concept(
        "oscillatory_necessity", "foundation",
        ("oscillatory necessity", "poincare recurrence", "poincaré recurrence",
         "oscillation theorem", "oscillatory dynamics"),
        weight=2.0,
    ),
    Concept(
        "partition_coordinates", "foundation",
        ("partition coordinates", "(n, l, m, s)", "n,l,m,s",
         "partition signature", "categorical partition"),
        weight=2.5,
    ),
    Concept(
        "triple_equivalence", "foundation",
        ("triple equivalence", "triple equivalence theorem",
         "oscillation = counting = partition", "s_osc = s_cat = s_part"),
        weight=2.5,
    ),
    Concept(
        "categorical_completion", "foundation",
        ("categorical completion", "trajectory completion",
         "completion mechanism", "categorical filling"),
        weight=2.0,
    ),
    Concept(
        "sufficiency_theorem", "foundation",
        ("sufficiency theorem", "sufficiency recognition",
         "sufficiency criterion", "phase-lock sufficiency"),
        weight=2.0,
    ),
]

# S-entropy and information-theoretic concepts
S_ENTROPY = [
    Concept(
        "s_entropy", "information",
        ("s-entropy", "s entropy", "saint entropy", "saint-entropy",
         "s_k", "s_t", "s_e", "s-coordinates", "s coordinates"),
        weight=2.0,
    ),
    Concept(
        "bmd", "information",
        ("biological maxwell demon", "biological maxwell demons", "bmd",
         "information catalyst", "maxwell demon"),
        weight=2.0,
    ),
    Concept(
        "categorical_distance", "information",
        ("categorical distance", "d_cat", "d-cat", "category metric"),
        weight=1.5,
    ),
    Concept(
        "gear_ratio", "information",
        ("gear ratio", "gear-ratio", "frequency ratio routing",
         "harmonic gear"),
        weight=1.5,
    ),
]

# Membrane / substrate concepts
MEMBRANE = [
    Concept(
        "membrane_substrate", "biology",
        ("biological membrane", "lipid bilayer", "membrane interface",
         "second skin", "membrane computer", "membrane computing"),
        weight=2.5,
    ),
    Concept(
        "o2_phase_lock", "biology",
        ("oxygen ensemble", "o2 ensemble", "phase-locked o2",
         "phase locked oxygen", "paramagnetic coupling",
         "o2 phase locking"),
        weight=2.5,
    ),
    Concept(
        "oscillatory_holes", "biology",
        ("oscillatory hole", "oscillatory holes", "hole-filler",
         "hole filler", "p-type hole", "n-type pharmaceutical"),
        weight=2.0,
    ),
    Concept(
        "categorical_physical_commutation", "biology",
        ("categorical-physical commutation", "[o_cat, o_phys] = 0",
         "zero backaction", "commutation theorem"),
        weight=2.0,
    ),
    Concept(
        "cardiac_master_clock", "biology",
        ("cardiac master oscillator", "cardiac clock", "heartbeat oscillator",
         "cardiac phase reference"),
        weight=1.5,
    ),
]

# Mass spec / instruments
INSTRUMENTS = [
    Concept(
        "mass_spec", "instruments",
        ("mass spectrometry", "mass spec", "mass spectrometer",
         "ms/ms", "tandem mass"),
        weight=1.5,
    ),
    Concept(
        "analyzer_unification", "instruments",
        ("tof", "time-of-flight", "orbitrap", "ft-icr", "quadrupole",
         "analyzer lagrangian", "ion trajectory"),
        weight=1.5,
    ),
    Concept(
        "fragment_shader_observation", "instruments",
        ("fragment shader", "rendering-measurement identity",
         "gpu observation", "shader as instrument"),
        weight=2.0,
    ),
    Concept(
        "membrane_shader", "instruments",
        ("membrane shader", "shader pipeline", "six-pass pipeline",
         "five-pass pipeline"),
        weight=1.5,
    ),
]

# Astronomy / cosmology
COSMOLOGY = [
    Concept(
        "scalar_field_astronomy", "astronomy",
        ("emergent light field", "scalar field astronomy",
         "celestial sphere", "reference sky model"),
        weight=2.0,
    ),
    Concept(
        "harmonic_scattering", "astronomy",
        ("harmonic scattering", "harmonic loop", "cycle rank",
         "loop coupling", "molecular resonator"),
        weight=2.0,
    ),
    Concept(
        "composition_inflation", "astronomy",
        ("composition inflation", "t(n,d)", "tetration depth",
         "(d+1)^n", "partition depth"),
        weight=2.0,
    ),
    Concept(
        "n_max_observation_boundary", "astronomy",
        ("n_max", "observation boundary", "xi boundary",
         "heat death enumeration", "kelvin paradox"),
        weight=2.0,
    ),
    Concept(
        "g_routes", "astronomy",
        ("three routes to g", "gravitational constant derivation",
         "newton constant", "route i route ii route iii"),
        weight=2.0,
    ),
]

# Software / OS / network
SOFTWARE = [
    Concept(
        "buhera_os", "software",
        ("buhera", "vahera", "zangalewa", "trajectory completion mechanism",
         "buhera os"),
        weight=2.0,
    ),
    Concept(
        "thermodynamic_security", "software",
        ("thermodynamic security", "pylon", "ideal gas network",
         "network gas", "infinite attack cost"),
        weight=2.0,
    ),
    Concept(
        "sango_rine_shumba", "software",
        ("sango rine shumba", "sango-rine-shumba", "phase-locked detector network",
         "trajectory network state"),
        weight=2.0,
    ),
    Concept(
        "purpose_framework", "software",
        ("purpose model factory", "backward training principle",
         "aperture foundation model", "domain connector",
         "purpose framework"),
        weight=2.0,
    ),
    Concept(
        "borgia_cheminformatics", "software",
        ("borgia", "cheminformatics", "nist validation",
         "molecular fingerprint"),
        weight=1.5,
    ),
    Concept(
        "lavoisier_spectrometer", "software",
        ("lavoisier", "spectroscopic derivation", "computer as spectrometer",
         "consumer hardware spectrometer"),
        weight=1.5,
    ),
    Concept(
        "bloodhound_vm", "software",
        ("bloodhound", "distributed vm", "data reduction"),
        weight=1.5,
    ),
]

# Neuroscience / consciousness
NEUROSCIENCE = [
    Concept(
        "psychon", "neuroscience",
        ("psychon", "psychons", "(γ, γ_f)", "gamma gamma_f",
         "trajectory-terminus pair"),
        weight=2.5,
    ),
    Concept(
        "consciousness_decay_curves", "neuroscience",
        ("decay-curve intersection", "consciousness as decay",
         "p_decay", "t_decay", "decay intersection"),
        weight=2.0,
    ),
    Concept(
        "virtual_brain", "neuroscience",
        ("virtual brain computing", "virtual brain framework",
         "brain computing framework"),
        weight=1.5,
    ),
    Concept(
        "therapeutic_trajectory", "neuroscience",
        ("therapeutic effect trajectory", "therapeutic mechanism",
         "87/87", "therapy trajectory"),
        weight=1.5,
    ),
    Concept(
        "microfluidic_aperture", "neuroscience",
        ("microfluidic geometric aperture", "geometric aperture",
         "microfluidic regime", "categorical aperture"),
        weight=2.0,
    ),
]

# Driving / autonomous vehicles
DRIVING = [
    Concept(
        "high_velocity_intent", "driving",
        ("high velocity intent decomposition", "intent identifiability",
         "reflex-cognitive decomposition", "intent decomposition"),
        weight=2.0,
    ),
    Concept(
        "vehicle_membrane", "driving",
        ("vehicle membrane", "automobile membrane", "car skin",
         "vehicle-membrane sensor"),
        weight=2.5,
    ),
    Concept(
        "f1_validation", "driving",
        ("formula one", "f1 validation", "philharmonic f1",
         "bahrain", "theoretical minimum lap"),
        weight=2.0,
    ),
]

# Finance / portfolio
FINANCE = [
    Concept(
        "fourth_stomach", "finance",
        ("fourth stomach", "fourth-stomach", "ruminant architecture",
         "ruminant processing"),
        weight=2.0,
    ),
    Concept(
        "fuzzy_circuit_portfolio", "finance",
        ("fuzzy circuit", "portfolio circuit graph",
         "trajectory completion portfolio", "kirchhoff portfolio"),
        weight=2.0,
    ),
    Concept(
        "thermodynamic_index", "finance",
        ("distributed thermodynamic index", "dti", "market gas",
         "market hamiltonian"),
        weight=2.0,
    ),
    Concept(
        "spectral_attention", "finance",
        ("spectral attention", "harmonic attention",
         "graph completion attention", "rumination convergence"),
        weight=1.5,
    ),
]

# Physics-philosophy
PHYSICS_PHILOSOPHY = [
    Concept(
        "loschmidt_resolution", "philosophy",
        ("loschmidt paradox", "loschmidt resolution",
         "categorical entropy", "kinetic vs categorical entropy"),
        weight=2.0,
    ),
    Concept(
        "force_free_physics", "philosophy",
        ("force-free", "force free", "partition lagrangian",
         "no force needed", "lorentz as euler-lagrange"),
        weight=2.0,
    ),
    Concept(
        "godel_residue", "philosophy",
        ("godel residue", "gödel residue", "tier 3", "unknowable unknowable",
         "circular validation"),
        weight=2.0,
    ),
    Concept(
        "architectural_god", "philosophy",
        ("architectural entity", "god-invocation coherence",
         "perfect alignment", "a(t)=1", "mischaracterisation theorem"),
        weight=2.5,
    ),
]

ALL_CONCEPTS: List[Concept] = (
    FOUNDATIONS + S_ENTROPY + MEMBRANE + INSTRUMENTS + COSMOLOGY +
    SOFTWARE + NEUROSCIENCE + DRIVING + FINANCE + PHYSICS_PHILOSOPHY
)


def concepts_by_domain() -> Dict[str, List[Concept]]:
    by_domain: Dict[str, List[Concept]] = {}
    for c in ALL_CONCEPTS:
        by_domain.setdefault(c.domain, []).append(c)
    return by_domain


def tag_text(text: str) -> Dict[str, float]:
    """
    Return {concept_name: hit_weight} for concepts whose terms appear in text.
    Case-insensitive substring match. Weight is concept.weight per concept,
    regardless of how many terms in the cluster matched.
    """
    if not text:
        return {}
    haystack = text.lower()
    hits: Dict[str, float] = {}
    for c in ALL_CONCEPTS:
        for term in c.terms:
            if term.lower() in haystack:
                hits[c.name] = c.weight
                break
    return hits


def concept_index() -> Dict[str, Concept]:
    return {c.name: c for c in ALL_CONCEPTS}
