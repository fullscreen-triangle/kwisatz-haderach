import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), '..', 'tools', 'document_tracker', 'data', 'trips.json');

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.json(load());
  }

  if (req.method === 'POST') {
    const {
      destination,        // "Vienna, Austria"
      destination_id,     // DB station ID if known
      depart_date,        // "2026-07-04"
      return_date,        // "2026-07-07" or null (day trip)
      purpose = '',       // "conference", "holiday", "visit"
      notes   = '',
      journey = null,     // saved journey option from HAFAS
      status  = 'planning', // planning | booked | completed | cancelled
    } = req.body;

    if (!destination || !depart_date) return res.status(400).json({ error: 'destination and depart_date required' });

    const trips = load();
    const trip  = {
      id:             Date.now().toString(),
      destination,
      destination_id: destination_id || null,
      depart_date,
      return_date:    return_date || null,
      purpose,
      notes,
      journey,
      status,
      created: new Date().toISOString(),
    };
    trips.push(trip);
    trips.sort((a, b) => a.depart_date.localeCompare(b.depart_date));
    save(trips);
    return res.json(trip);
  }

  if (req.method === 'PATCH') {
    const { id, ...updates } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    const trips = load();
    const idx   = trips.findIndex(t => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'not found' });
    trips[idx]  = { ...trips[idx], ...updates };
    trips.sort((a, b) => a.depart_date.localeCompare(b.depart_date));
    save(trips);
    return res.json(trips[idx]);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const trips  = load().filter(t => t.id !== id);
    save(trips);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
