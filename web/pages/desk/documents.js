import { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import s from '../../styles/desk.module.css';

// ── Checklist modal ─────────────────────────────────────────────────────────

function ChecklistModal({ doc, onClose }) {
  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalTitle}>{doc.name} — Renewal Checklist</div>
        <div className={s.modalMeta}>Office: {doc.office}</div>
        <div className={s.modalMeta}>Address: {doc.address}</div>
        <div className={s.modalMeta}>Phone: {doc.phone}</div>
        <div className={s.modalMeta}>
          Lead time: {doc.leadMonths} months before expiry &nbsp;·&nbsp; Processing: ~{doc.processingWeeks} weeks
        </div>
        <div style={{ marginTop: 16 }}>
          {doc.requirements.map((req, i) => (
            <div key={i} className={s.checklistItem}>
              <span style={{ color: '#555', flexShrink: 0 }}>{i + 1}.</span>
              <div>
                <div>{req.item}</div>
                {req.note && <div className={s.checklistNote}>↳ {req.note}</div>}
              </div>
            </div>
          ))}
        </div>
        {doc.warning && <div className={s.modalWarning}>{doc.warning}</div>}
        <div className={s.btnGroup} style={{ marginTop: 20 }}>
          <button className={s.btn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Document card ───────────────────────────────────────────────────────────

const URGENCY_BADGE = {
  expired: { label: 'EXPIRED',  cls: s.badgeDanger },
  overdue: { label: 'OVERDUE',  cls: s.badgeDanger },
  urgent:  { label: 'URGENT',   cls: s.badgeWarning },
  soon:    { label: 'SOON',     cls: s.badgeWarning },
  ok:      { label: 'OK',       cls: s.badgeOk },
  unknown: { label: 'NOT SET',  cls: s.badgeMuted },
};

const PROGRESS_CLS = {
  expired: s.progressDanger, overdue: s.progressDanger,
  urgent: s.progressWarning, soon: s.progressWarning,
  ok: s.progressOk, unknown: s.progressDanger,
};

function fmtDays(n) {
  if (n === null || n === undefined) return '—';
  if (n < 0) return `${Math.abs(n)}d overdue`;
  if (n === 0) return 'today';
  return `${n} days`;
}

function progressPct(d) {
  if (d === null) return 0;
  if (d <= 0) return 100;
  return Math.max(0, Math.min(100, 100 - (d / 365) * 100));
}

// What the desk read from mail about this document. "to confirm": a mail says so, but it is
// not yours until you tap Confirm (or a second mail agrees); "Not right" lets you correct it.
const STATE_COLOR = { known: '#34d399', 'to confirm': '#fbbf24', unknown: 'rgba(187,187,187,0.35)', 'not applicable': 'rgba(187,187,187,0.35)' };

function Fact({ f, onUpdate }) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(f.value || f.leader || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const shown = f.value || f.leader;
  const send = async v => {
    setBusy(true); setErr('');
    const r = await fetch('/api/desk/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: f.slot, value: v }) }).then(x => x.json()).catch(() => ({ error: 'no answer' }));
    setBusy(false);
    if (r.error) setErr(r.error); else { setEdit(false); onUpdate(); }
  };
  const quote = f.evidence?.[f.evidence.length - 1]?.cue;
  return (
    <div style={{ fontSize: 12, padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ opacity: 0.55 }}>{f.label}</span>
        <span>
          <span style={{ color: 'var(--heading-color)', fontWeight: 600 }}>{shown || '—'}</span>
          <span style={{ color: STATE_COLOR[f.state], marginLeft: 8, fontSize: 10, textTransform: 'uppercase' }}>{f.state}</span>
        </span>
      </div>
      {quote && <div style={{ opacity: 0.4, marginTop: 2, fontStyle: 'italic' }}>{quote}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
        {f.state === 'to confirm' && shown && !busy && (
          <button className={`${s.btn} ${s.btnPrimary}`} style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => send(shown)}>Confirm</button>)}
        {!busy && (
          <button className={s.btn} style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => setEdit(!edit)}>
            {edit ? 'Cancel' : f.state === 'unknown' ? 'Add' : 'Not right'}
          </button>)}
        {busy && <span style={{ opacity: 0.5 }}>saving…</span>}
      </div>
      {edit && (
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <input type={f.kind === 'date' ? 'date' : 'text'} value={value} onChange={e => setValue(e.target.value)}
            style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)', padding: '5px 8px', borderRadius: 4, fontSize: 12 }} />
          <button className={`${s.btn} ${s.btnPrimary}`} style={{ fontSize: 11 }} onClick={() => value && send(value)}>Save</button>
          <button className={s.btn} style={{ fontSize: 11 }} onClick={() => send(null)} title="This does not apply to me">n/a</button>
        </div>)}
      {err && <div style={{ color: '#f87171', marginTop: 4 }}>{err}</div>}
    </div>
  );
}

function Facts({ facts, onUpdate }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.35, marginBottom: 4 }}>From your mail</div>
      {facts.map(f => <Fact key={f.slot} f={f} onUpdate={onUpdate} />)}
    </div>
  );
}

