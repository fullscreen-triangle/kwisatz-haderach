import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import s from '../../styles/desk.module.css';

const STATUS_OPTIONS = ['saved', 'contacted', 'viewing', 'applied', 'offered', 'rejected', 'withdrawn', 'signed'];

const STATUS_BADGE = {
  saved: s.badgeMuted, contacted: s.badgeInfo, viewing: s.badgeWarning,
  applied: s.badgeInfo, offered: s.badgeOk, signed: s.badgeOk,
  rejected: s.badgeDanger, withdrawn: s.badgeMuted,
};

const REC_LABEL = {
  apply_now: 'apply now', apply: 'apply', backup: 'backup', skip: 'skip',
};
const REC_COLOR = {
  apply_now: '#4ade80', apply: '#a3e635', backup: '#fbbf24', skip: '#f87171',
};

const PORTALS = [
  { name: 'WVG Greifswald',        kind: 'municipal',      url: 'https://www.wvg-greifswald.de/wohnungsangebote', note: 'Largest single stock in the city. Check first.' },
  { name: 'WGG eG',                kind: 'Genossenschaft', url: 'https://www.wgg-greifswald.de', note: 'Co-op — Anteile required, refundable on exit.' },
  { name: 'PWG 1903 eG',           kind: 'Genossenschaft', url: 'https://www.pwg1903.de', note: 'Co-op, older stock, central.' },
  { name: 'ImmobilienScout24',     kind: 'portal',         url: 'https://www.immobilienscout24.de/Suche/de/mecklenburg-vorpommern/greifswald/wohnung-mieten', note: 'Most private listings.' },
  { name: 'Immowelt',              kind: 'portal',         url: 'https://www.immowelt.de/liste/greifswald/wohnungen/mieten', note: 'Partial overlap with IS24.' },
  { name: 'WG-Gesucht',            kind: 'portal',         url: 'https://www.wg-gesucht.de/wohnungen-in-Greifswald.51.2.1.0.html', note: 'Strong in a university town.' },
  { name: 'Studentenwerk',         kind: 'institutional',  url: 'https://www.stw-greifswald.de/wohnen/', note: 'Depends on enrolment status.' },
];

const eur = n => (n == null ? '—' : `${Math.round(n)} €`);

