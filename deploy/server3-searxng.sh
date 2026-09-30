#!/usr/bin/env bash
#
# server-3 — a private SearXNG (meta-search) for Agent Smith's web search. Idempotent.
#
#     ssh server3 'bash -s' < deploy/server3-searxng.sh
#
# SearXNG publishes on 127.0.0.1:8080 ONLY: server-3 has no firewall, so nothing here is
# bound to a public address. server-2 reaches it through an ssh tunnel whose key may do
# nothing but forward to that port (deploy/server2-harare.sh sets up its side).
# JSON output is enabled (the harare `web` module reads it); the rate limiter is off
# because the only client is that tunnel.

set -euo pipefail
say() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }

D=/srv/searxng
install -d -m 755 "$D"

# Engines: from server-3's datacenter address duckduckgo and qwant answer with a CAPTCHA and
# brave suspends for "too many requests" (measured 2026-09-30), so they are dropped; each
# remaining one was checked to return results for a real query. They are disabled, not
# removed: `remove: [qwant]` kills the workers (the qwant news/images engines load from it).
# The secret key survives a rewrite.
SECRET=$(sed -n 's/^ *secret_key: *"\(.*\)"/\1/p' "$D/settings.yml" 2>/dev/null || true)
[ -n "$SECRET" ] || SECRET=$(openssl rand -hex 32)
say "settings.yml"
cat > "$D/settings.yml" <<YML
use_default_settings: true
engines:
  - name: duckduckgo
    disabled: true
  - name: qwant
    disabled: true
  - name: brave
    disabled: true
  - name: bing
    disabled: false
  - name: yahoo
    disabled: false
  - name: mojeek
    disabled: false
  - name: startpage
    disabled: false
server:
  secret_key: "$SECRET"
  limiter: false
  image_proxy: false
  public_instance: false
search:
  safe_search: 0
  formats: [html, json]
ui:
  static_use_hash: true
YML

say "container"
docker pull -q searxng/searxng:latest >/dev/null
docker rm -f searxng >/dev/null 2>&1 || true
docker run -d --name searxng --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v "$D/settings.yml:/etc/searxng/settings.yml:ro" \
  -e SEARXNG_BASE_URL=http://127.0.0.1:8080/ \
  searxng/searxng:latest >/dev/null

for i in $(seq 1 30); do
  curl -fsS -o /dev/null "http://127.0.0.1:8080/healthz" 2>/dev/null && break
  sleep 1
done
say "listening (must be 127.0.0.1 only):"
ss -ltn | awk '$4 ~ /:8080$/ {print "  " $4}'
n=$(curl -fsS "http://127.0.0.1:8080/search?q=greifswald&format=json" | python3 -c 'import json,sys; print(len(json.load(sys.stdin).get("results", [])))')
say "test query returned $n results"