function DocCard({ doc, onUpdate }) {
  const [showChecklist, setShowChecklist] = useState(false);
  const [editingExpiry, setEditingExpiry] = useState(false);
  const [expiryInput,   setExpiryInput]   = useState(doc.expiryDate || '');
  const [saving,        setSaving]        = useState(false);

  const badge = URGENCY_BADGE[doc.urgency] || URGENCY_BADGE.unknown;
  const pct   = progressPct(doc.daysUntilExpiry);

  async function saveExpiry() {
    if (!expiryInput) return;
    setSaving(true);
    await fetch('/api/desk/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typeId: doc.typeId, expiryDate: expiryInput }),
    });
    setSaving(false);
    setEditingExpiry(false);
    onUpdate();
  }

  return (
    <>
      <div style={{
        background: 'var(--assistant-color, #101010)',
        border: `1px solid ${doc.urgency === 'expired' || doc.urgency === 'overdue' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 10, padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--heading-font)', fontSize: 18, fontWeight: 700, color: 'var(--heading-color)', marginBottom: 4 }}>
              {doc.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.4 }}>
              {doc.office}
            </div>
          </div>
          <span className={`${s.badge} ${badge.cls}`}>{badge.label}</span>
        </div>

        {doc.expiryDate ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 4 }}>Expires</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--heading-color)' }}>{doc.expiryDate}</div>
                <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.5 }}>{fmtDays(doc.daysUntilExpiry)}</div>
              </div>
              {doc.renewalDeadline && (
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 4 }}>Apply by</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: doc.daysUntilDeadline < 0 ? '#f87171' : 'var(--heading-color)' }}>{doc.renewalDeadline}</div>
                  <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.5 }}>{fmtDays(doc.daysUntilDeadline)}</div>
                </div>
              )}
            </div>
            <div className={s.progress}>
              <div className={`${s.progressBar} ${PROGRESS_CLS[doc.urgency] || s.progressDanger}`} style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: 'var(--font-color)', opacity: 0.35 }}>Expiry date not set — click below to add it.</div>
        )}

        {doc.notes && <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.45, lineHeight: 1.6 }}>{doc.notes}</div>}

        {doc.facts?.length > 0 && <Facts facts={doc.facts} onUpdate={onUpdate} />}

        <div className={s.btnGroup}>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowChecklist(true)}>Renewal checklist</button>
          <button className={s.btn} onClick={() => setEditingExpiry(v => !v)}>
            {editingExpiry ? 'Cancel' : 'Set expiry date'}
          </button>
        </div>

        {editingExpiry && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="date" value={expiryInput} onChange={e => setExpiryInput(e.target.value)}
              style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)', padding: '6px 10px', borderRadius: 4, fontSize: 13 }} />
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={saveExpiry} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {showChecklist && <ChecklistModal doc={doc} onClose={() => setShowChecklist(false)} />}
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [docs, setDocs] = useState(null);
  const fetch_ = useCallback(() => fetch('/api/desk/documents').then(r => r.json()).then(setDocs), []);
  useEffect(() => { fetch_(); }, [fetch_]);

  const list = Object.values(docs || {}).filter(d => d && d.typeId);
  const urgent = list.filter(d => ['expired','overdue','urgent'].includes(d.urgency)).length;

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Documents — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Desk · Documents</span>
        </p>
        <h1 className="title text-uppercase">Documents</h1>
        {urgent > 0 && (
          <p style={{ color: '#f87171', fontSize: 13, marginTop: 12 }}>
            🚨 {urgent} document{urgent > 1 ? 's' : ''} require immediate action
          </p>
        )}
      </HeaderNormal>

      <section className="container section-margin" data-dsn-title="Documents">
        {!docs ? (
          <div style={{ color: 'var(--font-color)', opacity: 0.4 }}>Loading…</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
            {docs.error && <div style={{ color: '#f87171', fontSize: 13 }}>{docs.error}</div>}
            {list.map(doc => (
              <DocCard key={doc.typeId} doc={doc} onUpdate={fetch_} />
            ))}
          </div>
        )}
      </section>

      <Footer className="background-section" />
    </Layout>
  );
}
