// Vercel proxy for the node's credential-status check.
//
// Answers "are my API tokens live on the node?" — the question that keeps biting: on the
// Chromebook there's no Render to export credentials, so os.getenv reads empty and every
// integration silently looks dead. The node's /secrets/status reports, per known key,
// whether it's set and how long the value is — NEVER the value itself. This proxy just
// forwards that value-free report so the PWA can show a "keys: 5/7 live" strip.
//
// GET only. Nothing here (or on the node's status route) ever returns a secret.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!BACKEND) {
    return res.status(503).json({
      error: 'Backend not configured',
      hint: 'Set NEXT_PUBLIC_BACKEND_URL (the Railway router URL) in web/.env.local',
    });
  }

  try {
    const resp = await fetch(`${BACKEND.replace(/\/$/, '')}/secrets/status`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    const data = await resp.json().catch(() => ({
      error: 'Node returned a non-JSON response',
    }));
    return res.status(resp.status).json(data);
  } catch (err) {
    const offline = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return res.status(offline ? 504 : 502).json({
      error: offline
        ? 'The local node did not respond. Is the Chromebook backend awake?'
        : `Could not reach the node: ${err?.message || 'unknown error'}`,
    });
  }
}
