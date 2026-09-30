// Search everywhere: forwards /api/desk/find[/<run>] to the node's /find[/<run>]
// (backend/routes/find.py). The search runs on the node as a Harare run; this only relays.
import { proxyJSON } from '../../../../lib/sse-proxy';

const RUN = /^[A-Za-z0-9_.-]{1,80}$/;

export default async function handler(req, res) {
  const parts = [].concat(req.query.path || []);
  if (parts.length > 1 || !parts.every(p => RUN.test(p))) return res.status(404).json({ error: 'unknown find route' });
  return proxyJSON(req, res, parts.length ? `/find/${parts[0]}` : '/find');
}
