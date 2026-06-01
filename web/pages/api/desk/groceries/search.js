import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const REPO_ROOT  = path.join(process.cwd(), '..');
const CACHE_DIR  = path.join(REPO_ROOT, 'tools', 'grocery_tracker', 'data');
const CACHE_TTL  = 6 * 3600 * 1000; // 6 hours

function cacheFile(query, stores) {
  const safe = `${stores.sort().join('_')}_${query}`.toLowerCase().replace(/[^\w]/g, '_');
  return path.join(CACHE_DIR, `search_${safe}.json`);
}

function loadCache(query, stores) {
  const f = cacheFile(query, stores);
  if (!fs.existsSync(f)) return null;
  try {
    const mtime = fs.statSync(f).mtimeMs;
    if (Date.now() - mtime < CACHE_TTL) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
  return null;
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { query, stores = 'rewe,kaufland,penny,amazon', limit = '5' } = req.query;
  if (!query || query.trim().length < 2) return res.status(400).json({ error: 'query required (min 2 chars)' });

  const storeList = stores.split(',').map(s => s.trim()).filter(Boolean);

  const cached = loadCache(query, storeList);
  if (cached) return res.json({ ...cached, cached: true });

  const cmd = `python -m tools.grocery_tracker.price_lookup --query "${query.replace(/"/g, '')}" --stores "${storeList.join(',')}" --limit ${parseInt(limit, 10) || 5}`;

  exec(cmd, { cwd: REPO_ROOT, timeout: 30_000 }, (err, stdout, stderr) => {
    try {
      const data = JSON.parse(stdout);
      return res.json({ ...data, cached: false });
    } catch {
      return res.status(500).json({ error: stderr || err?.message || 'Parse error' });
    }
  });
}
