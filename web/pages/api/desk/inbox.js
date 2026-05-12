import path from 'path';
import fs from 'fs';
import { fetchInboxEmails } from '../../../lib/gmail';
import { classify } from '../../../lib/classifier';

const CACHE_PATH = path.join(
  process.cwd(), '..', 'tools', 'journal_manager', 'data', 'inbox_cache.json'
);
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function loadCache() {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    if (Date.now() - new Date(data.fetched_at).getTime() < CACHE_TTL_MS) return data;
  } catch {}
  return null;
}

function saveCache(data) {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
  } catch {}
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const force = req.query.refresh === '1';

    if (!force) {
      const cached = loadCache();
      if (cached) return res.json(cached);
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.json({ error: 'not_configured', emails: [] });
    }

    try {
      const raw = await fetchInboxEmails(14);
      const emails = raw.map(email => ({
        ...email,
        classification: classify(`${email.subject}\n\nFrom: ${email.fromAddress}\n\n${email.body}`),
      }));

      const data = { fetched_at: new Date().toISOString(), emails };
      saveCache(data);
      return res.json(data);
    } catch (err) {
      if (err.code === 'not_configured') {
        return res.json({ error: 'not_configured', emails: [] });
      }
      return res.status(500).json({ error: err.message, emails: [] });
    }
  }

  if (req.method === 'POST') {
    const { action, uid } = req.body || {};
    if (action === 'dismiss' && uid !== undefined) {
      const cached = loadCache();
      if (cached) {
        cached.emails = cached.emails.filter(e => e.uid !== uid);
        saveCache(cached);
      }
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: 'unknown action' });
  }

  res.status(405).end();
}
