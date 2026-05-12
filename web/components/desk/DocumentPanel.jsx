import { useState } from 'react';
import s from '../../styles/desk.module.css';

const URGENCY_BADGE = {
  expired:  { label: 'EXPIRED',  cls: s.badgeDanger },
  overdue:  { label: 'OVERDUE',  cls: s.badgeDanger },
  urgent:   { label: 'URGENT',   cls: s.badgeWarning },
  soon:     { label: 'SOON',     cls: s.badgeWarning },
  ok:       { label: 'OK',       cls: s.badgeOk },
  unknown:  { label: 'NOT SET',  cls: s.badgeMuted },
};

const PROGRESS_CLS = {
  expired: s.progressDanger,
  overdue: s.progressDanger,
  urgent:  s.progressWarning,
  soon:    s.progressWarning,
  ok:      s.progressOk,
  unknown: s.progressDanger,
};

function fmtDays(n) {
  if (n === null || n === undefined) return '—';
  if (n < 0) return `${Math.abs(n)}d ago`;
  if (n === 0) return 'today';
  return `${n}d`;
}

function progressPct(daysUntilExpiry) {
  if (daysUntilExpiry === null) return 0;
  if (daysUntilExpiry <= 0) return 100;
  return Math.max(0, Math.min(100, 100 - (daysUntilExpiry / 365) * 100));
}

function ChecklistModal({ doc, onClose }) {
  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalTitle}>{doc.name} — Renewal Checklist</div>

        <div className={s.modalMeta}>Office: {doc.office}</div>
        <div className={s.modalMeta}>Address: {doc.address}</div>
        <div className={s.modalMeta}>Phone: {doc.phone}</div>
        <div className={s.modalMeta}>
          Lead time: {doc.leadMonths} months before expiry &nbsp;·&nbsp;
          Processing: ~{doc.processingWeeks} weeks
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

        {doc.warning && (
          <div className={s.modalWarning}>{doc.warning}</div>
        )}

        <div className={s.btnGroup} style={{ marginTop: 20 }}>
          <button className={s.btn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function DocCard({ doc, onUpdate }) {
  const [showChecklist, setShowChecklist] = useState(false);
  const [editingExpiry, setEditingExpiry] = useState(false);
  const [expiryInput, setExpiryInput] = useState(doc.expiryDate || '');
  const [saving, setSaving] = useState(false);

  const badge = URGENCY_BADGE[doc.urgency] || URGENCY_BADGE.unknown;
  const pct = progressPct(doc.daysUntilExpiry);

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
      <div className={s.docCard}>
        <div className={s.docCardHeader}>
          <div className={s.docName}>{doc.name}</div>
          <span className={`${s.badge} ${badge.cls}`}>{badge.label}</span>
        </div>

        {doc.expiryDate ? (
          <>
            <div className={s.docMeta}>
              <strong>Expires:</strong> {doc.expiryDate} ({fmtDays(doc.daysUntilExpiry)})
            </div>
            {doc.renewalDeadline && (
              <div className={s.docMeta}>
                <strong>Apply by:</strong> {doc.renewalDeadline} ({fmtDays(doc.daysUntilDeadline)})
              </div>
            )}
            <div className={s.progress}>
              <div
                className={`${s.progressBar} ${PROGRESS_CLS[doc.urgency] || s.progressDanger}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        ) : (
          <div className={s.docMeta} style={{ color: '#444' }}>Expiry date not set</div>
        )}

        {doc.notes && <div className={s.docNote}>{doc.notes}</div>}

        <div className={s.btnGroup}>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowChecklist(true)}>
            Checklist
          </button>
          <button className={s.btn} onClick={() => setEditingExpiry(v => !v)}>
            Set expiry
          </button>
        </div>

        {editingExpiry && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="date"
              value={expiryInput}
              onChange={e => setExpiryInput(e.target.value)}
              style={{
                background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#ccc',
                padding: '4px 8px', borderRadius: 4, fontSize: 12,
              }}
            />
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={saveExpiry} disabled={saving}>
              {saving ? '...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {showChecklist && <ChecklistModal doc={doc} onClose={() => setShowChecklist(false)} />}
    </>
  );
}

export default function DocumentPanel({ docs, onUpdate }) {
  const count = Object.values(docs || {}).length;

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <span className={s.panelTitle}>Documents</span>
        <span className={s.panelCount}>{count}</span>
      </div>
      <div className={s.panelBody}>
        {!docs ? (
          <div className={s.loading}>Loading…</div>
        ) : count === 0 ? (
          <div className={s.empty}>No documents tracked</div>
        ) : (
          Object.values(docs).map(doc => (
            <DocCard key={doc.typeId} doc={doc} onUpdate={onUpdate} />
          ))
        )}
      </div>
    </div>
  );
}
