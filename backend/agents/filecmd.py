"""
Commands about FILES, recognised without a model: find / open / read / summarise / send.

"summarise my employment contract", "open the airbus fragebogen", "where is my passport
scan", "what does the Mietvertrag say", "send the refined triples paper to mark@uni.de
saying here is the draft" — each becomes laptop_find, then (except for find) one action
on the best-matching file. The runner-ups are always listed, so a wrong pick is one tap
to correct. Anything about mail, plans, meetings, repos or the web is NOT a file command
and goes to the planner.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional

NOT_FILES = re.compile(r"\b(e-?mails?|mails?|inbox|messages?|nachricht\w*|posteingang|plans?|planned|schedule|"
                       r"calendar|kalender|meetings?|termin\w*|repos?|repositor\w+|github|commits?|web|google|"
                       r"online|internet|weather|news)\b", re.I)
LEAD = r"^\s*(?:please\s+|pls\s+|can you\s+|could you\s+|bitte\s+)?"
TRAIL = re.compile(r"\s*(\bon (my|the) (laptop|computer|pc)\b|\bfrom (my|the) (laptop|computer)\b|"
                   r"\bauf (meinem|dem) laptop\b|\bplease\b|\bbitte\b|[?.!]+)\s*$", re.I)
ADDRESS = r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+"

PATTERNS = [
    ("email", re.compile(LEAD + r"(?:send|e-?mail|mail|forward|attach|schick\w*)\s+(?P<what>.+?)\s+(?:to|an)\s+"
                         rf"(?P<to>{ADDRESS}(?:\s*(?:,|and|und)\s*{ADDRESS})*)(?P<rest>.*)$", re.I)),
    ("summarize", re.compile(LEAD + r"(?:summari[sz]e|give me a summary of|summary of|tl;?dr(?: of)?|"
                             r"zusammenfass\w*(?: von)?|fasse)\s+(?P<what>.+?)(?:\s+zusammen)?$", re.I)),
    ("read", re.compile(LEAD + r"what does\s+(?P<what>.+?)\s+say(?:\s+(?:about|on|regarding)\s+(?P<about>.+))?$", re.I)),
    ("read", re.compile(LEAD + r"(?:read(?: me)?|what'?s in|lies)\s+(?P<what>.+)$", re.I)),
    ("open", re.compile(LEAD + r"(?:open|show(?: me)?|pull up|bring up|öffne|zeig(?:e)?(?: mir)?)\s+(?P<what>.+)$", re.I)),
    ("find", re.compile(LEAD + r"(?:find|locate|search for|look for|where(?: is|'s| are)|get me|"
                        r"such\w*(?: nach)?|finde?|wo ist)\s+(?P<what>.+)$", re.I)),
]


@dataclass
class FileCmd:
    verb: str             # find | open | read | summarize | email
    query: str
    to: str = ""
    note: str = ""        # email: what to say; read: the question to answer from the file


def parse(text: str) -> Optional[FileCmd]:
    t = text.strip()
    for verb, rx in PATTERNS:
        m = rx.match(t)
        if not m:
            continue
        what = TRAIL.sub("", m.group("what")).strip(" ,:;\"'")
        if not what or NOT_FILES.search(what):
            return None
        if verb == "email":
            rest = re.sub(r"^\s*[,:;-]?\s*(?:saying|and say|with the note|with|sagen[d]?|mit)?\s*[:,-]?\s*", "",
                          m.group("rest") or "", flags=re.I)
            to = ", ".join(re.findall(ADDRESS, m.group("to")))
            return FileCmd("email", what, to=to, note=TRAIL.sub("", rest).strip())
        about = (m.groupdict().get("about") or "").strip()
        return FileCmd(verb, what, note=TRAIL.sub("", about).strip())
    return None
