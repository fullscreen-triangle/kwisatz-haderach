"""
The credentials the node depends on, and how each is kept alive.

`id` is the join key with the vault: a KeePassXC entry carries `KeeperId=<id>`, and
`tools/keeper push` writes that entry's declared expiry into manifest.json under the
same id. Adding a credential = one row here + one probe in probes.py + one vault entry.

strategy:
  refresh — a root credential the node uses to renew a short-lived leaf by itself
  mint    — the node mints leaves from a key; nothing ever expires on a human's clock
  static  — a plain key; the node can only check it and warn — renewal is manual

`interval` is how often the probe runs. It is deliberately not uniform: Garmin blocks
accounts that log in too often, while the GitHub check is a cheap local expiry test
that only calls GitHub when a mint is due.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Awaitable, Callable, List, Mapping

from backend.keeper import probes

Probe = Callable[[probes.ProbeContext], Awaitable[probes.ProbeResult]]


@dataclass(frozen=True)
class Credential:
    id: str
    title: str
    provider: str
    strategy: str
    interval: int          # seconds between probes
    probe: Probe
    renew_url: str
    used_by: str


REGISTRY: List[Credential] = [
    Credential("gmail", "Gmail", "Google OAuth", "refresh", 30 * 60, probes.probe_gmail,
               "https://console.cloud.google.com/auth/audience",
               "inbox, journal tracker"),
    Credential("garmin", "Garmin Connect", "Garmin", "refresh", 6 * 3600, probes.probe_garmin,
               "https://connect.garmin.com/modern/settings",
               "health panel"),
    Credential("github", "GitHub", "GitHub App", "mint", 5 * 60, probes.probe_github,
               "https://github.com/settings/apps",
               "mentions feed, repo inventory (facts)"),
    Credential("anthropic", "Anthropic API", "Anthropic", "static", 30 * 60, probes.probe_anthropic,
               "https://console.anthropic.com/settings/keys",
               "job assistant, journal responder"),
    Credential("amazon", "Amazon PA API", "Amazon Associates", "static", 30 * 60, probes.probe_amazon,
               "https://affiliate-program.amazon.de/assoc_credentials/home",
               "grocery prices"),
]


def build(env: Mapping[str, str]) -> List[Credential]:
    """The static rows plus one per IMAP mail account found in the environment, the
    memory service and the laptop node. Rebuilt at startup — a push restarts the backend, so new accounts appear."""
    from backend.mail import accounts
    rows = list(REGISTRY)
    for a in accounts.discover(env):
        if a.kind == "imap":
            rows.append(Credential(f"mail-{a.id}", f"Mail · {a.label}", a.host, "static", 15 * 60,
                                   probes.probe_imap_for(a.id), "", f"inbox ({a.label}) and the plan"))
    rows.append(Credential("chigutiro", "chigutiro memory", "chigutiro (local)", "static", 10 * 60,
                           probes.probe_chigutiro, "", "memory of mail, contacts, events"))
    rows.append(Credential("laptop", "Laptop", "laptop node (tailnet)", "static", 5 * 60,
                           probes.probe_laptop, "", "find / read / attach files on the laptop from the phone"))
    return rows
