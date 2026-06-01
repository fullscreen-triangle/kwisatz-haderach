import https from 'https';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'desk-travel/1.0' } }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function fmtDuration(dep, arr) {
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  const h    = Math.floor(mins / 60);
  const m    = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { from, to, departure, results = 6 } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'from and to required' });

  const dep = departure || new Date().toISOString();

  try {
    const url = `https://v6.db.transport.rest/journeys`
      + `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      + `&departure=${encodeURIComponent(dep)}&results=${results}&stopovers=false&remarks=false`;

    const raw      = await httpsGet(url);
    const journeys = (raw.journeys || []).map(j => {
      const first = j.legs[0];
      const last  = j.legs[j.legs.length - 1];
      const changes = j.legs.filter(l => !l.walking).length - 1;

      return {
        id:         j.refreshToken || `${first.departure}-${last.arrival}`,
        departure:  first.departure,
        arrival:    last.arrival,
        duration:   fmtDuration(first.departure, last.arrival),
        changes,
        legs: j.legs.filter(l => !l.walking).map(l => ({
          from:      l.origin?.name,
          to:        l.destination?.name,
          dep:       l.departure,
          arr:       l.arrival,
          depPlat:   l.departurePlatform || null,
          arrPlat:   l.arrivalPlatform   || null,
          line:      l.line?.name || l.line?.fahrtNr || null,
          mode:      l.line?.mode || 'train',
          delay_dep: l.departureDelay ? Math.round(l.departureDelay / 60) : null,
          delay_arr: l.arrivalDelay   ? Math.round(l.arrivalDelay   / 60) : null,
        })),
      };
    });

    return res.json({ journeys, from, to, departure: dep });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
