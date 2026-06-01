import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import s from '../../styles/desk.module.css';

const HOME_STATION_NAME = process.env.NEXT_PUBLIC_HOME_STATION || 'München Hbf';
const HOME_STATION_ID   = process.env.NEXT_PUBLIC_HOME_STATION_ID || '8000261';

const STATUS_COLOR  = { planning: '#fbbf24', booked: '#4ade80', completed: 'rgba(187,187,187,0.4)', cancelled: '#f87171' };
const STATUS_OPTIONS = ['planning', 'booked', 'completed', 'cancelled'];

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
}
function delayStr(mins) {
  if (!mins) return null;
  return mins > 0 ? `+${mins}` : String(mins);
}

// ── Station autocomplete ──────────────────────────────────────────────────────

function StationInput({ label, value, onChange, onSelect, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open,        setOpen]        = useState(false);
  const timer = useRef(null);

  function onType(e) {
    const q = e.target.value;
    onChange(q);
    clearTimeout(timer.current);
    if (q.length < 2) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/desk/travel/stations?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data || []);
        setOpen(true);
      } catch {}
    }, 300);
  }

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      {label && <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 5 }}>{label}</div>}
      <input className={s.urlInput} value={value} onChange={onType} placeholder={placeholder || 'Station name…'}
        style={{ width: '100%', fontSize: 13 }} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 6, zIndex: 100, marginTop: 3, overflow: 'hidden' }}>
          {suggestions.map(s => (
            <div key={s.id} onClick={() => { onSelect(s); setOpen(false); }}
              style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', color: 'var(--font-color)', borderBottom: '1px solid var(--border-color)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-color)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Journey result card ───────────────────────────────────────────────────────

function JourneyCard({ journey, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const dep   = new Date(journey.departure);
  const arr   = new Date(journey.arrival);
  const delay = journey.legs[0]?.delay_dep;

  return (
    <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {/* Times */}
        <div style={{ fontFamily: 'var(--heading-font)', fontSize: 22, fontWeight: 700, color: 'var(--heading-color)', minWidth: 110 }}>
          {fmt(journey.departure)}
          <span style={{ fontSize: 13, opacity: 0.4, margin: '0 6px' }}>→</span>
          {fmt(journey.arrival)}
        </div>

        {/* Duration + changes */}
        <div style={{ fontSize: 13, color: 'var(--font-color)', opacity: 0.55 }}>
          {journey.duration}
          <span style={{ marginLeft: 10, opacity: 0.5 }}>
            {journey.changes === 0 ? 'direct' : `${journey.changes} change${journey.changes > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* First leg line name */}
        <div style={{ flex: 1 }}>
          {journey.legs.map((l, i) => (
            <span key={i} style={{ fontSize: 11, color: 'var(--theme-color)', background: 'rgba(20,191,181,0.08)', border: '1px solid rgba(20,191,181,0.2)', borderRadius: 3, padding: '2px 7px', marginRight: 5 }}>
              {l.line}
            </span>
          ))}
        </div>

        {delay != null && <span style={{ fontSize: 11, color: delay > 0 ? '#f87171' : '#4ade80' }}>{delayStr(delay)}min</span>}

        <div style={{ display: 'flex', gap: 6 }}>
          <button className={s.btn} onClick={() => setExpanded(v => !v)} style={{ fontSize: 11 }}>
            {expanded ? 'Less' : 'Details'}
          </button>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => onSave(journey)} style={{ fontSize: 11 }}>
            Save trip
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
          {journey.legs.map((leg, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 12, color: 'var(--font-color)', opacity: 0.65 }}>
              <div style={{ minWidth: 45, fontFamily: 'var(--heading-font)', fontWeight: 600, color: 'var(--heading-color)', opacity: 1 }}>
                {fmt(leg.dep)}
              </div>
              <div style={{ flex: 1 }}>
                {leg.from}
                {leg.depPlat && <span style={{ marginLeft: 6, color: 'var(--theme-color)', fontSize: 11 }}>Pl. {leg.depPlat}</span>}
                {leg.delay_dep ? <span style={{ marginLeft: 6, color: '#f87171', fontSize: 11 }}>{delayStr(leg.delay_dep)}min</span> : null}
              </div>
              <div style={{ color: 'var(--theme-color)', fontSize: 11, fontWeight: 600 }}>{leg.line}</div>
            </div>
          ))}
          {/* Final arrival */}
          <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--font-color)', opacity: 0.65 }}>
            <div style={{ minWidth: 45, fontFamily: 'var(--heading-font)', fontWeight: 600, color: 'var(--heading-color)', opacity: 1 }}>
              {fmt(journey.arrival)}
            </div>
            <div>{journey.legs[journey.legs.length - 1]?.to}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Save trip modal ───────────────────────────────────────────────────────────

function SaveTripModal({ journey, toName, toId, onClose, onSaved }) {
  const [destDate,  setDestDate]  = useState('');
  const [retDate,   setRetDate]   = useState('');
  const [purpose,   setPurpose]   = useState('');
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);

  // Pre-fill date from journey departure
  useEffect(() => {
    if (journey?.departure) setDestDate(journey.departure.slice(0, 10));
  }, [journey]);

  async function save() {
    setSaving(true);
    await fetch('/api/desk/trips', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: toName, destination_id: toId, depart_date: destDate, return_date: retDate || null, purpose, notes, journey }),
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className={s.modalTitle}>Save trip to {toName}</div>
        {journey && (
          <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.5, marginBottom: 16 }}>
            {fmt(journey.departure)} → {fmt(journey.arrival)} · {journey.duration} · {journey.changes === 0 ? 'direct' : `${journey.changes} changes`}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 5 }}>Depart</div>
            <input type="date" value={destDate} onChange={e => setDestDate(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)', padding: '6px 10px', borderRadius: 4, fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 5 }}>Return (optional)</div>
            <input type="date" value={retDate} onChange={e => setRetDate(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)', padding: '6px 10px', borderRadius: 4, fontSize: 13 }} />
          </div>
        </div>
        <input className={s.urlInput} value={purpose} onChange={e => setPurpose(e.target.value)}
          placeholder="Purpose (e.g. conference, holiday, visit)" style={{ width: '100%', marginBottom: 10, fontSize: 12 }} />
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…"
          style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)', padding: '8px 10px', borderRadius: 4, fontSize: 12, fontFamily: 'var(--body-font)', resize: 'vertical', minHeight: 70, marginBottom: 16 }} />
        <div className={s.btnGroup}>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={save} disabled={saving || !destDate}>
            {saving ? 'Saving…' : 'Save trip'}
          </button>
          <button className={s.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Trip card ─────────────────────────────────────────────────────────────────

function TripCard({ trip, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const nights = trip.return_date
    ? Math.round((new Date(trip.return_date) - new Date(trip.depart_date)) / 86400000)
    : null;
  const daysAway = Math.round((new Date(trip.depart_date) - new Date()) / 86400000);
  const isPast   = daysAway < 0;

  async function updateStatus(status) {
    await fetch('/api/desk/trips', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: trip.id, status }) });
    onUpdated();
  }

  async function del() {
    await fetch(`/api/desk/trips?id=${trip.id}`, { method: 'DELETE' });
    onUpdated();
  }

  return (
    <div style={{ background: 'var(--assistant-color)', border: `1px solid ${trip.status === 'booked' ? 'rgba(74,222,128,0.2)' : 'var(--border-color)'}`, borderRadius: 10, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontFamily: 'var(--heading-font)', fontSize: 18, fontWeight: 700, color: 'var(--heading-color)', marginBottom: 3 }}>{trip.destination}</div>
          <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.45 }}>
            {fmtDate(trip.depart_date)}
            {trip.return_date && <> → {fmtDate(trip.return_date)} · {nights} night{nights !== 1 ? 's' : ''}</>}
            {!isPast && daysAway >= 0 && <span style={{ marginLeft: 10, color: 'var(--theme-color)', opacity: 0.8 }}>in {daysAway}d</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span className={`${s.badge}`} style={{ background: `${STATUS_COLOR[trip.status]}20`, color: STATUS_COLOR[trip.status] }}>{trip.status}</span>
        </div>
      </div>

      {trip.purpose && <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.45, marginBottom: 6 }}>{trip.purpose}</div>}
      {trip.notes   && <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.35, lineHeight: 1.6, marginBottom: 10 }}>{trip.notes}</div>}

      {trip.journey && (
        <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.4, background: 'var(--bg-color)', borderRadius: 5, padding: '6px 10px', marginBottom: 10 }}>
          {fmt(trip.journey.departure)} → {fmt(trip.journey.arrival)} · {trip.journey.duration}
          {trip.journey.legs?.map((l, i) => <span key={i} style={{ marginLeft: 8, color: 'var(--theme-color)', opacity: 0.7 }}>{l.line}</span>)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <select className={s.statusSelect} value={trip.status} onChange={e => updateStatus(e.target.value)} style={{ fontSize: 11 }}>
          {STATUS_OPTIONS.map(st => <option key={st} value={st}>{st}</option>)}
        </select>
        <button className={s.btn} onClick={del} style={{ fontSize: 11, color: '#f87171', borderColor: 'rgba(248,113,113,0.2)' }}>Delete</button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TravelPage() {
  const [fromName, setFromName] = useState(HOME_STATION_NAME);
  const [fromId,   setFromId]   = useState(HOME_STATION_ID);
  const [toName,   setToName]   = useState('');
  const [toId,     setToId]     = useState('');
  const [depDate,  setDepDate]  = useState('');
  const [depTime,  setDepTime]  = useState('09:00');

  const [searching,  setSearching]  = useState(false);
  const [journeys,   setJourneys]   = useState(null);
  const [searchErr,  setSearchErr]  = useState('');

  const [trips,      setTrips]      = useState(null);
  const [saveTarget, setSaveTarget] = useState(null);

  const loadTrips = useCallback(() => fetch('/api/desk/trips').then(r => r.json()).then(setTrips).catch(() => {}), []);
  useEffect(() => { loadTrips(); }, [loadTrips]);

  // Default date = today
  useEffect(() => {
    setDepDate(new Date().toISOString().slice(0, 10));
  }, []);

  async function search(e) {
    e.preventDefault();
    if (!fromId || !toId) { setSearchErr('Select stations from the dropdown suggestions'); return; }
    setSearching(true); setSearchErr(''); setJourneys(null);
    const dep = `${depDate}T${depTime}:00`;
    const res = await fetch(`/api/desk/travel/search?from=${fromId}&to=${toId}&departure=${encodeURIComponent(dep)}&results=6`);
    const data = await res.json();
    if (data.error) { setSearchErr(data.error); setSearching(false); return; }
    setJourneys(data.journeys || []);
    setSearching(false);
  }

  const upcoming  = (trips || []).filter(t => !['completed','cancelled'].includes(t.status));
  const past      = (trips || []).filter(t =>  ['completed','cancelled'].includes(t.status));

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Travel — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Desk · Travel</span>
        </p>
        <h1 className="title text-uppercase">Travel Planner</h1>
        {trips && (
          <p style={{ color: 'var(--font-color)', opacity: 0.4, fontSize: 13, marginTop: 12 }}>
            {upcoming.length} upcoming · DB HAFAS live search
          </p>
        )}
      </HeaderNormal>

      {/* Search form */}
      <section className="container section-margin" data-dsn-title="Search">
        <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '28px 28px', marginBottom: 32 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 20 }}>Find trains · Deutsche Bahn</div>
          <form onSubmit={search}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr 140px 100px', gap: 12, alignItems: 'end' }}>
              <StationInput label="From" value={fromName} onChange={setFromName}
                onSelect={s => { setFromName(s.name); setFromId(s.id); }} placeholder="Departure station" />
              <div style={{ padding: '0 4px', fontSize: 16, color: 'var(--font-color)', opacity: 0.3, paddingBottom: 8 }}>→</div>
              <StationInput label="To" value={toName} onChange={v => { setToName(v); setToId(''); }}
                onSelect={s => { setToName(s.name); setToId(s.id); }} placeholder="Destination station" />
              <div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 5 }}>Date</div>
                <input type="date" value={depDate} onChange={e => setDepDate(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)', padding: '6px 8px', borderRadius: 4, fontSize: 13 }} />
              </div>
              <div>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 5 }}>Time</div>
                <input type="time" value={depTime} onChange={e => setDepTime(e.target.value)}
                  style={{ width: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)', padding: '6px 8px', borderRadius: 4, fontSize: 13 }} />
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <button type="submit" className={`${s.btn} ${s.btnPrimary}`} disabled={searching || !fromId || !toName}
                style={{ padding: '8px 24px', fontSize: 13 }}>
                {searching ? 'Searching…' : 'Find trains'}
              </button>
              {searchErr && <span style={{ marginLeft: 14, fontSize: 12, color: '#f87171' }}>{searchErr}</span>}
              {!fromId && fromName.length > 1 && <span style={{ marginLeft: 14, fontSize: 11, color: 'var(--font-color)', opacity: 0.4 }}>Select from dropdown</span>}
            </div>
          </form>
        </div>

        {/* Journey results */}
        {journeys !== null && (
          <div style={{ marginBottom: 40 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 16 }}>
              {fromName} → {toName} · {journeys.length} options
            </div>
            {journeys.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--font-color)', opacity: 0.4 }}>No journeys found.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {journeys.map(j => (
                    <JourneyCard key={j.id} journey={j} onSave={j => setSaveTarget({ journey: j, toName, toId })} />
                  ))}
                </div>
            }
          </div>
        )}
      </section>

      {/* Upcoming trips */}
      {upcoming.length > 0 && (
        <section className="container section-margin" data-dsn-title="Upcoming">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 20 }}>
            Upcoming ({upcoming.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {upcoming.map(t => <TripCard key={t.id} trip={t} onUpdated={loadTrips} />)}
          </div>
        </section>
      )}

      {/* Past trips */}
      {past.length > 0 && (
        <section className="container section-margin" data-dsn-title="Past">
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 20 }}>
            Past ({past.length})
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, opacity: 0.5 }}>
            {past.map(t => <TripCard key={t.id} trip={t} onUpdated={loadTrips} />)}
          </div>
        </section>
      )}

      {trips?.length === 0 && (
        <section className="container">
          <div style={{ fontSize: 13, color: 'var(--font-color)', opacity: 0.3 }}>No trips yet. Search for trains above and save a trip.</div>
        </section>
      )}

      {/* Save modal */}
      {saveTarget && (
        <SaveTripModal
          journey={saveTarget.journey}
          toName={saveTarget.toName}
          toId={saveTarget.toId}
          onClose={() => setSaveTarget(null)}
          onSaved={loadTrips}
        />
      )}

      <Footer className="background-section" />
    </Layout>
  );
}
