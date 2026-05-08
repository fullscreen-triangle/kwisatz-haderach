"""
GitHub repo inventory.

Authenticates with GITHUB_TOKEN env var (read-only fine-grained PAT is enough).
Fetches all repos for a given user/org, including description, topics, language,
stars, size, last push, default branch, and the README content for each repo.

Output: a JSON file at output/inventory.json with one entry per repo.
"""

from __future__ import annotations

import base64
import json
import os
import sys
import time
from dataclasses import dataclass, asdict, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests


GITHUB_API = "https://api.github.com"
USER_AGENT = "kwisatz-haderach/github-manager"


@dataclass
class RepoInfo:
    name: str
    full_name: str
    description: str
    topics: List[str]
    language: Optional[str]
    languages: Dict[str, int]   # bytes per language
    size_kb: int
    stargazers: int
    forks: int
    open_issues: int
    default_branch: str
    pushed_at: str
    created_at: str
    updated_at: str
    archived: bool
    fork: bool
    html_url: str
    readme: str = ""
    readme_truncated: bool = False
    error: str = ""


class GitHubClient:
    def __init__(self, token: Optional[str] = None):
        self.token = token
        self.session = requests.Session()
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": USER_AGENT,
        }
        # Token is OPTIONAL. Without it: 60 requests/hour rate limit, public
        # repos only. With it: 5000/hour, plus access to your private repos
        # if the token is scoped to read them. For most public-corpus
        # surveys the unauthenticated path is sufficient.
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self.session.headers.update(headers)

    def _get(self, url: str, params: Optional[Dict[str, Any]] = None) -> requests.Response:
        for attempt in range(3):
            r = self.session.get(url, params=params, timeout=30)
            if r.status_code == 200:
                return r
            if r.status_code == 403 and "rate limit" in r.text.lower():
                reset = int(r.headers.get("X-RateLimit-Reset", "0"))
                wait = max(reset - int(time.time()), 1) + 2
                print(f"  rate-limited; waiting {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            if r.status_code in (502, 503, 504):
                time.sleep(2 ** attempt)
                continue
            r.raise_for_status()
        r.raise_for_status()
        return r  # unreachable

    def list_user_repos(self, user: str, include_forks: bool = False) -> List[Dict[str, Any]]:
        repos: List[Dict[str, Any]] = []
        page = 1
        while True:
            url = f"{GITHUB_API}/users/{user}/repos"
            r = self._get(url, params={
                "per_page": 100, "page": page, "sort": "pushed", "direction": "desc",
            })
            batch = r.json()
            if not batch:
                break
            for repo in batch:
                if not include_forks and repo.get("fork"):
                    continue
                repos.append(repo)
            if len(batch) < 100:
                break
            page += 1
        return repos

    def get_languages(self, full_name: str) -> Dict[str, int]:
        try:
            r = self._get(f"{GITHUB_API}/repos/{full_name}/languages")
            return r.json()
        except Exception:
            return {}

    def get_readme(self, full_name: str, max_bytes: int = 200_000) -> tuple[str, bool]:
        """Returns (text, truncated). Returns ("", False) if no README."""
        try:
            r = self.session.get(f"{GITHUB_API}/repos/{full_name}/readme", timeout=30)
        except requests.RequestException:
            return "", False
        if r.status_code != 200:
            return "", False
        data = r.json()
        encoding = data.get("encoding", "")
        content = data.get("content", "")
        if encoding == "base64":
            try:
                raw = base64.b64decode(content).decode("utf-8", errors="replace")
            except Exception:
                return "", False
        else:
            raw = content
        if len(raw.encode("utf-8")) > max_bytes:
            return raw[:max_bytes], True
        return raw, False


def build_inventory(
    user: str,
    token: Optional[str],
    output_path: Path,
    include_forks: bool = False,
    skip_archived: bool = False,
) -> List[RepoInfo]:
    client = GitHubClient(token)
    if token:
        print("Authenticated mode (5000 req/hr).", file=sys.stderr)
    else:
        print("Unauthenticated mode (60 req/hr; public repos only).",
              file=sys.stderr)
    print(f"Fetching repo list for {user}...", file=sys.stderr)
    raw_repos = client.list_user_repos(user, include_forks=include_forks)
    print(f"  found {len(raw_repos)} repos", file=sys.stderr)

    inventory: List[RepoInfo] = []
    for i, repo in enumerate(raw_repos, 1):
        if skip_archived and repo.get("archived"):
            continue
        name = repo["name"]
        full_name = repo["full_name"]
        print(f"  [{i:3d}/{len(raw_repos)}] {name}", file=sys.stderr)

        languages = client.get_languages(full_name)
        readme_text, readme_truncated = client.get_readme(full_name)

        info = RepoInfo(
            name=name,
            full_name=full_name,
            description=repo.get("description") or "",
            topics=list(repo.get("topics") or []),
            language=repo.get("language"),
            languages=languages,
            size_kb=int(repo.get("size") or 0),
            stargazers=int(repo.get("stargazers_count") or 0),
            forks=int(repo.get("forks_count") or 0),
            open_issues=int(repo.get("open_issues_count") or 0),
            default_branch=repo.get("default_branch") or "main",
            pushed_at=repo.get("pushed_at") or "",
            created_at=repo.get("created_at") or "",
            updated_at=repo.get("updated_at") or "",
            archived=bool(repo.get("archived")),
            fork=bool(repo.get("fork")),
            html_url=repo.get("html_url") or "",
            readme=readme_text,
            readme_truncated=readme_truncated,
        )
        inventory.append(info)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as f:
        json.dump([asdict(r) for r in inventory], f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(inventory)} repos to {output_path}", file=sys.stderr)
    return inventory


def load_inventory(path: Path) -> List[RepoInfo]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return [RepoInfo(**d) for d in data]


def get_token() -> Optional[str]:
    """Return GITHUB_TOKEN if set, else None (unauthenticated mode is supported)."""
    token = os.environ.get("GITHUB_TOKEN")
    return token if token else None
