#!/usr/bin/env bash
#
# Run this ONCE on YOUR machine (Kundai's). It:
#   - generates a dedicated SSH keypair just for this deployment
#     (a throwaway key — never reuse your personal one)
#   - prints the PUBLIC key + the exact two things to send your friend
#
# The private half stays on your machine and never leaves it. Your friend
# never sees it. You SSH in with it later if you ever need to.
#
#   bash deploy/make-deploy-key.sh
#
# If you don't even need SSH access (the installer is self-contained and your
# friend runs it himself), you can skip this entirely — you only need a key if
# YOU want to log into his VM afterwards.

set -euo pipefail

KEY="${HOME}/.ssh/agent_smith_deploy"
INSTALL_URL="https://raw.githubusercontent.com/fullscreen-triangle/kwisatz-haderach/main/deploy/vm-install.sh"

mkdir -p "${HOME}/.ssh"
chmod 700 "${HOME}/.ssh"

if [ -f "${KEY}" ]; then
  echo "Key already exists at ${KEY} — reusing it."
else
  ssh-keygen -t ed25519 -f "${KEY}" -N "" -C "agent-smith-deploy"
  echo "Created ${KEY} (private) + ${KEY}.pub (public)."
fi

PUB="$(cat "${KEY}.pub")"

cat <<MSG

======================================================================
Send your friend these TWO things. Nothing else. No reading required.
======================================================================

1) Add this public key to the VM so Kundai can SSH in
   (paste it into the provider's "SSH keys" box when creating the VM,
    OR append it to ~/.ssh/authorized_keys on the VM):

${PUB}

2) After the VM is up, paste this ONE line into it (as root/sudo):

curl -fsSL ${INSTALL_URL} | sudo bash

----------------------------------------------------------------------
It will finish by printing a URL like  http://<vm-ip>:8000  — send that
URL back to Kundai. That's the whole job.

You (Kundai) can log in anytime with:
   ssh -i ${KEY} smith@<vm-ip>
======================================================================
MSG
