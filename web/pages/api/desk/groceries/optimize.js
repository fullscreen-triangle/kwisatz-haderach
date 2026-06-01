import { exec } from 'child_process';
import path from 'path';
import os from 'os';
import fs from 'fs';

const REPO_ROOT = path.join(process.cwd(), '..');

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { items, trip_cost = 2.0 } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array required' });
  }

  // Write items to a temp file so Python can read them
  const tmp = path.join(os.tmpdir(), `grocery_${Date.now()}.json`);
  try {
    fs.writeFileSync(tmp, JSON.stringify(items));
  } catch (e) {
    return res.status(500).json({ error: 'Failed to write temp file: ' + e.message });
  }

  const cmd = `python -m tools.grocery_tracker.optimizer --list "${tmp}" --trip-cost ${parseFloat(trip_cost) || 2.0}`;

  exec(cmd, { cwd: REPO_ROOT, timeout: 30_000 }, (err, stdout, stderr) => {
    try { fs.unlinkSync(tmp); } catch {}
    try {
      const data = JSON.parse(stdout);
      return res.json(data);
    } catch {
      return res.status(500).json({ error: stderr || err?.message || 'Parse error' });
    }
  });
}
