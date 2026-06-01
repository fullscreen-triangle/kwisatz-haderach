import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const REPO_ROOT = path.join(process.cwd(), '..');
const CACHE_DIR = path.join(REPO_ROOT, 'tools', 'health_tracker', 'data');
const CACHE_FILE = path.join(CACHE_DIR, `garmin_${today()}.json`);

function today() { return new Date().toISOString().slice(0, 10); }

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return null;
  try {
    const raw  = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    const mtime = fs.statSync(CACHE_FILE).mtimeMs;
    if (Date.now() - mtime < 3600_000) return raw; // fresh within 1h
  } catch {}
  return null;
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const email    = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;

  if (!email || !password) {
    return res.json({ configured: false, reason: 'GARMIN_EMAIL / GARMIN_PASSWORD not set' });
  }

  const cached = loadCache();
  if (cached) return res.json({ configured: true, cached: true, data: cached });

  const env = { ...process.env, GARMIN_EMAIL: email, GARMIN_PASSWORD: password };

  exec(
    'python -m tools.health_tracker.garmin_fetch --today',
    { cwd: REPO_ROOT, env, timeout: 30_000 },
    (err, stdout, stderr) => {
      try {
        const data = JSON.parse(stdout);
        if (data.error) return res.json({ configured: true, error: data.error });
        return res.json({ configured: true, cached: false, data });
      } catch {
        return res.status(500).json({ configured: true, error: stderr || err?.message || 'Parse error' });
      }
    }
  );
}
