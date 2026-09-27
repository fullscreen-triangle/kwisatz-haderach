// The depth dial: forwards /api/desk/dial/<path> to the node's /individuate/<path>
// (backend/routes/individuate.py) — node[/<id>] · status · theta · grow.
import { proxyJSON } from '../../../../lib/sse-proxy';

const ALLOWED = new Set(['node', 'status', 'theta', 'grow']);

export default async function handler(req, res) {
  const parts = [].concat(req.query.path || []);
  const [head, id] = parts;
  if (!ALLOWED.has(head) || parts.length > 2 || (id && !/^[0-9a-f]{10}$/.test(id))) {
    return res.status(404).json({ error: 'unknown dial route' });
  }
  return proxyJSON(req, res, `/individuate/${parts.join('/')}`);
}
