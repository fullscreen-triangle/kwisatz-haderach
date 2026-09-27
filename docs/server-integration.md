# Put Agent Smith on a VM — turnkey

Two scripts. No decisions, no reading about optional parts.

## For your friend (the person with the VM)

He needs exactly two things from you, and does two things with them:

1. **Add your SSH public key** to the VM (paste it into the provider's "SSH keys"
   box when creating the VM, or append it to `~/.ssh/authorized_keys`).
2. **Paste this one line into a fresh Ubuntu/Debian VM** (as root or with sudo):

   ```bash
   curl -fsSL https://raw.githubusercontent.com/fullscreen-triangle/kwisatz-haderach/main/deploy/vm-install.sh | sudo bash
   ```

That's the whole job. The script installs everything, starts it as a service that
survives reboots, and prints a URL like `http://<vm-ip>:8000`. He sends that URL back.

## For you (Kundai), once

Generate the deploy key and get the two copy-paste blocks to send him:

```bash
bash deploy/make-deploy-key.sh
```

It creates a dedicated key at `~/.ssh/agent_smith_deploy` (the private half never
leaves your machine) and prints the public key + the install one-liner. Copy both
into a message to your friend.

Later, log into his VM with:

```bash
ssh -i ~/.ssh/agent_smith_deploy smith@<vm-ip>
```

## What it runs

`deploy/vm-install.sh` installs Python + git, creates a `smith` service user, clones
the repo, builds the venv from `backend/requirements-core.txt`, installs a hardened
`systemd` unit, and starts `uvicorn backend.main:app` on `:8000`. The `/intent`
round-trip, `facts`, `web` links, and the `doctor` self-check all work out of the box.

Verify from anywhere once it's up:

```bash
curl -sL -X POST http://<vm-ip>:8000/intent/ \
  -H 'Content-Type: application/json' -d '{"text":"status"}'
```

A `"kind":"doctor"` slice comes back with a green/amber checklist.

---

<details>
<summary>Optional extras (nobody needs these to start)</summary>

The base install intentionally leaves out the Rust search organs (`purpose`,
`spraypaint`), Ollama summaries, and public HTTPS/TLS. None are required — the node
reports them as "not installed" via the `doctor` routine and keeps working. If you
later want them on the server, SSH in as `smith` and:

- **Search organs:** `bash backend/install-organs.sh`
- **Ollama summaries:** `curl -fsSL https://ollama.com/install.sh | sh && ollama pull llama3.2:3b`
- **HTTPS + a domain:** put Caddy in front (`reverse_proxy 127.0.0.1:8000`) and bind
  uvicorn to `127.0.0.1` instead of `0.0.0.0` in the systemd unit.
- **Credentials** (Garmin, GitHub token, etc.): `bash backend/manage-secrets.sh set KEY`

</details>
