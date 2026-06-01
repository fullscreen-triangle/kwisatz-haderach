import https from 'https';

const GITHUB_USER = 'fullscreen-triangle';
const CACHE_TTL   = 15 * 60 * 1000; // 15 min
let _cache = null, _cacheTs = 0;

function ghGet(path) {
  return new Promise((resolve, reject) => {
    const token = process.env.GITHUB_TOKEN || '';
    const opts = {
      hostname: 'api.github.com',
      path,
      headers: {
        'User-Agent': 'desk/1.0',
        'Accept': 'application/vnd.github.v3+json',
        ...(token ? { Authorization: `token ${token}` } : {}),
      },
    };
    const req = https.get(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  if (_cache && Date.now() - _cacheTs < CACHE_TTL) {
    return res.json({ mentions: _cache, cached: true });
  }

  try {
    const events = await ghGet(`/users/${GITHUB_USER}/received_events?per_page=30`);

    if (!Array.isArray(events)) {
      return res.json({ mentions: [], error: events?.message || 'GitHub API error' });
    }

    const mentions = events
      .filter(e => ['WatchEvent','ForkEvent','IssuesEvent','PullRequestEvent'].includes(e.type))
      .slice(0, 20)
      .map(e => ({
        type:    e.type,
        actor:   e.actor?.login,
        avatar:  e.actor?.avatar_url,
        repo:    e.repo?.name,
        repoUrl: `https://github.com/${e.repo?.name}`,
        action:  e.payload?.action || (e.type === 'WatchEvent' ? 'starred' : e.type === 'ForkEvent' ? 'forked' : ''),
        date:    e.created_at,
      }));

    _cache = mentions;
    _cacheTs = Date.now();
    return res.json({ mentions, cached: false });
  } catch (err) {
    return res.status(500).json({ mentions: [], error: err.message });
  }
}
