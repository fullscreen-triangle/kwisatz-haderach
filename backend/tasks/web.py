"""
Opening a link for the agent.

Only public addresses: every hop of a redirect is resolved and refused if it lands on a
loopback, private, link-local or reserved address — mail links must never reach the node's
own unauthenticated services (127.0.0.1:8000 and friends). Responses are capped in size.

A PDF is returned as bytes; a page as its title, text and links (PDF links flagged); a page
that asks for a password is reported as needing a login rather than read.
"""

from __future__ import annotations

import asyncio
import ipaddress
import re
import socket
from dataclasses import dataclass, field
from typing import List, Optional
from urllib.parse import urljoin, urlparse

import httpx

MAX_BYTES = 25 * 1024 * 1024
MAX_HOPS = 5
UA = "Mozilla/5.0 (X11; Linux x86_64) AgentSmith/1.0 (personal assistant fetching a link from my own mail)"


class Refused(Exception):
    pass


@dataclass
class Fetched:
    url: str
    status: int
    ctype: str
    data: bytes = b""
    title: str = ""
    text: str = ""
    links: List[dict] = field(default_factory=list)
    login: bool = False
    filename: str = ""

    @property
    def is_pdf(self) -> bool:
        return "pdf" in self.ctype or self.data[:5] == b"%PDF-"


async def _public(host: str) -> None:
    try:
        infos = await asyncio.get_running_loop().getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror:
        raise Refused(f"{host} does not resolve")
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if not ip.is_global or ip.is_multicast:
            raise Refused(f"{host} is not a public address ({ip}) — the desk does not open those")


def links_in_html(html: str, base: str) -> List[dict]:
    out, seen = [], set()
    for m in re.finditer(r"<a\b[^>]*?href\s*=\s*[\"']([^\"']+)[\"'][^>]*>(.*?)</a>", html, re.I | re.S):
        href = m.group(1).strip()
        if href.startswith(("mailto:", "tel:", "javascript:", "#")):
            continue
        url = urljoin(base, href)
        if url in seen or not url.startswith(("http://", "https://")):
            continue
        seen.add(url)
        text = re.sub(r"<[^>]+>", " ", m.group(2))
        out.append({"url": url, "text": " ".join(text.split())[:120],
                    "pdf": url.lower().split("?")[0].endswith(".pdf")})
    return out


def links_in_text(text: str) -> List[dict]:
    seen, out = set(), []
    for u in re.findall(r"https?://[^\s<>\"')\]]+", text):
        u = u.rstrip(".,;:")
        if u not in seen:
            seen.add(u)
            out.append({"url": u, "text": "", "pdf": u.lower().split("?")[0].endswith(".pdf")})
    return out


def _text_of_html(html: str) -> str:
    html = re.sub(r"(?is)<(script|style|head|nav|footer)\b.*?</\1>", " ", html)
    text = re.sub(r"(?s)<[^>]+>", "\n", html)
    for a, b in (("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", '"'), ("&#39;", "'")):
        text = text.replace(a, b)
    return re.sub(r"\n\s*\n+", "\n", re.sub(r"[ \t]+", " ", text)).strip()


async def fetch(url: str, client: Optional[httpx.AsyncClient] = None) -> Fetched:
    own = client is None
    client = client or httpx.AsyncClient(timeout=45, headers={"User-Agent": UA})
    try:
        for _ in range(MAX_HOPS + 1):
            p = urlparse(url)
            if p.scheme not in ("http", "https") or not p.hostname:
                raise Refused(f"not a web address: {url}")
            await _public(p.hostname)
            async with client.stream("GET", url, follow_redirects=False) as r:
                if r.status_code in (301, 302, 303, 307, 308) and r.headers.get("location"):
                    url = urljoin(url, r.headers["location"])
                    continue
                chunks, size = [], 0
                async for c in r.aiter_bytes():
                    size += len(c)
                    if size > MAX_BYTES:
                        raise Refused(f"{url} is larger than {MAX_BYTES // 2**20} MB")
                    chunks.append(c)
                data = b"".join(chunks)
                ctype = r.headers.get("content-type", "").lower()
                disp = r.headers.get("content-disposition", "")
                name = (re.search(r'filename\*?=(?:UTF-8\'\')?"?([^";]+)', disp) or [None, ""])[1] or \
                    p.path.rsplit("/", 1)[-1] or p.hostname
                f = Fetched(url, r.status_code, ctype, data, filename=name)
                if r.status_code in (401, 403):
                    f.login = True
                if not f.is_pdf and ("html" in ctype or data[:200].lstrip().lower().startswith((b"<!doctype", b"<html"))):
                    html = data.decode(r.encoding or "utf-8", errors="replace")
                    t = re.search(r"(?is)<title[^>]*>(.*?)</title>", html)
                    f.title = " ".join(t.group(1).split()) if t else ""
                    f.text = _text_of_html(html)
                    f.links = links_in_html(html, url)
                    f.login = f.login or bool(re.search(r"(?i)<input[^>]+type\s*=\s*[\"']?password", html))
                    f.data = b""
                return f
        raise Refused(f"more than {MAX_HOPS} redirects")
    finally:
        if own:
            await client.aclose()
