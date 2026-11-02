"""
Routing agents to models.

No single model is good at everything, and a model is a poor judge of its own work. So
each node goes to a model chosen for what it needs — code, reasoning, general, or verify
(check nodes) — from a pool listing, per specialty, the models to try in order.

A model that fails (unreachable, overloaded, unparseable reply) is skipped for the next in
line; one the provider rejects outright (4xx other than 429) is dropped for the run. A
refusal of the ACCOUNT (401/402/403) switches its provider off for the run, with the
reason kept. Only when every pool model has failed is the local fallback used.

Two independence rules apply to checks: a check never goes to the model FAMILY that
produced the work it checks, and with `crowd > 1` it is put to several families, each
verdict one chunk, holding only if every checker holds.

Routing is by word cues and model names: deterministic, no model call.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Protocol, Set, Tuple

from backend.primitive.proposal import SYSTEM, Context, Proposal, ReplyError, parse_reply, render
from backend.primitive.trie import clip

CODE, REASONING, GENERAL, VERIFY = "code", "reasoning", "general", "verify"
SPECIALTIES = (CODE, REASONING, GENERAL, VERIFY)

CODE_WORDS = {
    "code", "coding", "function", "functions", "implement", "implementation", "python", "rust",
    "javascript", "typescript", "java", "golang", "c++", "script", "program", "programming",
    "compile", "compiler", "bug", "debug", "refactor", "class", "method", "api", "sql", "regex",
    "algorithm", "library", "cli", "json", "html", "css", "bash", "shell", "unittest", "pytest",
    "repository", "crate", "module", "dataframe", "pandas", "numpy",
}
REASONING_WORDS = {
    "prove", "proof", "derive", "derivation", "theorem", "lemma", "calculate", "calculation",
    "compute", "equation", "integral", "derivative", "probability", "statistics", "statistical",
    "optimise", "optimize", "logic", "math", "mathematical", "estimate", "quantify", "analyse",
    "analyze", "analysis", "infer", "deduce",
}


def classify(ctx: Context) -> str:
    return VERIFY if ctx.role == "e" else classify_text(ctx.instruction)


def classify_text(text: str) -> str:
    lower = text.lower()
    if "```" in lower or "def " in lower or "fn " in lower:
        return CODE
    words = set(w for w in re.split(r"[^0-9a-z+#]+", lower) if w)
    if words & CODE_WORDS:
        return CODE
    if words & REASONING_WORDS:
        return REASONING
    return GENERAL


# Lineages recognised by name, whatever prefix the id carries. First match wins. The last
# two are additions for the providers the desk talks to directly.
FAMILIES = [
    ("openai", ("gpt-oss", "gpt")),
    ("qwen", ("qwen", "qwq")),
    ("deepseek", ("deepseek",)),
    ("llama", ("llama",)),
    ("mistral", ("mistral", "mixtral", "codestral", "magistral", "devstral", "ministral", "pixtral")),
    ("gemma", ("gemma",)),
    ("phi", ("phi-",)),
    ("glm", ("glm",)),
    ("kimi", ("kimi", "moonshot")),
    ("cohere", ("command", "aya")),
    ("granite", ("granite",)),
    ("nemotron", ("nemotron",)),
    ("anthropic", ("claude",)),
    ("google", ("gemini",)),
]


def family(model: str) -> str:
    """A model's lineage: by name when recognised (a name that STARTS with a lineage wins,
    so DeepSeek-…-Distill-Qwen is DeepSeek's), else its organisation, else its first word.
    Two models of one family are not independent judges of each other."""
    lower = model.split(":")[0].lower()
    name = lower.rsplit("/", 1)[-1]
    if re.match(r"o\d+(-|$)", name):                     # OpenAI's o-series (o3, o4-mini)
        return "openai"
    for anywhere in (False, True):
        for fam, cues in FAMILIES:
            if any((c in name) if anywhere else name.startswith(c) for c in cues):
                return fam
    parts = lower.split("/")
    if len(parts) > 1:                                    # the organisation: the part before the name
        return parts[-2]
    return re.split(r"[-._]", name)[0].rstrip("0123456789")


NOT_CHAT = ("embed", "rerank", "whisper", "large-v", "tts", "kokoro", "voice", "speech", "audio",
            "bge-", "e5-", "clip", "guard", "image", "stable-diffusion", "flux", "mineru", "ocr",
            "fim", "knowledge-", "transcribe", "realtime", "moderation", "dall-e", "sora", "lyria",
            "live", "search", "babbage", "davinci", "robotics", "computer-use", "banana", "aqa",
            "deep-research", "instruct-0914", "gpt-3.5-turbo-instruct")


def is_chat(model: str) -> bool:
    m = model.lower()
    return not any(x in m for x in NOT_CHAT)


def model_specialty(model: str) -> str:
    m = model.lower()
    if any(x in m for x in ("coder", "code", "codestral", "devstral", "starcoder")):
        return CODE
    if any(x in m for x in ("-r1", "r1-", "thinking", "qwq", "reason", "magistral", "math")):
        return REASONING
    return GENERAL


def size_b(model: str) -> float:
    """Parameters in billions read from the name (72b, 235B-A22B → 235, 8x22b → 176), else 0."""
    m = model.lower()
    best = 0.0
    for match in re.finditer(r"(?<![0-9a-z.])(\d+(?:\.\d+)?)(x(\d+(?:\.\d+)?)b(?![a-z])|b(?![a-z])|t(?![a-z]))", m):
        num = float(match.group(1))
        if match.group(3):
            best = max(best, num * float(match.group(3)))
        elif match.group(2) == "b":
            best = max(best, num)
        elif match.group(2) == "t":
            best = max(best, num * 1000)
    return best


@dataclass
class Pool:
    code: List[str] = field(default_factory=list)
    reasoning: List[str] = field(default_factory=list)
    general: List[str] = field(default_factory=list)
    verify: List[str] = field(default_factory=list)

    def list(self, s: str) -> List[str]:
        return getattr(self, s)

    @staticmethod
    def single(model: str) -> "Pool":
        return Pool([model], [model], [model], [model])

    @staticmethod
    def from_catalog(ids: List[str]) -> "Pool":
        """Chat models only, by specialty, largest first; code and reasoning fall back to
        general; verify alternates families so a check can always leave the producer's."""
        chat = sorted((m for m in ids if is_chat(m)), key=lambda m: (-size_b(m), m))
        of = lambda s: [m for m in chat if model_specialty(m) == s]
        general = of(GENERAL)
        code = of(CODE) + general
        reasoning = of(REASONING) + general
        by_family: Dict[str, List[str]] = {}
        for m in [m for m in chat if model_specialty(m) != CODE] + [m for m in chat if model_specialty(m) == CODE]:
            by_family.setdefault(family(m), []).append(m)
        verify, round_ = [], 0
        while True:
            row = [ms[round_] for ms in by_family.values() if round_ < len(ms)]
            if not row:
                break
            verify += row
            round_ += 1
        return Pool(code, reasoning, general, verify)

    def overlay(self, over: "Pool") -> "Pool":
        return Pool(*(theirs or mine for mine, theirs in
                      ((self.code, over.code), (self.reasoning, over.reasoning),
                       (self.general, over.general), (self.verify, over.verify))))

    def models(self) -> List[str]:
        seen: List[str] = []
        for s in SPECIALTIES:
            seen += [m for m in self.list(s) if m not in seen]
        return seen


