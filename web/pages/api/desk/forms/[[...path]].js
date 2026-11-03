// Filling in documents: forwards /api/desk/forms/<path> to the node's /forms/<path>
// (backend/routes/forms.py). Uploads travel as base64 in JSON, so the body limit is raised;
// <id>/filled comes back as the PDF (or value sheet) itself, passed through as bytes.
import { backendUrl, proxyJSON } from '../../../../lib/sse-proxy';

export const config = { api: { bodyParser: { sizeLimit: '30mb' }, responseLimit: false } };

export default async function handler(req, res) {
  const seg = [].concat(req.query.path || []);
  const ok = seg.length === 0
    || (seg.length === 1)
    || (seg.length === 2 && ['sources', 'read', 'answer', 'filled', 'confirm-quoted'].includes(seg[1]));
  if (!ok) return res.status(404).json({ error: 'unknown forms route' });
  const path = seg.map(encodeURIComponent).join('/');
  if (seg[1] !== 'filled') return proxyJSON(req, res, `/forms${path ? `/${path}` : ''}`, { timeoutMs: 120_000 });

  const backend = backendUrl();
  if (!backend) return res.status(503).end();
  try {
    const r = await fetch(`${backend}/forms/${path}`, { signal: AbortSignal.timeout(60_000) });
    res.status(r.status);
    for (const h of ['content-type', 'content-disposition']) if (r.headers.get(h)) res.setHeader(h, r.headers.get(h));
    res.send(Buffer.from(await r.arrayBuffer()));
  } catch {
    res.status(502).json({ error: 'the node did not answer' });
  }
}
