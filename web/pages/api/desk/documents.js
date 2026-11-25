// Documents: passport, residence and registration, built from the facts the node keeps current
// from mail (backend/life, /life). Each document carries its facts with their state — known,
// to confirm (a mail says so; one tap makes it yours), unknown — and the quotes behind them.
// POST {slot, value} confirms or corrects one fact (value null: does not apply).
import { backendUrl } from '../../../lib/sse-proxy';

const DOC_TYPES = {
  PASSPORT: {
    name: 'Zimbabwean passport',
    leadMonths: 8,
    office: 'Embassy of Zimbabwe, Berlin',
    address: 'Kommandantenstraße 80, 10117 Berlin',
    phone: '+49 30 206 2263',
    slots: ['passport_valid_until', 'passport_received_on', 'passport_issued_on', 'passport_number'],
    expirySlot: 'passport_valid_until',
    requirements: [
      { item: 'Completed application form ZIM 91', note: 'From zimberlin.de or at the embassy' },
      { item: 'Current passport (original)', note: 'Copy it before handing it over' },
      { item: '2 passport photos (35×45 mm)', note: 'White background, under 6 months old' },
      { item: 'Meldebescheinigung', note: 'Stadt Greifswald, Bürgerbüro' },
      { item: 'Birth certificate (certified copy)' },
      { item: 'Fee', note: 'Check the current amount with the embassy' },
    ],
    warning: 'Processing takes 10–16 weeks: apply at least 8 months before expiry. Your residence title is tied to a valid passport.',
  },
  RESIDENCE: {
    name: 'Residence title',
    leadMonths: 2,
    office: 'Ausländerbehörde Landkreis Vorpommern-Greifswald',
    address: 'Migration.Greifswald@kreis-vg.de — appointments by e-mail',
    phone: '',
    slots: ['residence_document', 'residence_valid_until', 'residence_applied_for', 'residence_applied_on',
            'residence_appointment', 'residence_authority'],
    expirySlot: 'residence_valid_until',
    requirements: [
      { item: 'Valid passport', note: 'Valid for the whole period applied for' },
      { item: '1 biometric photo (35×45 mm)' },
      { item: 'Employment contract (Arbeitsvertrag)', note: 'Universität Greifswald' },
      { item: 'Hosting agreement', note: 'From Referat Personal (Frau Sadewasser) — for § 18d research stays' },
      { item: 'Meldebescheinigung', note: 'Stadt Greifswald' },
      { item: 'Health insurance certificate' },
      { item: 'Current Fiktionsbescheinigung or residence card' },
    ],
    warning: 'A Fiktionsbescheinigung keeps you covered only until its date: ask the Ausländerbehörde to extend it before then.',
  },
  REGISTRATION: {
    name: 'Address registration',
    leadMonths: 0,
    office: 'Stadt Greifswald, Bürgerbüro',
    address: 'Markt 15, 17489 Greifswald',
    phone: '',
    slots: ['address_street', 'address_city', 'address_since', 'registered_on'],
    expirySlot: null,
    requirements: [
      { item: 'Wohnungsgeberbestätigung', note: 'From the landlord' },
      { item: 'Passport' },
    ],
    warning: 'Register within two weeks of moving in.',
  },
};

function daysFrom(dateStr) {
  if (!dateStr) return null;
  return Math.round((new Date(dateStr) - new Date()) / 86400000);
}

function minusMonths(dateStr, months) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
}

function urgency(expiry, lead) {
  const dte = daysFrom(expiry);
  if (dte === null) return 'unknown';
  if (dte < 0) return 'expired';
  const dtd = daysFrom(minusMonths(expiry, lead));
  if (dtd < 0) return 'overdue';
  if (dtd < 30) return 'urgent';
  if (dtd < 90) return 'soon';
  return 'ok';
}

function build(life) {
  const facts = {};
  for (const list of Object.values(life?.topics || {})) for (const f of list) facts[f.slot] = f;
  const val = slot => facts[slot]?.value ?? facts[slot]?.leader ?? null;      // to confirm still shows, marked
  const out = {};
  for (const [tid, t] of Object.entries(DOC_TYPES)) {
    const expiry = t.expirySlot ? val(t.expirySlot) : null;
    const docFacts = t.slots.map(s => facts[s]).filter(Boolean);
    const toConfirm = docFacts.filter(f => f.state === 'to confirm').length;
    let name = t.name;
    let notes = '';
    let u = urgency(expiry, t.leadMonths);
    if (tid === 'RESIDENCE') {
      if (val('residence_document')) name = val('residence_document');
      const applied = val('residence_applied_for');
      if (applied) notes = `Applied for: ${applied}${val('residence_applied_on') ? ` (${val('residence_applied_on')})` : ''}.`;
      if (val('residence_appointment')) notes += ` Appointment: ${val('residence_appointment')}.`;
    }
    if (tid === 'PASSPORT' && val('passport_received_on')) notes = `Received ${val('passport_received_on')}.`;
    if (tid === 'REGISTRATION') {
      const street = val('address_street');
      notes = street ? `${street}, ${val('address_city') || ''}${val('registered_on') ? ` — registered ${val('registered_on')}` : ''}` : '';
      u = val('registered_on') ? 'ok' : (street ? 'soon' : 'unknown');
    }
    out[tid] = {
      ...t, typeId: tid, name, notes: notes.trim(),
      office: (tid === 'RESIDENCE' && val('residence_authority')) || t.office,
      expiryDate: expiry, renewalDeadline: expiry && t.leadMonths ? minusMonths(expiry, t.leadMonths) : null,
      daysUntilExpiry: daysFrom(expiry), daysUntilDeadline: expiry ? daysFrom(minusMonths(expiry, t.leadMonths)) : null,
      urgency: u, status: toConfirm ? 'to confirm' : 'active', toConfirm, facts: docFacts,
    };
  }
  return out;
}

export default async function handler(req, res) {
  const backend = backendUrl();
  if (!backend) return res.status(503).json({ error: 'Backend not configured (NEXT_PUBLIC_BACKEND_URL)' });
  try {
    if (req.method === 'GET') {
      const r = await fetch(`${backend}/life`, { signal: AbortSignal.timeout(20_000) });
      const life = await r.json();
      return res.json(build(life));
    }
    if (req.method === 'POST') {
      let { slot, value, typeId, expiryDate } = req.body || {};
      if (!slot && typeId && DOC_TYPES[typeId]?.expirySlot) { slot = DOC_TYPES[typeId].expirySlot; value = expiryDate; }
      if (!slot) return res.status(400).json({ error: 'slot required' });
      const r = await fetch(`${backend}/life/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, value: value ?? null }), signal: AbortSignal.timeout(20_000),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data.detail || 'could not save' });
      return res.json({ ok: true, ...build(data) });
    }
    return res.status(405).end();
  } catch (e) {
    return res.status(502).json({ error: `Could not reach the node: ${e.message}` });
  }
}