function openTextWindow(content, title) {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{margin:0;background:#0d0d0d;color:#d4d4d4;font-family:Georgia,serif;font-size:15px}
pre{padding:32px;margin:0;white-space:pre-wrap;word-break:break-word;line-height:1.7;max-width:70ch}
.bar{position:sticky;top:0;background:#111;padding:8px 16px;border-bottom:1px solid #222}
button{background:#1e1e1e;border:1px solid #333;color:#aaa;padding:4px 12px;cursor:pointer;border-radius:4px;font-size:12px}
button:hover{background:#2a2a2a}</style></head><body>
<div class="bar"><button onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent)">Copy</button></div>
<pre>${content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`);
}

// ── Add listing ─────────────────────────────────────────────────────────────

function AddListing({ onAdded }) {
  const [url, setUrl]       = useState('');
  const [text, setText]     = useState('');
  const [paste, setPaste]   = useState(false);
  const [state, setState]   = useState('idle');
  const [error, setError]   = useState('');
  const [last, setLast]     = useState(null);

  async function submit(e) {
    e.preventDefault();
    setState('loading'); setError('');
    const res = await fetch('/api/desk/apartment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'listing', url: url.trim(), text: paste ? text : '' }),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      setState('error'); setError(data.error || 'Failed');
      if (!paste) setPaste(true);   // fetch failed -> offer the paste path immediately
    } else {
      setLast(data.listing); setUrl(''); setText(''); setState('done'); onAdded();
    }
  }

  return (
    <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: 28, marginBottom: 40 }}>
      <div style={{ fontFamily: 'var(--heading-font)', fontSize: 15, fontWeight: 600, color: 'var(--heading-color)', marginBottom: 16 }}>
        Add a listing
      </div>
      <form onSubmit={submit}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="text" className={s.urlInput} placeholder="https://www.immobilienscout24.de/expose/..."
            value={url} onChange={e => { setUrl(e.target.value); if (state !== 'idle') setState('idle'); }}
            disabled={state === 'loading'} style={{ flex: 1 }} />
          <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ padding: '8px 20px', fontSize: 13 }}
            disabled={state === 'loading' || (!url.trim() && !(paste && text.trim()))}>
            {state === 'loading' ? 'Reading…' : 'Add'}
          </button>
        </div>

        {paste && (
          <textarea className={s.scanTextarea} placeholder="Paste the listing text here — Kaltmiete, Nebenkosten, Wohnfläche, Zimmer, district…"
            value={text} onChange={e => setText(e.target.value)}
            style={{ width: '100%', minHeight: 120, marginTop: 12 }} />
        )}

        {!paste && (
          <button type="button" onClick={() => setPaste(true)}
            style={{ background: 'none', border: 0, color: 'var(--font-color)', opacity: 0.45, fontSize: 12, cursor: 'pointer', marginTop: 10, padding: 0 }}>
            or paste the listing text instead →
          </button>
        )}
      </form>

      {state === 'loading' && <div style={{ fontSize: 12, opacity: 0.45, marginTop: 10 }}>Fetching · parsing rent and size · scoring against your criteria</div>}
      {state === 'error'   && <div style={{ fontSize: 12, color: '#f87171', marginTop: 10 }}>{error}</div>}
      {state === 'done' && last && (
        <div style={{ fontSize: 13, color: '#4ade80', marginTop: 10 }}>
          ✓ {last.title || 'Listing'} — {last.score}/100 ({REC_LABEL[last.recommendation]})
        </div>
      )}
    </div>
  );
}

// ── Stats ───────────────────────────────────────────────────────────────────

function Stats({ stats }) {
  if (!stats) return null;
  const cells = [
    { n: stats.active,            label: 'active',    color: '#60a5fa' },
    { n: stats.viewings_upcoming, label: 'viewings',  color: '#fbbf24' },
    { n: stats.applied,           label: 'applied',   color: '#a78bfa' },
    { n: stats.best_score,        label: 'best match', color: '#4ade80' },
    { n: stats.total,             label: 'tracked',   color: 'var(--font-color)' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 40 }}>
      {cells.map(({ n, label, color }) => (
        <div key={label} style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '18px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--heading-font)', fontSize: 32, fontWeight: 700, color, lineHeight: 1 }}>{n}</div>
          <div style={{ fontSize: 10, opacity: 0.35, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Listing card ────────────────────────────────────────────────────────────

function ListingCard({ listing, onChanged }) {
  const [open, setOpen] = useState(false);
  const a = listing.assessment || {};
  const money = a.affordability || {};
  const rec = listing.recommendation;

  async function setStatus(e) {
    await fetch('/api/desk/apartment', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: listing.id, status: e.target.value }),
    });
    onChanged();
  }

  async function remove() {
    if (!confirm('Remove this listing from the tracker?')) return;
    await fetch(`/api/desk/apartment?id=${listing.id}`, { method: 'DELETE' });
    onChanged();
  }

  async function letter() {
    const r = await fetch(`/api/desk/apartment/anschreiben?id=${listing.id}`);
    const d = await r.json();
    if (d.text) openTextWindow(d.text, 'Anschreiben');
  }

  const scoreColor = listing.score >= 75 ? '#4ade80' : listing.score >= 58 ? '#a3e635' : listing.score >= 45 ? '#fbbf24' : '#f87171';

  return (
    <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--heading-font)', fontSize: 16, fontWeight: 700, color: 'var(--heading-color)', marginBottom: 4 }}>
            {listing.title || listing.address || 'Untitled listing'}
          </div>
          <div style={{ fontSize: 12, opacity: 0.4 }}>
            {listing.district || 'district unknown'}
            {a.commute?.bike_min ? ` · ${a.commute.bike_min} min by bike` : ''}
            {listing.size_sqm ? ` · ${listing.size_sqm} m²` : ''}
            {listing.rooms ? ` · ${listing.rooms} Zi.` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--heading-font)', fontSize: 28, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>{listing.score}</div>
          <div style={{ fontSize: 10, color: REC_COLOR[rec], textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{REC_LABEL[rec]}</div>
        </div>
      </div>

      {/* money row — the numbers that decide */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
        {[
          ['warm', eur(money.warmmiete)],
          ['kalt', eur(money.kaltmiete)],
          ['€/m²', money.eur_per_sqm ? money.eur_per_sqm.toFixed(2) : '—'],
          ['at signing', eur(money.cash_at_signing)],
          ['refundable', eur(money.refundable)],
        ].map(([k, v]) => (
          <div key={k}>
            <div style={{ fontSize: 10, opacity: 0.35, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--heading-color)', marginTop: 2 }}>{v}</div>
          </div>
        ))}
      </div>

      {a.blockers?.length > 0 && (
        <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', fontSize: 12, color: '#fca5a5' }}>
          {a.blockers.map((b, i) => <div key={i}>✕ {b}</div>)}
        </div>
      )}
      {a.warnings?.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#fcd34d', opacity: 0.85 }}>
          {a.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
        <select className={s.statusSelect} value={listing.status} onChange={setStatus}>
          {STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <button className={s.btn} onClick={() => setOpen(!open)} style={{ fontSize: 12 }}>{open ? 'less' : 'details'}</button>
        <button className={s.btn} onClick={letter} style={{ fontSize: 12 }}>Anschreiben</button>
        {listing.url && <a className={s.btn} href={listing.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, textDecoration: 'none' }}>open</a>}
        <button className={s.btn} onClick={remove} style={{ fontSize: 12, marginLeft: 'auto', opacity: 0.5 }}>remove</button>
      </div>

      {open && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)', fontSize: 12, opacity: 0.75, lineHeight: 1.8 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
            {Object.entries(a.breakdown || {}).map(([k, v]) => (
              <span key={k}><b style={{ color: 'var(--heading-color)' }}>{v}</b> {k}</span>
            ))}
          </div>
          <div>Nebenkosten {eur(listing.nebenkosten)} · Heizkosten {eur(listing.heizkosten)} · Kaution {eur(money.kaution)}{money.kaution_assumed ? ' (assumed)' : ''}</div>
          <div>
            {listing.has_ebk ? '✓ Einbauküche' : '✕ no Einbauküche'} ·{' '}
            {listing.has_balcony ? '✓ Balkon' : '✕ no Balkon'} ·{' '}
            {listing.wbs_required ? '⚠ WBS required' : 'no WBS needed'}
            {listing.baujahr ? ` · Baujahr ${listing.baujahr}` : ''}
            {listing.floor != null ? ` · ${listing.floor}. OG` : ''}
          </div>
          {a.commute?.note && <div style={{ opacity: 0.6 }}>{a.commute.note}</div>}
        </div>
      )}
    </div>
  );
}

// ── Bewerbermappe ───────────────────────────────────────────────────────────

function Dossier({ dossier, onChanged }) {
  if (!dossier) return null;

  async function toggle(id, have) {
    await fetch('/api/desk/apartment', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dossier_id: id, have }),
    });
    onChanged();
  }

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <span className={s.panelTitle}>Bewerbermappe</span>
        <span className={s.panelCount}>{dossier.items.length - dossier.missing_count}/{dossier.items.length}</span>
      </div>
      <div className={s.panelBody}>
        {dossier.order_now?.length > 0 && (
          <div style={{ padding: '10px 14px', borderRadius: 6, marginBottom: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', fontSize: 12, color: '#fcd34d' }}>
            ⚠ Order now — these take days and will block a viewing:{' '}
            {dossier.order_now.map(i => i.name).join(', ')}
          </div>
        )}
        {dossier.items.map(item => (
          <div key={item.id} className={s.checklistItem} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0' }}>
            <input type="checkbox" checked={item.have} onChange={e => toggle(item.id, e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: item.have ? 'var(--font-color)' : 'var(--heading-color)', opacity: item.have ? 0.45 : 1, textDecoration: item.have ? 'line-through' : 'none' }}>
                {item.name}
                {item.lead_time_days && !item.have && (
                  <span style={{ color: '#fbbf24', fontSize: 11, marginLeft: 8 }}>~{item.lead_time_days}d lead time</span>
                )}
              </div>
              <div className={s.checklistNote} style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>{item.note}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Viewings & deadlines ────────────────────────────────────────────────────

function Schedule({ viewings, deadlines, listings, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ listing_id: '', date: '', time: '', address: '', contact: '' });

  async function addViewing(e) {
    e.preventDefault();
    await fetch('/api/desk/apartment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'viewing', ...form }),
    });
    setForm({ listing_id: '', date: '', time: '', address: '', contact: '' });
    setShowForm(false); onChanged();
  }

  async function markDone(i) {
    await fetch('/api/desk/apartment', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deadline_index: i }),
    });
    onChanged();
  }

  const upcoming = (viewings || []).filter(v => !v.past);

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <span className={s.panelTitle}>Viewings &amp; deadlines</span>
        <button className={s.btn} onClick={() => setShowForm(!showForm)} style={{ fontSize: 11 }}>
          {showForm ? 'cancel' : '+ viewing'}
        </button>
      </div>
      <div className={s.panelBody}>
        {showForm && (
          <form onSubmit={addViewing} style={{ display: 'grid', gap: 8, marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid var(--border-color)' }}>
            <select className={s.statusSelect} value={form.listing_id} onChange={e => setForm({ ...form, listing_id: e.target.value })}>
              <option value="">— which flat? —</option>
              {(listings || []).map(l => <option key={l.id} value={l.id}>{l.title || l.address || l.id}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className={s.urlInput} type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ flex: 1 }} />
              <input className={s.urlInput} type="time" required value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} style={{ flex: 1 }} />
            </div>
            <input className={s.urlInput} placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
            <input className={s.urlInput} placeholder="Contact (name / phone)" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
            <button type="submit" className={`${s.btn} ${s.btnPrimary}`} style={{ fontSize: 12 }}>Save viewing</button>
          </form>
        )}

        {upcoming.length === 0 && (deadlines || []).length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.35 }}>Nothing scheduled.</div>
        )}

        {upcoming.map((v, i) => (
          <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 13, color: 'var(--heading-color)' }}>
              {v.date} · {v.time}
              {v.upcoming && <span style={{ color: '#fbbf24', fontSize: 11, marginLeft: 8 }}>soon</span>}
            </div>
            <div style={{ fontSize: 12, opacity: 0.45 }}>{v.address}{v.contact ? ` · ${v.contact}` : ''}</div>
          </div>
        ))}

        {(deadlines || []).filter(d => !d.done).map((d, i) => (
          <div key={`d${i}`} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="checkbox" onChange={() => markDone(i)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: d.overdue ? '#fca5a5' : 'var(--heading-color)' }}>{d.title}</div>
              <div style={{ fontSize: 11, opacity: 0.4 }}>{d.date}{d.overdue ? ' · overdue' : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function Apartment() {
  const [data, setData] = useState(null);
  const [tab, setTab]   = useState('shortlist');

  const reload = useCallback(() => {
    fetch('/api/desk/apartment').then(r => r.json()).then(setData).catch(() => {});
  }, []);
  useEffect(reload, [reload]);

  const listings = data?.listings || [];
  const shown = tab === 'shortlist'
    ? listings.filter(l => !['rejected', 'withdrawn'].includes(l.status))
    : listings;

  return (
    <Layout activeScrollbar={false}>
      <Head><title>Apartment · Desk</title><meta name="robots" content="noindex" /></Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Greifswald</span>
        </p>
        <h1 className="title text-uppercase">Apartment</h1>
      </HeaderNormal>

      <section className="container section-margin">
        <Stats stats={data?.stats} />
        <AddListing onAdded={reload} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 32, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['shortlist', 'all'].map(t => (
                <button key={t} className={s.btn} onClick={() => setTab(t)}
                  style={{ fontSize: 12, opacity: tab === t ? 1 : 0.45 }}>
                  {t} {t === 'shortlist' ? `(${listings.filter(l => !['rejected', 'withdrawn'].includes(l.status)).length})` : `(${listings.length})`}
                </button>
              ))}
            </div>

            {!data && <div className={s.loading}>Loading…</div>}
            {data && shown.length === 0 && (
              <div style={{ fontSize: 13, opacity: 0.4, padding: '40px 0' }}>
                No listings yet. Paste one above, or start from the portals on the right.
              </div>
            )}

            <div style={{ display: 'grid', gap: 20 }}>
              {shown.map(l => <ListingCard key={l.id} listing={l} onChanged={reload} />)}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 24 }}>
            <Schedule viewings={data?.viewings} deadlines={data?.deadlines} listings={listings} onChanged={reload} />
            <Dossier dossier={data?.dossier} onChanged={reload} />

            <div className={s.panel}>
              <div className={s.panelHeader}><span className={s.panelTitle}>Where to look</span></div>
              <div className={s.panelBody}>
                {PORTALS.map(p => (
                  <div key={p.name} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 13, color: '#8ab4f8', textDecoration: 'none', fontWeight: 600 }}>
                      {p.name}
                    </a>
                    <span style={{ fontSize: 10, opacity: 0.35, marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.kind}</span>
                    <div style={{ fontSize: 11, opacity: 0.4, marginTop: 2 }}>{p.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer className="background-section" />
    </Layout>
  );
}
