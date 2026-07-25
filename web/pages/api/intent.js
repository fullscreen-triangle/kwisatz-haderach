// Vercel proxy for the Agent Smith intent round-trip.
//
// The phone posts an uttered command here; this route forwards it to the local
// compute node over the Railway router (NEXT_PUBLIC_BACKEND_URL), which reaches
// whichever backend is live (Chromebook -> Codespaces -> Render). The node's
// /intent route runs the orchestrator loop and returns a ranked slice.
//
// This is the first place the documented-but-unwired backend link goes live.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!BACKEND) {
    return res.status(503).json({
      error: 'Backend not configured',
      hint: 'Set NEXT_PUBLIC_BACKEND_URL (the Railway router URL) in web/.env.local',
    });
  }

  const text = (req.body?.text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'Say or type a command first.' });
  }

  try {
    const resp = await fetch(`${BACKEND.replace(/\/$/, '')}/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, explain: req.body?.explain === true }),
      // The node may be waking Ollama / re-indexing; allow generous time but
      // stay under the router's 55s proxy timeout.
      signal: AbortSignal.timeout(50_000),
    });

    const data = await resp.json().catch(() => ({
      error: 'Node returned a non-JSON response',
    }));
    return res.status(resp.status).json(data);
  } catch (err) {
    const offline = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return res.status(offline ? 504 : 502).json({
      error: offline
        ? 'The local node did not respond in time. Is the Chromebook backend awake?'
        : `Could not reach the node: ${err?.message || 'unknown error'}`,
    });
  }
}
