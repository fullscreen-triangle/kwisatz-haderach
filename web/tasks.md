# Setup Checklist — API Keys & Credentials

All values go into `web/.env.local` unless noted otherwise.
File is gitignored. Never commit it.

---

## DONE — already working

| Key | Where set | Notes |
|-----|-----------|-------|
| `ANTHROPIC_API_KEY` | `.env.local` | Job assistant, cover letters |
| `GMAIL_CLIENT_ID` | `.env.local` | Gmail OAuth client |
| `GMAIL_CLIENT_SECRET` | `.env.local` | Gmail OAuth client |
| `HOME_LATITUDE / LONGITUDE` | `.env.local` | Munich 48.1351, 11.5820 |
| `HOME_CITY`, `HOME_TZ` | `.env.local` | Munich / Europe/Berlin |
| `NEXT_PUBLIC_HOME_STATION` | `.env.local` | München Hbf |
| `NEXT_PUBLIC_HOME_STATION_ID` | `.env.local` | 8000261 |

---

## HIGH PRIORITY — features are broken without these

### 1. Garmin — health panel
```
GARMIN_EMAIL=
GARMIN_PASSWORD=
```
- Just your Garmin Connect login email and password.
- No registration needed — uses the unofficial `garminconnect` library already installed.
- What it unlocks: sleep stages, HRV, body battery, steps, stress, SpO₂ on the landing page and `/desk`.

### 2. Google Maps Embed API — map on landing page
```
GOOGLE_MAPS_KEY=AIzaSyDMyAS2jdzj-vdgBIFaIStYOWJtSlghndg
```
- The key is already hardcoded in `pages/landing.js` — you need to **activate** it.
- Go to: https://console.cloud.google.com → APIs & Services → Enable APIs
- Enable: **Maps Embed API** (not Maps JavaScript API — the embed one is free, no billing required for basic usage)
- Then: APIs & Services → Credentials → click the key → add `localhost:3000` and your production domain to allowed referrers.
- What it unlocks: the map section on the landing page showing Munich.

### 3. Gmail — complete OAuth flow
- You have the client ID/secret already.
- You still need to complete the OAuth consent screen and run the token exchange once.
- In Google Cloud Console: APIs & Services → OAuth consent screen → add your email as test user.
- Then load `/desk/inbox` in the browser — it will redirect you through the OAuth flow and save the token.
- What it unlocks: email intelligence, inbox section.

---

## MEDIUM PRIORITY — improves existing features

### 4. GitHub Personal Access Token — mentions feed
```
GITHUB_TOKEN=
```
- Go to: https://github.com/settings/tokens → Generate new token (classic)
- Scopes needed: `public_repo` read only (or just no scopes — public data only)
- What it unlocks: raises the GitHub API rate limit from 60/hr to 5000/hr for the mentions feed on the landing page.
  Without it, the mentions section still works but may hit rate limits.

### 5. Rewe Market ID — local store pricing
```
REWE_MARKET_ID=
```
- Go to https://shop.rewe.de in Chrome
- Open DevTools → Network → search for requests to `mobile-api.rewe.de`
- Look for `rd-market-id` header in any request, or find it in the URL params
- Alternatively: switch your delivery address to your Munich postcode in the Rewe app and check the selected market ID in the URL.
- What it unlocks: prices specific to your local Rewe store rather than generic national prices.

---

## LOWER PRIORITY — optional / extra features

### 6. Amazon PA API — prices in grocery optimizer
```
AMAZON_ACCESS_KEY=
AMAZON_SECRET_KEY=
AMAZON_PARTNER_TAG=
```
- Register free at: https://affiliate-program.amazon.de/ (Amazon Associates DE)
- Once approved (usually 24–48h), go to: Tools → Product Advertising API → Manage credentials
- Create credentials and copy Access Key + Secret Key
- Your Partner Tag is your Associates tracking ID (e.g. `yourtag-21`)
- What it unlocks: Amazon.de prices in the grocery search and optimizer.
  Without it, the tool still works — just shows Rewe, Kaufland, Penny only.

