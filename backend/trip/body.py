"""
Walking speed from body segment parameters: a deliberately imprecise prior.

Leg length comes from the Zatsiorsky–Seluyanov segment lengths as adjusted by de Leva
(1996, Table 4): hip-to-knee and knee-to-ankle joint-centre distances of the reference
subjects, as fractions of their stature, plus ankle height (lateral malleolus to floor,
0.039 × stature; Winter 2009, Fig. 4.1). Speed follows from dynamic similarity: walking
is preferred near a Froude number Fr = v² / (g L) of about 0.25, and comfortably within
0.20–0.30 (Alexander 1989). So v = √(Fr g L), a band rather than a number.

Nothing here is fitted to the person. It is the speed a body of this stature would
choose on level ground in good conditions; conditions (grade, weather, light) and the
person's own measured ways (walked edges) move it from there.

    de Leva P. (1996) Adjustments to Zatsiorsky–Seluyanov's segment inertia parameters.
        J. Biomech. 29(9):1223–1230.
    Winter D. A. (2009) Biomechanics and Motor Control of Human Movement, 4th ed. Wiley.
    Alexander R. McN. (1989) Optimization and gaits in the locomotion of vertebrates.
        Physiol. Rev. 69(4):1199–1227.
"""

from __future__ import annotations

import math

from backend.trip.bands import Band

G = 9.81

# de Leva (1996) Table 4: reference stature and joint-centre segment lengths, mm.
REFERENCE = {
    "female": {"stature_mm": 1735.0, "thigh_mm": 368.5, "shank_mm": 432.3},
    "male": {"stature_mm": 1741.0, "thigh_mm": 422.2, "shank_mm": 434.0},
}
ANKLE_HEIGHT = 0.039          # × stature (Winter 2009)
FROUDE = Band(0.20, 0.30)     # preferred-walking band (Alexander 1989)


def leg_fraction(sex: str) -> Band:
    """Hip-joint height over stature. `unspecified` takes the hull over both references,
    so the band is honest about not knowing which applies."""
    def one(r: dict) -> float:
        return (r["thigh_mm"] + r["shank_mm"]) / r["stature_mm"] + ANKLE_HEIGHT

    if sex in REFERENCE:
        f = one(REFERENCE[sex])
        return Band(f, f)
    fs = [one(r) for r in REFERENCE.values()]
    return Band(min(fs), max(fs))


def leg_length(stature_m: Band, sex: str = "unspecified") -> Band:
    return stature_m * leg_fraction(sex)


def walking_speed(stature_m: Band, sex: str = "unspecified") -> Band:
    """Preferred level walking speed, m/s: √(Fr g L) over the Froude and leg-length bands."""
    L = leg_length(stature_m, sex)
    return Band(math.sqrt(FROUDE.lo * G * L.lo), math.sqrt(FROUDE.hi * G * L.hi))
