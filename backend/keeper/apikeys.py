"""
Plain API keys — one catalogue, shared by the server's probes and the laptop's
`python -m tools.keeper check|renew`, so both ask the provider the same question and read
the answer the same way.

Stdlib only: the laptop imports this without the backend's dependencies.

None of these providers lets a key be renewed by API with the key itself, and most never
expire one. So the keeper can only do three things with them, and does all three:
  * ask the provider, live, whether the key works (a free call where one exists);
  * read an expiry when the provider reports one, else use the vault entry's Expires date;
  * make renewal one command — `renew <id>` opens the provider's key page, takes the new
    key at a hidden prompt (or from web/.env.local), refuses it unless the provider
    accepts it, keeps the old value in the entry's history, and pushes.

A `Spec` splits a check into `request` (what to send) and `judge` (what the answer means),
both pure, so the transport differs per side (httpx on the server, urllib on the laptop)
while the verdict cannot. A verdict's `ok` is three-valued exactly as in probes.py:
True accepted, False rejected (a human must act), None couldn't tell.

Details are fixed sentences, never the provider's error text — OpenAI echoes a masked
fragment of the key in its 401 body.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Mapping, Optional, Tuple


@dataclass
class Request:
    method: str
    url: str
    headers: Dict[str, str] = field(default_factory=dict)
    params: Dict[str, str] = field(default_factory=dict)
    body: Optional[dict] = None


@dataclass
class Verdict:
    ok: Optional[bool]
    detail: str
    expires_at: Optional[datetime] = None


@dataclass(frozen=True)
class Spec:
    id: str                       # KeeperId — the join key with the vault entry
    title: str
    provider: str
    env: Tuple[str, ...]          # names the key may go by; all are exported, the first is canonical
    renew_url: str
    used_by: str
    interval: int                 # seconds between server probes
    request: Callable[[str, Mapping[str, str]], Request]
    judge: Callable[[int, Any], Verdict]

    def key(self, env: Mapping[str, str]) -> Optional[str]:
        return next((env[n] for n in self.env if env.get(n)), None)

    @property
    def env_spec(self) -> str:
        """The vault entry's Env attribute: its Password exported under every name."""
        return "; ".join(f"Password={n}" for n in self.env)


def _transient(code: int, who: str) -> Verdict:
    return Verdict(None, f"{who} answered HTTP {code}; will retry")


def _common(code: int, who: str, accepted: str = "key accepted") -> Verdict:
    if 200 <= code < 300:
        return Verdict(True, accepted)
    if code in (401, 403):
        return Verdict(False, f"{who} rejected the key — it was revoked, deleted or mistyped")
    return _transient(code, who)


def _parse_time(value: Any) -> Optional[datetime]:
    if value in (None, "", 0):
        return None
    try:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value / 1000 if value > 1e11 else value, timezone.utc)
        t = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return t if t.tzinfo else t.replace(tzinfo=timezone.utc)
    except (ValueError, OverflowError, OSError):
        return None


