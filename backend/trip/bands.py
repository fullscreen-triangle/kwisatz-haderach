"""Closed intervals of non-negative quantities: every estimate is a band, never a number."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Band:
    lo: float
    hi: float

    def __post_init__(self):
        if self.lo > self.hi:
            lo, hi = self.hi, self.lo
            object.__setattr__(self, "lo", lo)
            object.__setattr__(self, "hi", hi)

    def __add__(self, o: "Band | float") -> "Band":
        o = o if isinstance(o, Band) else Band(o, o)
        return Band(self.lo + o.lo, self.hi + o.hi)

    def __mul__(self, o: "Band | float") -> "Band":
        """Product of non-negative bands (speeds, factors, lengths)."""
        o = o if isinstance(o, Band) else Band(o, o)
        return Band(self.lo * o.lo, self.hi * o.hi)

    __radd__ = __add__
    __rmul__ = __mul__

    def divided_into(self, distance: float) -> "Band":
        """Time to cover `distance` at a speed in this band."""
        return Band(distance / self.hi, distance / self.lo)

    def hull(self, o: "Band") -> "Band":
        return Band(min(self.lo, o.lo), max(self.hi, o.hi))

    def clip(self, lo: float, hi: float) -> "Band":
        return Band(min(max(self.lo, lo), hi), min(max(self.hi, lo), hi))

    @property
    def mid(self) -> float:
        return 0.5 * (self.lo + self.hi)

    def json(self, digits: int = 3) -> list[float]:
        return [round(self.lo, digits), round(self.hi, digits)]


ONE = Band(1.0, 1.0)
ZERO = Band(0.0, 0.0)
