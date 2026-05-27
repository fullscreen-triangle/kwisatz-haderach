import fs from 'fs';
import path from 'path';
import https from 'https';

const CACHE_FILE  = path.join(process.cwd(), '..', 'tools', 'document_tracker', 'data', 'academic_cache.json');
const AUTHOR_ID   = 'A5119407039';
const CACHE_TTL   = 24 * 60 * 60 * 1000; // 24 hours

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'desk-academic/1.0 (mailto:claude@bitspark.com)' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse failed: ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    if (Date.now() - raw._ts < CACHE_TTL) return raw;
  } catch {}
  return null;
}

function saveCache(data) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ ...data, _ts: Date.now() }, null, 2));
}

async function fetchAcademic() {
  const [authorData, worksData] = await Promise.all([
    httpsGet(`https://api.openalex.org/authors/${AUTHOR_ID}`),
    httpsGet(`https://api.openalex.org/works?filter=author.id:${AUTHOR_ID}&per-page=100&sort=cited_by_count:desc`),
  ]);

  const works = (worksData.results || []).map(w => {
    const venue = w.primary_location?.source?.display_name || null;
    const doi   = w.doi ? w.doi.replace('https://doi.org/', '') : null;
    return {
      id:           w.id?.replace('https://openalex.org/', '') || '',
      title:        w.title || 'Untitled',
      year:         w.publication_year || null,
      cited_by:     w.cited_by_count || 0,
      venue:        venue,
      doi:          doi,
      doi_url:      w.doi || null,
      type:         w.type || 'article',
      is_oa:        w.open_access?.is_oa || false,
      oa_url:       w.open_access?.oa_url || null,
      concepts:     (w.concepts || []).slice(0, 3).map(c => c.display_name),
    };
  });

  // papers by year
  const byYear = {};
  for (const w of works) {
    if (w.year) byYear[w.year] = (byYear[w.year] || 0) + 1;
  }

  // top venues
  const venueCounts = {};
  for (const w of works) {
    if (w.venue) venueCounts[w.venue] = (venueCounts[w.venue] || 0) + 1;
  }
  const topVenues = Object.entries(venueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const summary = authorData.summary_stats || {};

  return {
    author: {
      id:           AUTHOR_ID,
      name:         authorData.display_name || 'Kundai Farai Sachikonye',
      orcid:        authorData.orcid || 'https://orcid.org/0009-0009-5698-9595',
      works_count:  authorData.works_count || works.length,
      cited_by:     authorData.cited_by_count || 0,
      h_index:      summary.h_index || 0,
      i10_index:    summary.i10_index || 0,
      institutions: (authorData.affiliations || []).slice(0, 2).map(a => a.institution?.display_name).filter(Boolean),
      topics:       (authorData.topics || []).slice(0, 6).map(t => ({ name: t.display_name, score: t.score, count: t.count })),
    },
    works,
    byYear,
    topVenues,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const forceRefresh = req.query.refresh === '1';
  if (!forceRefresh) {
    const cached = loadCache();
    if (cached) return res.json(cached);
  }

  try {
    const data = await fetchAcademic();
    saveCache(data);
    return res.json(data);
  } catch (err) {
    // serve stale cache on error
    const stale = (() => { try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')); } catch { return null; } })();
    if (stale) return res.json({ ...stale, _stale: true });
    return res.status(500).json({ error: err.message });
  }
}