def _find_expiry(obj: Any) -> Optional[datetime]:
    """The first expiry-like field anywhere in a JSON answer (providers name it differently)."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k.lower() in ("expiresat", "expires_at", "expires", "expiration", "expiry", "expirationdate"):
                t = _parse_time(v)
                if t:
                    return t
        for v in obj.values():
            t = _find_expiry(v)
            if t:
                return t
    elif isinstance(obj, list):
        for v in obj:
            t = _find_expiry(v)
            if t:
                return t
    return None


# --------------------------------------------------------------------------- providers

def _anthropic_req(key, env):
    return Request("GET", "https://api.anthropic.com/v1/models", params={"limit": "1"},
                   headers={"x-api-key": key, "anthropic-version": "2023-06-01"})


def _anthropic_judge(code, body):
    return _common(code, "Anthropic")


def _openai_req(key, env):
    return Request("GET", "https://api.openai.com/v1/models", headers={"Authorization": f"Bearer {key}"})


def _openai_judge(code, body):
    if code == 403:
        return Verdict(False, "OpenAI refused the key for this request (project permissions or region)")
    return _common(code, "OpenAI")


def _gemini_req(key, env):
    return Request("GET", "https://generativelanguage.googleapis.com/v1beta/models",
                   params={"pageSize": "1"}, headers={"x-goog-api-key": key})


def _gemini_judge(code, body):
    text = json.dumps(body) if not isinstance(body, str) else body
    if code == 400 and "expired" in text.lower():
        return Verdict(False, "Google says the key has expired")
    if code == 400 and "API_KEY_INVALID" in text:
        return Verdict(False, "Google rejected the key — it was deleted or mistyped")
    if code == 403:
        return Verdict(False, "Google refused the key — it is restricted, or the Generative Language "
                              "API is not enabled for its project")
    return _common(code, "Google")


def _hf_req(key, env):
    return Request("GET", "https://huggingface.co/api/whoami-v2", headers={"Authorization": f"Bearer {key}"})


def _hf_judge(code, body):
    if code != 200:
        return _common(code, "Hugging Face")
    body = body if isinstance(body, dict) else {}
    token = (body.get("auth") or {}).get("accessToken") or {}
    role = token.get("role") or "unknown role"
    who = body.get("name", "?")
    return Verdict(True, f"token accepted for {who} ({role})", _find_expiry(token))


def _deepseek_req(key, env):
    # The balance, not just the key: an empty account is the failure the other probes miss.
    return Request("GET", "https://api.deepseek.com/user/balance", headers={"Authorization": f"Bearer {key}"})


def _deepseek_judge(code, body):
    if code != 200 or not isinstance(body, dict):
        return _common(code, "DeepSeek")
    left = ", ".join(f"{b.get('total_balance')} {b.get('currency')}" for b in body.get("balance_infos") or [])
    if body.get("is_available") is False:
        return Verdict(False, f"DeepSeek accepted the key but the account has no balance left ({left or 'none'})")
    return Verdict(True, f"key accepted · balance {left or 'unknown'}")


def _you_req(key, env):
    # No free key check exists: this is one real search, hence the 12 h interval.
    return Request("POST", "https://ydc-index.io/v1/search", headers={"X-API-Key": key},
                   body={"query": "keeper key check", "count": 1})


def _you_judge(code, body):
    if code == 402:
        return Verdict(False, "You.com accepted the key but the account is out of credit")
    return _common(code, "You.com")


def _mapbox_req(key, env):
    return Request("GET", "https://api.mapbox.com/tokens/v2", params={"access_token": key})


def _mapbox_judge(code, body):
    status = body.get("code") if isinstance(body, dict) else None
    if status == "TokenValid":
        return Verdict(True, "token valid", _find_expiry(body.get("token")))
    if status == "TokenExpired":
        return Verdict(False, "Mapbox says the token has expired")
    if status in ("TokenInvalid", "TokenMalformed", "TokenRevoked"):
        return Verdict(False, "Mapbox rejected the token")
    return _common(code, "Mapbox") if code >= 300 else _transient(code, "Mapbox")


def _owm_req(key, env):
    return Request("GET", "https://api.openweathermap.org/data/2.5/weather",
                   params={"lat": env.get("HOME_LATITUDE") or "0", "lon": env.get("HOME_LONGITUDE") or "0",
                           "appid": key})


def _owm_judge(code, body):
    if code == 401:
        return Verdict(False, "OpenWeather rejected the key (a brand-new key takes a few hours to activate)")
    return _common(code, "OpenWeather")


KEYS: List[Spec] = [
    Spec("anthropic", "Claude (Anthropic API)", "Anthropic", ("ANTHROPIC_API_KEY", "CLAUDE_API_KEY"),
         "https://console.anthropic.com/settings/keys", "console models, deep: runs", 30 * 60,
         _anthropic_req, _anthropic_judge),
    Spec("openai", "OpenAI API", "OpenAI", ("OPENAI_API_KEY",),
         "https://platform.openai.com/api-keys", "console models", 30 * 60, _openai_req, _openai_judge),
    Spec("gemini", "Gemini API", "Google AI Studio", ("GEMINI_API_KEY", "GOOGLE_API_KEY"),
         "https://aistudio.google.com/apikey", "console models", 30 * 60, _gemini_req, _gemini_judge),
    Spec("deepseek", "DeepSeek API", "DeepSeek", ("DEEPSEEK_API_KEY",),
         "https://platform.deepseek.com/api_keys", "console models", 30 * 60, _deepseek_req, _deepseek_judge),
    Spec("huggingface", "Hugging Face", "Hugging Face", ("HF_TOKEN", "HUGGINGFACE_API_KEY"),
         "https://huggingface.co/settings/tokens", "console models (Inference Providers)", 30 * 60,
         _hf_req, _hf_judge),
    Spec("you", "You.com search", "You.com", ("YDC_API_KEY", "YOU_API_KEY"),
         "https://you.com/platform/api-keys", "web search", 12 * 3600, _you_req, _you_judge),
    Spec("mapbox", "Mapbox", "Mapbox", ("MAPBOX_API_KEY",),
         "https://console.mapbox.com/account/access-tokens/", "maps", 6 * 3600, _mapbox_req, _mapbox_judge),
    Spec("openweather", "OpenWeather", "OpenWeather", ("OPENWEATHER_API_KEY",),
         "https://home.openweathermap.org/api_keys", "weather", 6 * 3600, _owm_req, _owm_judge),
]
BY_ID: Dict[str, Spec] = {s.id: s for s in KEYS}


def missing_detail(spec: Spec) -> str:
    return f"{spec.env[0]} not on the node — python -m tools.keeper import (or renew {spec.id}), then push"


def check(spec: Spec, key: str, env: Mapping[str, str] = {}, timeout: float = 20) -> Verdict:
    """Blocking check for the laptop (urllib, no dependencies)."""
    r = spec.request(key, env)
    url = r.url + ("?" + urllib.parse.urlencode(r.params) if r.params else "")
    data = json.dumps(r.body).encode() if r.body is not None else None
    headers = dict(r.headers, **({"Content-Type": "application/json"} if data else {}))
    headers.setdefault("User-Agent", "agent-smith-keeper")
    req = urllib.request.Request(url, data=data, headers=headers, method=r.method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code, raw = resp.status, resp.read()
    except urllib.error.HTTPError as e:
        code, raw = e.code, e.read()
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return Verdict(None, f"could not reach {spec.provider} ({type(e).__name__}); will retry")
    try:
        body = json.loads(raw or b"null")
    except ValueError:
        body = raw.decode(errors="replace")
    return spec.judge(code, body)
