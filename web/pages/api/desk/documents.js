import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), '..', 'tools', 'document_tracker', 'data', 'documents.json');

const DOC_TYPES = {
  PASSPORT: {
    name: 'Zimbabwean Passport',
    leadMonths: 8,
    processingWeeks: 14,
    office: 'Embassy of Zimbabwe, Berlin',
    address: 'Kommandantenstraße 80, 10117 Berlin',
    phone: '+49 30 206 2263',
    requirements: [
      { item: 'Completed application form ZIM 91', note: 'Download from zimberlin.de or collect at embassy' },
      { item: 'Current/expired passport (original)', note: 'Make a certified copy before handing over' },
      { item: '2 passport photos (35×45 mm)', note: 'White background, taken within last 6 months' },
      { item: 'Meldebescheinigung', note: 'Proof of German registration — get from Bürgeramt (same day)' },
      { item: 'Birth certificate (certified copy)', note: 'May require apostille if not previously on file' },
      { item: 'Fee (approx. €80–120)', note: 'Verify current amount on embassy website' },
      { item: 'Self-addressed registered return envelope', note: 'If submitting by post' },
    ],
    warning: '⚠ Processing is notoriously slow (10–16 weeks). Apply AT LEAST 8 months before expiry. Alternative: Consulate-General Frankfurt, Kettenhofweg 16, 60325 Frankfurt, +49 69 971 9750. If expired, Ausländerbehörde can issue a Reiseausweisersatz as a bridge.',
  },
  PERMIT: {
    name: 'German Aufenthaltserlaubnis',
    leadMonths: 3,
    processingWeeks: 6,
    office: 'Ausländerbehörde (city-specific)',
    address: 'Munich: KVR Poccistraße 4, 80336 München',
    phone: 'Book online at termine.muenchen.de',
    requirements: [
      { item: 'Valid passport', note: 'Must be valid for the full renewal period' },
      { item: '1 biometric passport photo (35×45 mm)' },
      { item: 'Current Aufenthaltserlaubnis (original)' },
      { item: 'Proof of income or active job search', note: '3 months Gehaltsabrechnungen, or documented job applications' },
      { item: 'Rental contract (Mietvertrag)', note: 'Current, signed by landlord' },
      { item: 'Health insurance certificate', note: 'Current coverage confirmation from insurer' },
      { item: 'Fee: ~€100' },
    ],
    warning: '⚠ Book appointment online early — slots fill weeks in advance. If permit expires before appointment, request a Fiktionsbescheinigung immediately. Under §31 AufenthG, 4-year marriage gives independent post-divorce right of residence.',
  },
};

function subtractMonths(dateStr, months) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split('T')[0];
}

function daysFrom(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function urgency(record, docType) {
  const dte = daysFrom(record.expiry_date);
  if (dte === null) return 'unknown';
  if (dte < 0) return 'expired';
  const deadline = subtractMonths(record.expiry_date, docType.leadMonths);
  const dtd = daysFrom(deadline);
  if (dtd < 0) return 'overdue';
  if (dtd < 30) return 'urgent';
  if (dtd < 90) return 'soon';
  return 'ok';
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export default function handler(req, res) {
  if (req.method === 'GET') {
    const raw = loadData();
    const result = {};

    for (const [tid, docType] of Object.entries(DOC_TYPES)) {
      const record = raw[tid] || { expiry_date: null, status: 'active', notes: '' };
      const deadline = record.expiry_date ? subtractMonths(record.expiry_date, docType.leadMonths) : null;

      result[tid] = {
        ...docType,
        typeId: tid,
        expiryDate: record.expiry_date,
        status: record.status,
        notes: record.notes,
        renewalDeadline: deadline,
        daysUntilExpiry: daysFrom(record.expiry_date),
        daysUntilDeadline: daysFrom(deadline),
        urgency: urgency(record, docType),
      };
    }

    return res.json(result);
  }

  if (req.method === 'POST') {
    const { typeId, status, notes, expiryDate } = req.body;
    if (!typeId || !DOC_TYPES[typeId]) {
      return res.status(400).json({ error: 'Invalid typeId' });
    }
    const data = loadData();
    if (!data[typeId]) data[typeId] = { expiry_date: null, status: 'active', notes: '' };
    if (status)     data[typeId].status = status;
    if (notes)      data[typeId].notes = notes;
    if (expiryDate) data[typeId].expiry_date = expiryDate;
    saveData(data);
    return res.json({ ok: true });
  }

  res.status(405).end();
}
