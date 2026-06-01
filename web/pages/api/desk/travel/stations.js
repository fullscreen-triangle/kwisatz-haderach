import https from 'https';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'desk-travel/1.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    const url     = `https://v6.db.transport.rest/locations?query=${encodeURIComponent(query)}&results=8&stops=true&addresses=false&poi=false`;
    const results = await httpsGet(url);
    const stops   = (Array.isArray(results) ? results : [])
      .filter(r => r.type === 'stop' || r.type === 'station')
      .map(r => ({ id: r.id, name: r.name, type: r.type }));
    return res.json(stops);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
