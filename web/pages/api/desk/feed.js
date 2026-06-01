import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const REPO_ROOT  = path.join(process.cwd(), '..');
const CACHE_FILE = path.join(REPO_ROOT, 'tools', 'health_tracker', 'data', 'feed_cache.json');

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    if (Date.now() / 1000 - (raw._ts || 0) < 7200) return raw.items;
  } catch {}
  return null;
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const cached = loadCache();
  if (cached) return res.json(cached);

  exec(
    'python -m tools.health_tracker.feed_fetch',
    { cwd: REPO_ROOT, timeout: 25_000 },
    (err, stdout, stderr) => {
      try {
        const items = JSON.parse(stdout);
        return res.json(items);
      } catch {
        return res.status(500).json({ error: stderr || err?.message || 'Feed fetch failed' });
      }
    }
  );
}
