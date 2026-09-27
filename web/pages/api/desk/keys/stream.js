// Live credential status for /desk/keys — the node's /keeper/stream, piped through.
import { proxySSE } from '../../../../lib/sse-proxy';

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end();
  }
  return proxySSE(req, res, '/keeper/stream');
}
