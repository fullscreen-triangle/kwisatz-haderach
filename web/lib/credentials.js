import fs from 'fs';
import path from 'path';

// GitHub token for server-side API routes. Prefers the GitHub App installation token the
// keeper mints on the node (<AGENT_SMITH_STATE>/minted/GITHUB_TOKEN, renewed hourly by
// backend/keeper/github_app.py), so nothing here ever expires on a human's clock. Falls
// back to a personal GITHUB_TOKEN, then to '' (unauthenticated, 60 req/h).
export function githubToken() {
  const state = process.env.AGENT_SMITH_STATE;
  if (state) {
    try {
      const minted = fs.readFileSync(path.join(state, 'minted', 'GITHUB_TOKEN'), 'utf-8').trim();
      if (minted) return minted;
    } catch {
      // not minted yet (App not configured) — fall through
    }
  }
  return process.env.GITHUB_TOKEN || '';
}