### 7. Coros Open API — second watch data source
```
COROS_CLIENT_ID=
COROS_CLIENT_SECRET=
```
- Register at: https://open.coros.com (Coros Open Platform)
- Create an application → get Client ID + Client Secret
- Redirect URI to set: `http://localhost:3000/api/auth/coros/callback`
- Note: Coros Open API is invite-only as of 2025 — you may need to request access.
- What it unlocks: Coros watch data (sleep, workouts, HR) as an alternative/complement to Garmin.
  The OAuth integration is built but requires credentials to activate.

---

## Jobcenter Integration — no API exists

There is no public API for Jobcenter / Arbeitsagentur.
Plan: manual tracker built into the desk tool.

**What to collect manually (no keys needed):**
- Your Kundennummer (on any letter from them)
- Next appointment date
- Deadlines: Weiterbewilligung, Eigenbewerber-Nachweise submission dates
- Your Sachbearbeiter name + direct number/email

These will go into a dedicated Jobcenter section in the desk once the account lockout is resolved.

**Account lockout — recovery steps:**
1. Go to https://www.arbeitsagentur.de → Einloggen
2. Click "Probleme beim Anmelden?" → try email/password fallback (passkeys don't replace password)
3. If fully locked: call **0800 4 5555 00** (free, Mon–Fri 8–18h) — they reset online access same-day
4. Or: visit Jobcenter München in person with your passport — counter staff can reset immediately

---

## Environment file template

Paste into `web/.env.local` and fill in the blanks:

```bash
# --- ALREADY SET (do not re-enter) ---
# ANTHROPIC_API_KEY=...
# GMAIL_CLIENT_ID=...
# GMAIL_CLIENT_SECRET=...

# --- HEALTH ---
GARMIN_EMAIL=
GARMIN_PASSWORD=

# --- MAPS ---
GOOGLE_MAPS_KEY=AIzaSyDMyAS2jdzj-vdgBIFaIStYOWJtSlghndg

# --- GITHUB ---
GITHUB_TOKEN=

# --- GROCERY ---
REWE_MARKET_ID=
AMAZON_ACCESS_KEY=
AMAZON_SECRET_KEY=
AMAZON_PARTNER_TAG=

# --- COROS (optional) ---
COROS_CLIENT_ID=
COROS_CLIENT_SECRET=
```

---

---

## Backend Infrastructure — Distributed Server Setup

### Architecture overview

```
Vercel (Next.js)
    │
    ▼ NEXT_PUBLIC_BACKEND_URL
Railway Router (always-on, free)        ← single stable URL, never changes
    │
    ├─▶ Chromebook :8000  (primary — Ollama + Garmin + bank CSV)
    ├─▶ Codespaces :8000  (overflow — spin up manually when needed)
    └─▶ Render/Fly :8000  (cold-start fallback for stateless routes)
```

Router picks the first backend that responds to `/ping`. Vercel never needs reconfiguring.

---

### Step 1 — Set up Chromebook backend (primary)

On Chromebook Linux terminal:

```bash
# Clone repo
git clone git@github.com:fullscreen-triangle/kwisatz-haderach.git
cd kwisatz-haderach

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the chat model (one-time, ~2 GB)
ollama pull llama3.2:3b

# Copy your .env.local into the repo root so backend can read Garmin creds
cp /path/to/.env.local .env.local

# Start everything (FastAPI + Ollama + Cloudflare tunnel)
bash backend/start.sh
```

The start script handles: venv creation, pip install, Ollama startup, tunnel, and FastAPI.

---

### Step 2 — Cloudflare Tunnel (makes Chromebook reachable from Vercel)

```bash
# Install cloudflared on Chromebook
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Create a free tunnel (no account needed for quick test):
cloudflared tunnel --url http://localhost:8000
# Prints: https://random-name.trycloudflare.com  ← copy this URL

# For a permanent named tunnel (requires free Cloudflare account):
# 1. cloudflared login
# 2. cloudflared tunnel create desk-chromebook
# 3. cloudflared tunnel route dns desk-chromebook desk.yourdomain.com
# 4. cloudflared tunnel run desk-chromebook
```

Set `CLOUDFLARE_TUNNEL_TOKEN` in your shell and `backend/start.sh` handles it automatically.

---

### Step 3 — Deploy Railway Router (one-time, permanent)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy router from repo root
cd router/
railway init          # creates new project called "desk-router"
railway up            # deploys using router/Dockerfile

# Set env vars on Railway dashboard (railway.app):
#   BACKEND_CHROMEBOOK = https://xxx.trycloudflare.com   (from Step 2)
#   BACKEND_CODESPACES = https://xxx-8000.app.github.dev  (fill when needed)
#   BACKEND_RENDER     = https://desk-backend.onrender.com (fill after Step 5)

# Get your Railway URL:
railway domain        # e.g. desk-router-production.up.railway.app
```

Paste that Railway URL into `web/.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=https://desk-router-production.up.railway.app
```
Then redeploy Vercel.

---

### Step 4 — Codespaces as overflow backend

When Chromebook is off or struggling:

1. Open GitHub → your repo → Code → Codespaces → New codespace
2. In the Codespaces terminal:
```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
3. Codespaces auto-creates a public port URL — copy it from the Ports tab
4. Update `BACKEND_CODESPACES` on Railway dashboard
5. Railway router automatically detects Chromebook is offline and switches

When done: stop the Codespace (don't delete, just stop — preserves state, stops billing hours).

---

### Step 5 — Render as stateless fallback (cold-start OK)

Render free tier sleeps after 15 min idle but restarts in ~30s on next request.
Good for: grocery search, weather proxy, anything that doesn't need Garmin/bank files.

```bash
# Push repo to GitHub (already done)
# Go to render.com → New → Web Service → connect your repo
# Settings:
#   Root directory: . (repo root)
#   Build command:  pip install -r backend/requirements.txt
#   Start command:  uvicorn backend.main:app --host 0.0.0.0 --port $PORT
#   Plan: Free

# Add env vars in Render dashboard:
#   PYTHONPATH = /opt/render/project/src

# Your Render URL: https://desk-backend.onrender.com
# Update BACKEND_RENDER on Railway
```

Alternatively use the `backend/render.yaml` — Render can auto-deploy from it.

---

### Step 6 — Wire Vercel frontend to the backend

In `web/pages/api/desk/chat.js` (create this file):

```js
export default async function handler(req, res) {
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!BACKEND) return res.status(503).json({ error: 'Backend not configured' });

  const resp = await fetch(`${BACKEND}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });
  const data = await resp.json();
  return res.status(resp.status).json(data);
}
```

Same pattern for `/api/desk/bank`, `/api/desk/jobcenter` — all proxy to `BACKEND_URL/*`.

---

### Step 7 — Install Ollama models (Chromebook)

```bash
# Recommended — fast, fits in 4 GB RAM
ollama pull llama3.2:3b

# Better reasoning — needs 8 GB RAM
ollama pull mistral:7b

# Multilingual (good for German) — needs 8 GB RAM
ollama pull qwen2.5:7b

# List installed models
ollama list

# Test from terminal
ollama run llama3.2:3b "What's the cheapest Rewe item for protein?"
```

---

### Backend env vars (set on Chromebook in .env.local, also set on Render/Fly)

```bash
# Already in web/.env.local — copy relevant ones to repo root .env.local
GARMIN_EMAIL=
GARMIN_PASSWORD=
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

---

### Files created

| File | Purpose |
|------|---------|
| `backend/main.py` | FastAPI app entry point |
| `backend/routes/health.py` | Garmin data endpoints |
| `backend/routes/grocery.py` | Price search + batch |
| `backend/routes/chat.py` | Ollama chat proxy |
| `backend/routes/bank.py` | CSV bank export parser |
| `backend/routes/jobcenter.py` | Manual Jobcenter tracker |
| `backend/requirements.txt` | Python deps |
| `backend/Dockerfile` | Container for Render/Fly |
| `backend/fly.toml` | Fly.io config (Frankfurt) |
| `backend/render.yaml` | Render auto-deploy config |
| `backend/start.sh` | Chromebook one-command launcher |
| `router/main.py` | Railway smart proxy |
| `router/requirements.txt` | Router deps (minimal) |
| `router/Dockerfile` | Router container |
| `router/railway.json` | Railway deploy config |

---

## Priority order for today

**Backend (do in order — each unlocks the next):**
1. [ ] `bash backend/start.sh` on Chromebook → FastAPI running on :8000
2. [ ] Run `cloudflared tunnel --url http://localhost:8000` → get public URL
3. [ ] Deploy Railway router (`cd router && railway up`) → get stable URL
4. [ ] Set `NEXT_PUBLIC_BACKEND_URL` in `web/.env.local` → redeploy Vercel
5. [ ] Set `BACKEND_CHROMEBOOK` on Railway dashboard → router finds Chromebook
6. [ ] Deploy Render fallback (connect repo on render.com, use `backend/render.yaml`)
7. [ ] Set `BACKEND_RENDER` on Railway dashboard → full failover working

**Keys (parallel with backend setup):**
8. [ ] Add `GARMIN_EMAIL` + `GARMIN_PASSWORD` → health panel works
9. [ ] Activate Google Maps key in Cloud Console → map shows on landing page
10. [ ] Complete Gmail OAuth flow in browser → inbox unlocks
11. [ ] Get `GITHUB_TOKEN` (5 min) → mentions feed becomes reliable
12. [ ] Recover Jobcenter account (call 0800 4 5555 00)
13. [ ] Amazon Associates registration (async, 1–2 days)
14. [ ] Rewe market ID (15 min with DevTools)

---

## Chromebook as GPU Workstation

The Chromebook sitting on your desk can be a real compute node — not just a thin client.
Best approach depends on what model it is, but the path below works for virtually all Chromebooks made after 2019.

### Step 0 — Identify your Chromebook

Open Chrome → address bar → type `chrome://system`
Look for:
- **Hardware class** — tells you the board name
- **CPU** — Intel or ARM?
- If Intel: likely has Intel UHD/Iris GPU → WebGPU works, Linux dev works fully
- If ARM (MediaTek, Snapdragon): limited — WebGPU may not work, Linux dev still works

Also check RAM: Settings → About ChromeOS → Diagnostics → Memory

---

### Step 1 — Enable Linux (Crostini) — takes 5 minutes

This is the foundation. It runs a real Debian container.

1. Settings → Advanced → Developers → **Linux development environment** → Turn on
2. Accept defaults (10 GB disk is fine to start, you can resize later)
3. A terminal opens. You now have a full Debian Linux environment.

Test it:
```bash
uname -a        # should show Linux
lscpu           # CPU info
free -h         # RAM
df -h           # disk
```

---

### Step 2 — Install your standard dev stack

```bash
# Update
sudo apt update && sudo apt upgrade -y

# Python + pip
sudo apt install -y python3 python3-pip python3-venv

# Node.js 20 (via nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node --version   # should print v20.x.x

# Git
sudo apt install -y git
git config --global user.name "fullscreen-triangle"
git config --global user.email "your@email.com"

# Useful tools
sudo apt install -y curl wget htop tmux unzip
```

---

### Step 3 — Clone your repos and run the portfolio locally

```bash
# SSH key for GitHub (do this once)
ssh-keygen -t ed25519 -C "chromebook"
cat ~/.ssh/id_ed25519.pub   # paste this into GitHub → Settings → SSH keys

# Clone portfolio
git clone git@github.com:fullscreen-triangle/kwisatz-haderach.git
cd kwisatz-haderach/web
npm install
npm run dev     # runs on localhost:3000
```

The Chromebook browser can open `localhost:3000` directly — Linux apps share the network with ChromeOS.

---

### Step 4 — GPU access (WebGPU in Chrome)

Your Chromebook's GPU is already accessible in Chrome — this is what powers all your WebGPU sandboxes.

**Check if WebGPU is working:**
1. Open Chrome → address bar → `chrome://gpu`
2. Look for: **WebGPU: Hardware accelerated** — if it says this, you're done
3. If it says "Software only": go to `chrome://flags` → search `WebGPU` → enable `Unsafe WebGPU` → relaunch

**Test it:**
Open the Chrome console on any page and run:
```js
const adapter = await navigator.gpu.requestAdapter();
console.log(adapter.info);  // should print GPU vendor/device
```

If this works, all your existing WebGPU tools (Crown Prince, Gas Giant, BRUT, etc.) run fully on the Chromebook GPU — open them in Chrome directly.

**For GPU compute from Linux (Python/CUDA):**
- Intel GPU → use **OpenCL** not CUDA: `sudo apt install intel-opencl-icd`
- ARM GPU → limited, no CUDA, WebGPU via Chrome only
- No NVIDIA on Chromebooks → PyTorch GPU acceleration requires the WebGPU path, not standard CUDA

---

### Step 5 — Use it as a remote compute node (most useful setup)

The Chromebook stays on your desk, plugged in, doing work while your main machine handles the IDE.

**Option A — SSH from your main machine to the Chromebook:**

On the Chromebook, in Linux terminal:
```bash
sudo apt install openssh-server
sudo service ssh start
# Get the IP
hostname -I
```

On your main Windows machine:
```bash
ssh user@192.168.x.x   # the IP from above
```

Now you can run Python jobs, `npm run dev`, etc. on the Chromebook from your main machine's terminal.

**Option B — VS Code Remote SSH:**
- Install VS Code on your main machine (already have it)
- Install the **Remote - SSH** extension
- Ctrl+Shift+P → "Remote-SSH: Connect to Host" → enter `user@192.168.x.x`
- You get a full VS Code editor running on the Chromebook's Linux environment
- GPU access still available through the browser on the Chromebook

**Option C — Run the Next.js dev server on Chromebook, access from anywhere on the LAN:**
```bash
# On Chromebook
cd kwisatz-haderach/web
npm run dev -- -H 0.0.0.0   # bind to all interfaces
```
Then from your main machine browser: `http://192.168.x.x:3000`

---

### Step 6 — Persistent background jobs (run Python tools headlessly)

```bash
# Install tmux (already done above) — keeps sessions alive after SSH disconnect
tmux new -s work

# Run a long Python job
python -m tools.grocery_tracker.price_lookup --query "Eier" --stores all

# Detach: Ctrl+B then D
# Reattach later: tmux attach -t work
```

---

### What the Chromebook is actually good for in your setup

| Use case | Works? | Notes |
|----------|--------|-------|
| Run Next.js dev server | ✅ | Free your main machine |
| Python data tools | ✅ | Full Python 3, pip, venv |
| WebGPU tools in Chrome | ✅ | Your GPU sandboxes work natively |
| GPU compute (CUDA) | ❌ | No NVIDIA GPU on Chromebooks |
| GPU compute (OpenCL/Intel) | ✅ (Intel only) | Lighter workloads |
| Second monitor via HDMI | ✅ | Plug in a monitor |
| Compile Rust/C++ | ✅ | Slow but works |
| Always-on scraper / cron jobs | ✅ | Leave it running 24/7 |
| Run Ollama (local LLM) | ⚠️ | 4–8 GB models only, CPU only |

**Best single use**: leave it running `npm run dev` for your portfolio 24/7, SSH in from your main machine when you need to test something, and use its GPU via Chrome for WebGPU tool testing.

---

### Troubleshooting

**Linux terminal won't open / crashes:**
Settings → Advanced → Developers → Linux → Repair

**Can't install packages (disk full):**
Settings → Advanced → Developers → Linux → Disk size → resize to 20–30 GB

**WebGPU not hardware accelerated:**
`chrome://flags` → enable `#enable-unsafe-webgpu` → relaunch

**SSH connection refused from main machine:**
```bash
# On Chromebook
sudo systemctl enable ssh
sudo systemctl start ssh
sudo ufw allow 22    # if ufw is active
```
