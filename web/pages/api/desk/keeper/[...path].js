// Renewing credentials on the desk: forwards to the node's /keeper (backend/routes/keeper.py,
// backend/keeper/desk.py). Values go in, never out — every answer is value-free.
// google/callback is where Google returns after "Connect Gmail" (with a web OAuth client): it
// finishes the sign-in on the node and comes back to the Keys page.
import { proxyJSON, backendUrl } from '../../../../lib/sse-proxy';

const POST = new Set(['setting', 'google/client', 'google/start', 'google/finish']);

export default async function handler(req, res) {
  const seg = [].concat(req.query.path || []);
  const path = seg.join('/');
  if (req.method === 'GET' && path === 'desk') return proxyJSON(req, res, '/keeper/desk');
  if (req.method === 'GET' && path === 'google/callback') {
    const backend = backendUrl();
    const { code = '', state = '', error = '' } = req.query;
    let where = '/desk/keys?gmail=';
    if (error) {
      where += `error&why=${encodeURIComponent(String(error))}`;
    } else {
      try {
        const r = await fetch(`${backend}/keeper/google/finish`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: String(code), state: String(state) }), signal: AbortSignal.timeout(60_000),
        });
        const d = await r.json().catch(() => ({}));
        where += r.ok ? `ok&box=${encodeURIComponent(d.mailbox || '')}${d.testing_until ? `&testing=${d.testing_until}` : ''}`
          : `error&why=${encodeURIComponent(d.detail || `HTTP ${r.status}`)}`;
      } catch (e) {
        where += `error&why=${encodeURIComponent(e.message)}`;
      }
    }
    res.writeHead(302, { Location: where });
    return res.end();
  }
  const ok = req.method === 'POST' && (POST.has(path) || (seg.length === 2 && seg[0] === 'renew'));
  if (!ok) return res.status(404).json({ error: 'unknown keeper route' });
  return proxyJSON(req, res, `/keeper/${seg.map(encodeURIComponent).join('/')}`, { timeoutMs: 60_000 });
}
