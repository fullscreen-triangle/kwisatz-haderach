// Reading tasks: forwards /api/desk/reading[/<path>] to the node's /reading[/<path>]
// (backend/routes/reading.py). A run is started here and happens on the node; this only relays.
import { proxyJSON } from '../../../../lib/sse-proxy';

const SEG = /^[a-z0-9-]{1,64}$/;

export default async function handler(req, res) {
  const parts = [].concat(req.query.path || []);
  if (parts.length > 3 || !parts.every(p => SEG.test(p))) return res.status(404).json({ error: 'unknown reading route' });
  return proxyJSON(req, res, parts.length ? `/reading/${parts.join('/')}` : '/reading');
}
