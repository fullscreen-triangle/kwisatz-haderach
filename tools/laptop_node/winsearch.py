"""
Content hits from the Windows Search index — the only thing on this laptop that already
knows what is INSIDE its PDFs and Word files. Reached through PowerShell's ADODB COM
object, so there is no pywin32 to install. The index is incomplete (Windows decides what
it crawls), so these hits add to the filename index, they never replace it.

Only folded search terms (letters and digits) reach the query, so nothing a user says can
escape the SQL string. System.ItemUrl gives the real path; System.ItemPathDisplay would
give the localised one ("C:\\Benutzer\\…\\Dokumente").
"""

from __future__ import annotations

import base64
import json
import re
import subprocess
import urllib.parse
from pathlib import Path
from typing import List

from tools.laptop_node import config
from tools.laptop_node.index import words

SCRIPT = r"""
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$c = New-Object -ComObject ADODB.Connection
$c.Open("Provider=Search.CollatorDSO;Extended Properties='Application=Windows';")
$rs = $c.Execute("SELECT TOP __K__ System.ItemUrl, System.Search.Rank, System.Size, System.DateModified FROM SystemIndex WHERE __SCOPE__ AND FREETEXT(*, '__Q__') ORDER BY System.Search.Rank DESC")
$out = @()
while (-not $rs.EOF) {
  $d = $rs.Fields.Item(3).Value
  $out += [pscustomobject]@{ url = [string]$rs.Fields.Item(0).Value; rank = [int]$rs.Fields.Item(1).Value;
                             size = [int64]$rs.Fields.Item(2).Value; mtime = if ($d) { ([DateTimeOffset]$d).ToUnixTimeSeconds() } else { 0 } }
  $rs.MoveNext()
}
$c.Close()
ConvertTo-Json -InputObject @($out) -Compress
"""


def search(q: str, k: int = 20, timeout: float = 20) -> List[dict]:
    ts = [re.sub(r"[^\w]", "", w) for w in words(q)]
    ts = [t for t in ts if t]
    if not ts:
        return []
    scope = " OR ".join(f"SCOPE='file:{r.as_posix()}'" for r in config.roots())
    script = (SCRIPT.replace("__K__", str(int(k))).replace("__SCOPE__", f"({scope})")
              .replace("__Q__", " ".join(ts)))
    enc = base64.b64encode(script.encode("utf-16-le")).decode()
    try:
        r = subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-EncodedCommand", enc],
                           capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout,
                           creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        rows = json.loads(r.stdout or "[]") if r.returncode == 0 else []
    except (subprocess.TimeoutExpired, ValueError, OSError):
        return []
    out = []
    for row in rows if isinstance(rows, list) else [rows]:
        url = row.get("url") or ""
        if not url.lower().startswith("file:"):
            continue
        p = Path(urllib.parse.unquote(url[5:]).replace("/", "\\"))
        if p.suffix == "" or config.denied(p) or not config.within_roots(p):
            continue
        out.append({"path": str(p), "name": p.name, "size": row.get("size") or 0,
                    "mtime": row.get("mtime") or 0, "rank": row.get("rank") or 0, "where": "content"})
    return out
