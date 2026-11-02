#!/usr/bin/env bash
# Run from the repo root on the laptop (Git Bash):   bash deploy/desk-tools.sh
#
# Puts the desk's tools on server-2 and its keys in place, in one go:
#   1. copies the code of the keeper, models (primitive), working memory, forms, brief,
#      spectacular views and forges to /srv/agent-smith (the files it replaces are saved to
#      /root/agent-smith-before-desk-tools.tgz first);
#   2. rebuilds and restarts the services (deploy/server2-services.sh);
#   3. moves every key in web/.env.local that differs from the vault into the vault, each
#      only after its provider accepts it, and pushes the vault — with the forge tokens from
#      the Git group — to the server. KeePassXC's master password is asked here.
set -euo pipefail
cd "$(dirname "$0")/.."

PATHS=(
  backend/keeper/apikeys.py backend/keeper/probes.py backend/keeper/registry.py
  backend/primitive backend/memory backend/forms backend/forges.py backend/briefing.py
  backend/routes/primitive.py backend/routes/forms.py backend/routes/console.py backend/main.py
  web/pages/desk/console.js web/pages/desk/forms.js web/pages/desk/forges.js web/pages/desk/keys.js
  web/components/console/TaskPanel.js web/components/console/View.js
  web/pages/api/desk/primitive web/pages/api/desk/forms web/pages/api/desk/console
  web/public/vendor/spectacular
)
HOST="${KEEPER_HOST:-olduvai}"

echo "1/3  copying the code to $HOST"
tar -cf - --exclude='__pycache__' "${PATHS[@]}" | ssh "$HOST" 'set -e; cd /srv/agent-smith
  tar -czf /root/agent-smith-before-desk-tools.tgz backend/main.py backend/keeper backend/routes/console.py \
      web/pages/desk/console.js web/pages/desk/keys.js
  tar -xf - --no-same-owner
  chown -R smith:smith backend web/pages web/components web/public/vendor
  echo "     copied; the replaced files are in /root/agent-smith-before-desk-tools.tgz"'

echo "2/3  rebuilding and restarting the services (a few minutes: next build)"
ssh "$HOST" 'bash -s' < deploy/server2-services.sh

echo "3/3  keys: web/.env.local -> vault (checked with each provider) -> server"
python -m tools.keeper renew --from-env --no-browser --push-anyway --host "$HOST"
echo
echo "Done. Open https://server-2.tail48bcc9.ts.net/desk/console — models, forms (/desk/forms), repos (/desk/forges)."
