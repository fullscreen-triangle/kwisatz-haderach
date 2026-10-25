---
name: martial
description: Review and improve prose with martial, a deterministic reviewer. Use it whenever you are asked to improve, edit, proofread, tighten, review or check a manuscript, paper, thesis, abstract, grant text, README, guide or other documentation, and before reporting such a text as finished. It reports problems by file:line:col with stable codes, verifies evidence quotes against the cited sources, checks that documented paths, flags and commands exist, and catches what an edit made untrue (new numbers or citations, stronger claims).
---

# martial

martial is installed as a command-line program and registered as the Model Context Protocol (MCP) server `martial`.
It has no model inside: you write, and martial judges.

1. Read the guide once: call the MCP tool `martial_guide`, or run `martial guide`.
2. Save a copy of the file, then run `martial check FILE --profile manuscript|software-doc|general`.
3. Fix the problems marked `[agent]` from the top down. Never invent a citation, number, quote or expansion to clear one.
4. Run it again with `--against` the saved copy, and repeat until the verdict is `clean` or only `[author]` problems remain.
5. Report the verdict, what you fixed, and every `[author]` problem to the user. An `incomplete` verdict is not clean.
