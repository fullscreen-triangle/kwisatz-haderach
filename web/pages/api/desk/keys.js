// Credential keeper — value-free status (GET) and "check now" (POST), proxied to the
// node's /keeper routes. Nothing that passes through here is ever a credential value.

const BACKEND = () => (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!BACKEND()) {
    return res.status(503).json({ error: 'Backend not configured (NEXT_PUBLIC_BACKEND_URL)' });
  }

  const url = `${BACKEND()}/keeper/${req.method === 'GET' ? 'status' : 'check'}`;
  try {
    const resp = await fetch(url, { method: req.method, signal: AbortSignal.timeout(15_000) });
    const data = await resp.json().catch(() => ({ error: 'Node returned a non-JSON response' }));
    return res.status(resp.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: `Could not reach the node: ${err?.message || 'unknown error'}` });
  }
}
