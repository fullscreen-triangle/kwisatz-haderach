import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.join(process.cwd(), '..');
const STORE = path.join(REPO_ROOT, 'tools', 'apartment_search', 'data', 'search.json');

const APPLICANT = {
  name: 'Kundai Farai Sachikonye',
  role: 'wissenschaftlicher Mitarbeiter an der Universität Greifswald',
};

function deDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

// Kept in step with tools/apartment_search/dossier.py generate_anschreiben.
function anschreiben(listing) {
  const title = listing.title || 'Ihre Wohnungsanzeige';
  const addr = listing.address || listing.district || 'Greifswald';
  const bits = [];
  if (listing.rooms) bits.push(`${listing.rooms}-Zimmer-Wohnung`);
  if (listing.size_sqm) bits.push(`${listing.size_sqm} m²`);
  const what = bits.length ? bits.join(', ') : 'Wohnung';

  return `Betreff: Bewerbung um die ${what} – ${addr}

Sehr geehrte Damen und Herren,

mit großem Interesse habe ich Ihr Angebot „${title}" gelesen und bewerbe mich
hiermit um die Wohnung.

Ich bin ${APPLICANT.name}, ${APPLICANT.role}. Mein Einkommen ist unbefristet
gesichert, und ich verfüge über eine unbefristete Aufenthaltserlaubnis für
Deutschland. Rauchen und Haustiere sind für mich kein Thema; die Wohnung würde
ausschließlich von mir selbst bewohnt.

Alle üblichen Unterlagen – Mieterselbstauskunft, SCHUFA-BonitätsAuskunft,
Einkommensnachweise, Mietschuldenfreiheitsbescheinigung sowie eine Kopie meines
Ausweises und Aufenthaltstitels – halte ich vollständig bereit und bringe sie
gerne zum Besichtigungstermin mit.

Über eine Einladung zur Besichtigung würde ich mich sehr freuen.

Mit freundlichen Grüßen
${APPLICANT.name}

Greifswald, den ${deDate()}
`;
}

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { id } = req.query;
  if (!fs.existsSync(STORE)) return res.status(404).json({ error: 'No listings yet' });

  const data = JSON.parse(fs.readFileSync(STORE, 'utf-8'));
  const listing = (data.listings || []).find(e => e.id === id);
  if (!listing) return res.status(404).json({ error: 'Listing not found' });

  return res.json({ text: anschreiben(listing) });
}
