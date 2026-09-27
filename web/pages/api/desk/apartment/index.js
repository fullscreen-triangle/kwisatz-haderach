import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const REPO_ROOT = path.join(process.cwd(), '..');
const STORE = path.join(REPO_ROOT, 'tools', 'apartment_search', 'data', 'search.json');

// Mirrors tools/apartment_search/criteria.py DOSSIER_ITEMS. Duplicated rather than
// imported because Python is the source of truth and Next cannot read it directly.
// The listing POST path shells out to Python, so scoring is never re-implemented here.
const DOSSIER_ITEMS = [
  { id: 'selbstauskunft',       name: 'Mieterselbstauskunft',               note: 'Landlord form usually; a generic one works as a fallback.', generatable: true },
  { id: 'schufa',               name: 'SCHUFA-BonitätsAuskunft',            note: 'Order the BonitätsAuskunft (the landlord one), not the free Datenkopie. ~30 EUR, takes days — order EARLY.', generatable: false, lead_time_days: 10 },
  { id: 'einkommensnachweis',   name: 'Einkommensnachweise (last 3)',       note: 'Payslips, or the signed employment contract if the job has not started yet.', generatable: false },
  { id: 'arbeitsvertrag',       name: 'Arbeitsvertrag / Zusage',            note: 'For a not-yet-started position this substitutes for payslips.', generatable: false },
  { id: 'mietschuldenfreiheit', name: 'Mietschuldenfreiheitsbescheinigung', note: 'From the current landlord. Ask early — they are slow.', generatable: false, lead_time_days: 14 },
  { id: 'ausweis',              name: 'Ausweis / Aufenthaltstitel (Kopie)', note: 'Passport plus residence permit.', generatable: false },
  { id: 'anschreiben',          name: 'Anschreiben',                        note: 'Short cover note. Generated.', generatable: true },
];

const ACTIVE = ['saved', 'contacted', 'viewing', 'applied', 'offered'];

function load() {
  const empty = { listings: [], viewings: [], deadlines: [], dossier: {}, notes: [] };
  if (!fs.existsSync(STORE)) return empty;
  return { ...empty, ...JSON.parse(fs.readFileSync(STORE, 'utf-8')) };
}

function save(data) {
  fs.mkdirSync(path.dirname(STORE), { recursive: true });
  fs.writeFileSync(STORE, JSON.stringify(data, null, 2));
}

function dossierStatus(held) {
  const items = DOSSIER_ITEMS.map(spec => {
    const st = held[spec.id] || {};
    return { ...spec, have: !!st.have, obtained: st.obtained || null, note_user: st.note || '' };
  });
  const missing = items.filter(i => !i.have);
  return {
    items,
    complete: missing.length === 0,
    missing_count: missing.length,
    order_now: missing.filter(i => i.lead_time_days),
  };
}

// Runs the Python scorer — the single source of truth for parsing and scoring.
function analyse({ url, text, address }) {
  return new Promise(resolve => {
    const payload = JSON.stringify({ url: url || '', text: text || '', address: address || '' });
    const child = exec(
      'python -m tools.apartment_search.ingest',
      { cwd: REPO_ROOT, env: { ...process.env }, timeout: 60000, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err && err.killed) return resolve({ error: 'Timed out fetching the listing.' });
        try { resolve(JSON.parse(stdout)); }
        catch { resolve({ error: (stderr || 'Analysis failed').slice(0, 500) }); }
      },
    );
    child.stdin.write(payload);
    child.stdin.end();
  });
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const data = load();
    const today = new Date().toISOString().slice(0, 10);
    const in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);

    for (const v of data.viewings) { v.upcoming = v.date >= today && v.date <= in14; v.past = v.date < today; }
    for (const d of data.deadlines) { d.overdue = !d.done && (d.date || '9999') < today; }

    const listings = [...data.listings].sort((a, b) => (b.score || 0) - (a.score || 0));
    return res.json({
      listings,
      viewings: [...data.viewings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
      deadlines: [...data.deadlines].sort((a, b) => a.date.localeCompare(b.date)),
      dossier: dossierStatus(data.dossier),
      stats: {
        total: listings.length,
        active: listings.filter(e => ACTIVE.includes(e.status)).length,
        applied: listings.filter(e => e.status === 'applied').length,
        viewings_upcoming: data.viewings.filter(v => v.upcoming).length,
        best_score: listings.reduce((m, e) => Math.max(m, e.score || 0), 0),
      },
    });
  }

  if (req.method === 'POST') {
    const { action } = req.body || {};

    if (action === 'listing') {
      const { url, text, address } = req.body;
      if (!url && !text) return res.status(400).json({ error: 'Provide a URL or paste the listing text.' });
      const out = await analyse({ url, text, address });
      if (out.error) return res.status(422).json(out);
      return res.json(out);
    }

    if (action === 'viewing') {
      const { listing_id, date, time, address, contact, notes } = req.body;
      if (!date || !time) return res.status(400).json({ error: 'date and time are required' });
      const data = load();
      data.viewings.push({ listing_id: listing_id || null, date, time, address: address || '', contact: contact || '', notes: notes || '' });
      // Booking a viewing advances a flat that has not got there yet, but must never
      // drag one backwards: a flat already applied for or offered stays where it is.
      const l = data.listings.find(e => e.id === listing_id);
      if (l && ['saved', 'contacted'].includes(l.status)) l.status = 'viewing';
      save(data);
      return res.json({ ok: true });
    }

    if (action === 'deadline') {
      const { date, title, description } = req.body;
      if (!date || !title) return res.status(400).json({ error: 'date and title are required' });
      const data = load();
      data.deadlines.push({ date, title, description: description || '', done: false });
      save(data);
      return res.json({ ok: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  if (req.method === 'PATCH') {
    const { id, status, dossier_id, have, note, deadline_index } = req.body || {};
    const data = load();

    if (dossier_id) {
      if (!DOSSIER_ITEMS.some(i => i.id === dossier_id)) return res.status(404).json({ error: 'Unknown dossier item' });
      data.dossier[dossier_id] = { have: !!have, note: note || '', obtained: have ? new Date().toISOString().slice(0, 10) : null };
      save(data);
      return res.json({ ok: true, dossier: dossierStatus(data.dossier) });
    }

    if (typeof deadline_index === 'number') {
      if (!data.deadlines[deadline_index]) return res.status(404).json({ error: 'Deadline not found' });
      data.deadlines[deadline_index].done = true;
      save(data);
      return res.json({ ok: true });
    }

    const entry = data.listings.find(e => e.id === id);
    if (!entry) return res.status(404).json({ error: 'Listing not found' });
    if (status) entry.status = status;
    save(data);
    return res.json({ ok: true, listing: entry });
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const data = load();
    const before = data.listings.length;
    data.listings = data.listings.filter(e => e.id !== id);
    data.viewings = data.viewings.filter(v => v.listing_id !== id);
    if (data.listings.length === before) return res.status(404).json({ error: 'Listing not found' });
    save(data);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
