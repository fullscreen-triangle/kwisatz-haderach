import fs from 'fs';
import path from 'path';

const INDEX_FILE = path.join(process.cwd(), '..', 'tools', 'job_assistant', 'output', 'index.json');
const OUTPUT_DIR = path.join(process.cwd(), '..', 'tools', 'job_assistant', 'output');

function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) return [];
  return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
}

function saveIndex(index) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

function loadAppDetail(appId) {
  const dir = path.join(OUTPUT_DIR, appId);
  const result = {};
  for (const fname of ['job.json', 'assessment.json', 'financials.json']) {
    const fpath = path.join(dir, fname);
    if (fs.existsSync(fpath)) {
      result[fname.replace('.json', '')] = JSON.parse(fs.readFileSync(fpath, 'utf-8'));
    }
  }
  for (const [fname, key] of [
    ['resume.md', 'resumemd'],
    ['cover_letter.md', 'cover_lettermd'],
    ['resume.tex', 'resumetex'],
    ['cover_letter.tex', 'cover_lettertex'],
    ['narrative.txt', 'narrative'],
  ]) {
    const fpath = path.join(dir, fname);
    if (fs.existsSync(fpath)) result[key] = fs.readFileSync(fpath, 'utf-8');
  }
  return result;
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    const { id } = req.query;
    if (id) {
      return res.json(loadAppDetail(id));
    }
    return res.json(loadIndex());
  }

  if (req.method === 'POST') {
    const { appId, status } = req.body;
    if (!appId || !status) return res.status(400).json({ error: 'Missing appId or status' });

    const index = loadIndex();
    const entry = index.find(e => e.id === appId);
    if (!entry) return res.status(404).json({ error: 'Not found' });
    entry.status = status;
    saveIndex(index);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
