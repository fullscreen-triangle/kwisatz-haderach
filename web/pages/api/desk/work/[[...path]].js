// The work desk (currentValue): forwards /api/desk/work[/refresh|/file] to the node's /work
// (backend/routes/work.py). Read only.
import { proxyJSON } from '../../../../lib/sse-proxy';

export default async function handler(req, res) {
  const seg = [].concat(req.query.path || []).join('/');
  const ok = (req.method === 'GET' && (seg === '' || seg === 'file')) || (req.method === 'POST' && seg === 'refresh');
  if (!ok) return res.status(404).json({ error: 'unknown work route' });
  return proxyJSON(req, res, `/work${seg ? `/${seg}` : ''}`, { timeoutMs: seg === 'refresh' ? 180_000 : 30_000 });
}
