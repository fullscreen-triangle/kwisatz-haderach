import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export const config = { api: { bodyParser: true, responseLimit: false } };

const REPO_ROOT = path.join(process.cwd(), '..');
const INDEX_FILE = path.join(REPO_ROOT, 'tools', 'job_assistant', 'output', 'index.json');

function runAnalysis(url) {
  return new Promise((resolve, reject) => {
    // Sanitise: only allow http/https, strip quotes
    const safe = url.replace(/"/g, '').replace(/'/g, '');
    const cmd = `python -m tools.job_assistant apply --url "${safe}"`;
    exec(cmd, {
      cwd: REPO_ROOT,
      env: { ...process.env },
      timeout: 150_000,
    }, (err, stdout, stderr) => {
      // The script prints progress to stdout. If it exits non-zero AND produced
      // no index file change, treat it as a failure. If the index was updated we
      // consider it a success even with a non-zero exit (e.g. LLM generation skipped).
      if (err && err.killed) return reject(new Error('Timed out after 150 seconds'));
      resolve({ stdout: stdout || '', stderr: stderr || '', exitCode: err?.code ?? 0 });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url } = req.body || {};
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'A valid http/https URL is required.' });
  }

  const indexBefore = fs.existsSync(INDEX_FILE)
    ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'))
    : [];
  const idsBefore = new Set(indexBefore.map(e => e.id));

  try {
    const { stdout, stderr, exitCode } = await runAnalysis(url);

    if (!fs.existsSync(INDEX_FILE)) {
      return res.status(500).json({
        error: 'Analysis ran but produced no output. Check that Python and all dependencies are installed.',
        detail: stderr.slice(0, 800),
      });
    }

    const indexAfter = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    const newEntry = indexAfter.find(e => !idsBefore.has(e.id));

    if (!newEntry) {
      return res.status(500).json({
        error: 'Analysis completed but no new application was saved.',
        detail: stderr.slice(0, 800),
      });
    }

    return res.json({ ok: true, app: newEntry });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