# --------------------------------------------------------------------------- the routed proposer

class ChatError(Exception):
    """A failed call, worded 'HTTP <code>: <detail>' when the provider answered."""


class Backend(Protocol):
    async def chat(self, model: str, system: str, user: str) -> str: ...


def provider_of(model: str) -> str:
    return model.split("/", 1)[0]


# Providers word an empty balance differently and with different codes (Anthropic 400,
# OpenAI 429, Hugging Face 402), so the text decides, not only the code. A quota on ONE
# model (Gemini's free tier excludes Pro: 429 "exceeded your current quota") drops that
# model, not the provider.
NO_CREDIT = ("credit balance", "credit_balance", "insufficient_quota", "no credits", "no remaining credits")


def refusal(e: str) -> Optional[str]:
    """'account' (switch the provider off), 'model' (drop this model), or None (try again later)."""
    low = e.lower()
    if e.startswith(("HTTP 401", "HTTP 402", "HTTP 403")) or any(w in low for w in NO_CREDIT):
        return "account"
    if e.startswith("HTTP 429") and "quota" in low:
        return "model"
    if e.startswith("HTTP 4") and not e.startswith("HTTP 429"):
        return "model"
    return None


@dataclass
class Usage:
    calls: int = 0
    failures: int = 0


class RoutedProposer:
    def __init__(self, pool: Pool, backend: Backend, *, crowd: int = 1, max_tries: int = 3,
                 live: Optional[Set[str]] = None, local: Optional[str] = None,
                 blocked: Optional[Dict[str, str]] = None):
        self.pool = pool
        self.backend = backend
        self.crowd = max(1, crowd)
        self.max_tries = max_tries
        self.live = live                      # models the providers currently serve, if known
        self.local = local                    # last resort, e.g. "ollama/qwen2.5:7b"
        self.dead: Set[str] = set()
        self.blocked: Dict[str, str] = dict(blocked or {})   # provider -> why its account was refused
        self.usage: Dict[str, Usage] = {}
        self.last = ""

    def candidates(self, s: str, avoid: Set[str]) -> List[str]:
        """Live, not dropped, provider not refused, and not of an avoided family. If avoidance
        leaves nothing it is waived: a check by a related model beats no check."""
        usable = [m for m in self.pool.list(s)
                  if m not in self.dead and provider_of(m) not in self.blocked
                  and (self.live is None or m in self.live)]
        independent = [m for m in usable if family(m) not in avoid]
        return independent or usable

    async def _ask(self, model: str, ctx: Context, user: str, label: Optional[str] = None) -> Proposal:
        label = label or model
        u = self.usage.setdefault(label, Usage())
        u.calls += 1
        try:
            reply = await self.backend.chat(model, SYSTEM, user)
            p = parse_reply(reply, ctx.role)
        except (ChatError, ReplyError) as e:
            u.failures += 1
            if isinstance(e, ChatError) and label == model:
                self._note(model, str(e))
            raise
        for c in p.chunks:
            c.by = label
        return p

    def _note(self, model: str, msg: str) -> None:
        kind = refusal(msg)
        if kind == "account":
            credit = msg.startswith("HTTP 402") or any(w in msg.lower() for w in NO_CREDIT)
            self.blocked[provider_of(model)] = "the account has no credits left" if credit else clip(msg, 200)
        elif kind == "model":
            self.dead.add(model)

    async def ask_json(self, spec: str, system: str, user: str) -> Tuple[str, dict]:
        """One JSON object from the pool for a non-trie caller (e.g. reading a form), with the
        same order, failover and refusals as `propose`; the local model last."""
        from backend.primitive.proposal import extract_json, strip_thinking
        errors: List[str] = []
        models = self.candidates(spec, set())[:self.max_tries] + ([self.local] if self.local else [])
        for m in models:
            if provider_of(m) in self.blocked:
                continue
            u = self.usage.setdefault(m, Usage())
            u.calls += 1
            try:
                v = extract_json(strip_thinking(await self.backend.chat(m, system, user)))
            except ChatError as e:
                u.failures += 1
                self._note(m, str(e))
                errors.append(f"{m}: {clip(str(e), 160)}")
                continue
            if v is None:
                u.failures += 1
                errors.append(f"{m}: no JSON object in the reply")
                continue
            self.last = m
            return m, v
        errors += [f"{p} refused the account: {why}" for p, why in self.blocked.items()]
        raise ChatError("; ".join(errors) or "no usable model in the pool")

    async def propose(self, ctx: Context) -> Proposal:
        spec = classify(ctx)
        avoid = {family(b) for i in ctx.inputs if i.role == "t" for b in i.by}
        user = render(ctx)
        errors: List[str] = []
        first = None
        for m in self.candidates(spec, avoid)[:self.max_tries]:
            if provider_of(m) in self.blocked:
                continue
            try:
                first = (m, await self._ask(m, ctx, user))
                break
            except (ChatError, ReplyError) as e:
                errors.append(f"{m}: {clip(str(e), 160)}")
        if first is None:
            errors += [f"{p} refused the account: {why}" for p, why in self.blocked.items()]
            if self.local:
                try:
                    p = await self._ask(self.local, ctx, user, label=f"local:{self.local}")
                    self.last = f"local:{self.local}"
                    return p
                except (ChatError, ReplyError) as e:
                    errors.append(f"local: {clip(str(e), 160)}")
            raise ChatError("; ".join(errors) or "no usable model in the pool")

        model, proposal = first
        used = [model]
        if proposal.kind == "realise" and spec == VERIFY and self.crowd > 1:
            avoid.add(family(model))
            for m in [m for m in self.candidates(VERIFY, avoid) if family(m) not in avoid]:
                if len(used) >= self.crowd:
                    break
                if provider_of(m) in self.blocked:
                    continue
                try:
                    extra = await self._ask(m, ctx, user)
                except (ChatError, ReplyError):
                    continue
                if extra.kind == "realise":
                    proposal.chunks += extra.chunks
                    avoid.add(family(m))
                    used.append(m)
        self.last = "+".join(used)
        return proposal

    def name(self) -> str:
        return self.last or "routed"

    def usage_lines(self) -> List[str]:
        return [f"{m}: {u.calls} call(s), {u.failures} failed" for m, u in sorted(self.usage.items())]
