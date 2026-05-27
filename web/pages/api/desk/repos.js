import fs from 'fs';
import path from 'path';

const INDEX_FILE = path.join(process.cwd(), '..', 'docs', 'data', 'desk-index.json');

let _cache = null;

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  if (!_cache) {
    const raw = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
    // Strip embeddings (large float arrays) — coord is stored separately and kept
    _cache = (raw.repos || []).map(({ embedding, ...rest }) => rest);
  }

  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.json(_cache);
}
