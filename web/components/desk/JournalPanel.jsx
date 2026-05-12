import { useState, useEffect } from 'react';
import s from '../../styles/desk.module.css';

const CATEGORY_ICON = {
  spam: '🗑', likely_spam: '⚠', uncertain: '❓',
  offer: '📬', reviewer: '🔬', editor: '✏',
};

const CATEGORY_BADGE = {
  spam:        s.badgeDanger,
  likely_spam: s.badgeWarning,
  uncertain:   s.badgeMuted,
  offer:       s.badgeInfo,
  reviewer:    s.badgeInfo,
  editor:      s.badgeOk,
};

const STATUS_BADGE = {
  pending:   s.badgeWarning,
  accepted:  s.badgeOk,
  declined:  s.badgeMuted,
  submitted: s.badgeInfo,
  expired:   s.badgeDanger,
};

const RESPONSE_ACTIONS = {
  editor:   ['accept_editor', 'decline_editor'],
  reviewer: ['accept_reviewer', 'decline_reviewer'],
  offer:    ['acknowledge_offer', 'decline_offer'],
};

function ScanPanel({ onSaved }) {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [journalName, setJournalName] = useState('');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function scan() {
    if (!text.trim()) return;
    setScanning(true);
    setResult(null);
    setSaved(false);
    const res = await fetch('/api/desk/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailText: text }),
    });
    const data = await res.json();
    setResult(data);
    setJournalName(data.journalName || '');
    setScanning(false);
  }

  async function trackEntry() {
    setSaving(true);
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const slug = (journalName || 'unknown').toLowerCase().replace(/[^\w]+/g, '_').slice(0, 40);
    const entry = {
      id: `${today}_${slug}`,
      date_received: new Date().toISOString().split('T')[0],
      category: result.category,
      journal_name: journalName,
      publisher: result.senderDomain || '',
      domain: (result.domainKeywords || []).slice(0, 3).join(', '),
      status: 'pending',
      role: role,
      email_snippet: text.slice(0, 600),
      is_doaj_listed: null,
      doaj_subjects: [],
      free_publication_offered: result.freePublicationOffered || false,
      deadline: '',
      notes: '',
      response_sent: false,
    };
    await fetch('/api/desk/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', entry }),
    });
    setSaving(false);
    setSaved(true);
    setText('');
    setResult(null);
    onSaved();
  }

  const isLegit = result && result.score < 45;
  const verdict =
    !result ? null :
    result.score >= 70 ? { label: 'SPAM — discard', color: '#f87171' } :
    result.score >= 45 ? { label: 'LIKELY SPAM', color: '#fbbf24' } :
    result.category === 'editor' ? { label: 'EDITORIAL APPOINTMENT', color: '#4ade80' } :
    result.category === 'reviewer' ? { label: 'REVIEWER INVITATION', color: '#60a5fa' } :
    { label: 'OFFER / LEGITIMATE', color: '#4ade80' };

  return (
    <div className={s.scanArea}>
      <div className={s.scanLabel}>Scan incoming email</div>
      <textarea
        className={s.scanTextarea}
        placeholder="Paste email here…"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <div className={s.btnGroup}>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={scan} disabled={scanning || !text.trim()}>
          {scanning ? 'Scanning…' : 'Scan'}
        </button>
        <button className={s.btn} onClick={() => { setText(''); setResult(null); setSaved(false); }}>
          Clear
        </button>

      </div>

      {result && (
        <div className={s.scanResult}>
          <div className={s.scanResultScore} style={{ color: verdict.color }}>
            {verdict.label} &nbsp;·&nbsp; Spam score: {result.score}/100
          </div>
          <div className={s.scanResultNotes}>
            {result.signals.filter(s => !s.isSpam).map((sig, i) => (
              <div key={i} className={s.scanResultNote}><span>✅</span> {sig.label}</div>
            ))}
            {result.signals.filter(s => s.isSpam).map((sig, i) => (
              <div key={i} className={s.scanResultNote}><span style={{color:'#f87171'}}>⚠</span> {sig.label}</div>
            ))}
            {result.domainKeywords.length > 0 && (
              <div className={s.scanResultNote} style={{ marginTop: 4 }}>
                <span>🔬</span> Domain match: {result.domainKeywords.slice(0, 4).join(', ')}
              </div>
            )}
          </div>

          {isLegit && !saved && (
            <div style={{ marginTop: 10 }}>
              <div className={s.scanLabel} style={{ marginBottom: 6 }}>Track this entry</div>
              <input
                type="text"
                placeholder="Journal name"
                value={journalName}
                onChange={e => setJournalName(e.target.value)}
                style={{
                  width: '100%', background: '#141414', border: '1px solid #222',
                  color: '#bbb', padding: '5px 8px', borderRadius: 4,
                  fontSize: 12, marginBottom: 6, boxSizing: 'border-box',
                }}
              />
              <input
                type="text"
                placeholder="Role (reviewer / associate_editor / board_member / leave blank)"
                value={role}
                onChange={e => setRole(e.target.value)}
                style={{
                  width: '100%', background: '#141414', border: '1px solid #222',
                  color: '#bbb', padding: '5px 8px', borderRadius: 4,
                  fontSize: 12, marginBottom: 8, boxSizing: 'border-box',
                }}
              />
              <div className={s.btnGroup}>
                <button className={`${s.btn} ${s.btnPrimary}`} onClick={trackEntry} disabled={saving}>
                  {saving ? 'Saving…' : 'Track entry'}
                </button>
                <button className={s.btn} onClick={() => setResult(null)}>Ignore</button>
              </div>
            </div>
          )}

          {saved && <div style={{ fontSize: 12, color: '#4ade80', marginTop: 8 }}>✅ Saved to journal tracker</div>}
        </div>
      )}
    </div>
  );
}

function RespondModal({ entry, onClose, onUpdated }) {
  const actions = RESPONSE_ACTIONS[entry.category] || [];
  const [action, setAction] = useState(actions[0] || '');
  const [draft, setDraft] = useState('');
  const [generating, setGenerating] = useState(false);

  // Build a simple template response client-side (no API key needed for basic templates)
  function buildTemplate(act) {
    const j = entry.journal_name || 'your journal';
    const templates = {
      accept_editor: `Dear Editorial Team,\n\nThank you for your invitation to join the editorial board of ${j}. I am pleased to accept and look forward to contributing to the review process.\n\nPlease let me know the next steps and any responsibilities expected.\n\nKind regards,\nKundai Farai Sachikonye`,
      decline_editor: `Dear Editorial Team,\n\nThank you for considering me for the editorial board of ${j}. Due to current research commitments I am not able to take on additional editorial responsibilities at this time.\n\nI hope to collaborate in the future.\n\nKind regards,\nKundai Farai Sachikonye`,
      accept_reviewer: `Dear Editors,\n\nThank you for the invitation to review for ${j}. I am happy to serve as a reviewer and will submit my review by the stated deadline.\n\nKind regards,\nKundai Farai Sachikonye`,
      decline_reviewer: `Dear Editors,\n\nThank you for the review invitation for ${j}. Unfortunately I have conflicting commitments and am unable to take on this review at this time.\n\nKind regards,\nKundai Farai Sachikonye`,
      acknowledge_offer: `Dear Editors,\n\nThank you for reaching out and for the generous offer to publish in ${j} without an article processing charge. I have relevant work in progress and will be in touch when the manuscript is ready.\n\nKind regards,\nKundai Farai Sachikonye`,
      decline_offer: `Dear Editors,\n\nThank you for your interest and the kind offer. I am not currently planning a submission at this time.\n\nKind regards,\nKundai Farai Sachikonye`,
    };
    return templates[act] || '';
  }

  function generate() {
    setDraft(buildTemplate(action));
  }

  async function updateStatus() {
    const status = action.startsWith('accept') ? 'accepted' : 'declined';
    await fetch('/api/desk/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', entryId: entry.id, status }),
    });
    onUpdated();
    onClose();
  }

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={e => e.stopPropagation()}>
        <div className={s.modalTitle}>Respond — {entry.journal_name}</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {actions.map(act => (
            <button
              key={act}
              className={`${s.btn} ${action === act ? s.btnPrimary : ''}`}
              onClick={() => { setAction(act); setDraft(''); }}
            >
              {act.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className={s.btnGroup}>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={generate}>
            Generate draft
          </button>
        </div>

        {draft && (
          <>
            <div className={s.draftBox}>{draft}</div>
            <div className={s.btnGroup} style={{ marginTop: 10 }}>
              <button
                className={`${s.btn} ${s.btnPrimary}`}
                onClick={() => navigator.clipboard.writeText(draft)}
              >
                Copy to clipboard
              </button>
              <button className={`${s.btn} ${s.btnPrimary}`} onClick={updateStatus}>
                Mark as {action.startsWith('accept') ? 'accepted' : 'declined'}
              </button>
            </div>
          </>
        )}

        <div className={s.btnGroup} style={{ marginTop: 12 }}>
          <button className={s.btn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function JournalEntry({ entry, onUpdated }) {
  const [showRespond, setShowRespond] = useState(false);
  const icon = CATEGORY_ICON[entry.category] || '❓';
  const catBadge = CATEGORY_BADGE[entry.category] || s.badgeMuted;
  const statusBadge = STATUS_BADGE[entry.status] || s.badgeMuted;
  const hasActions = RESPONSE_ACTIONS[entry.category];

  return (
    <>
      <div className={s.journalEntry}>
        <div className={s.journalEntryHeader}>
          <div className={s.journalName}>{icon} {entry.journal_name || 'Unknown journal'}</div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <span className={`${s.badge} ${catBadge}`}>{entry.category}</span>
            <span className={`${s.badge} ${statusBadge}`}>{entry.status}</span>
          </div>
        </div>
        <div className={s.journalMeta}>
          {entry.domain && <>{entry.domain} · </>}
          {entry.date_received}
          {entry.free_publication_offered && ' · 💰 free pub'}
          {entry.role && ` · ${entry.role}`}
        </div>
        {entry.email_snippet && (
          <div className={s.journalSnippet}>{entry.email_snippet.slice(0, 100)}</div>
        )}
        {entry.status === 'pending' && hasActions && (
          <div className={s.btnGroup}>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setShowRespond(true)}>
              Respond
            </button>
            <button className={s.btn} onClick={async () => {
              await fetch('/api/desk/journals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update', entryId: entry.id, status: 'declined' }),
              });
              onUpdated();
            }}>
              Decline
            </button>
          </div>
        )}
      </div>
      {showRespond && (
        <RespondModal entry={entry} onClose={() => setShowRespond(false)} onUpdated={onUpdated} />
      )}
    </>
  );
}

const SCORE_COLOR = score =>
  score >= 70 ? '#f87171' : score >= 45 ? '#fbbf24' : '#4ade80';

const SCORE_LABEL = score =>
  score >= 70 ? 'spam' : score >= 45 ? 'likely spam' : 'legit';

function InboxEmail({ email, onDismiss, onTracked }) {
  const [expanded, setExpanded] = useState(false);
  const [journalName, setJournalName] = useState(email.classification?.journalName || '');
  const [role, setRole] = useState('');
  const [saving, setSaving] = useState(false);

  const score = email.classification?.score ?? 100;
  const isLegit = score < 45;
  const dateStr = new Date(email.date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  });

  async function track() {
    setSaving(true);
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const slug = (journalName || 'unknown').toLowerCase().replace(/[^\w]+/g, '_').slice(0, 40);
    const entry = {
      id: `${today}_${slug}`,
      date_received: new Date().toISOString().split('T')[0],
      category: email.classification?.category || 'uncertain',
      journal_name: journalName,
      publisher: email.classification?.senderDomain || '',
      domain: (email.classification?.domainKeywords || []).slice(0, 3).join(', '),
      status: 'pending',
      role,
      email_snippet: email.body.slice(0, 600),
      is_doaj_listed: null,
      doaj_subjects: [],
      free_publication_offered: email.classification?.freePublicationOffered || false,
      deadline: '',
      notes: '',
      response_sent: false,
    };
    await fetch('/api/desk/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', entry }),
    });
    await fetch('/api/desk/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', uid: email.uid }),
    });
    setSaving(false);
    onTracked();
  }

  return (
    <div className={s.inboxEmail} style={{ opacity: isLegit ? 1 : 0.55 }}>
      <div className={s.inboxEmailHeader}>
        <div className={s.inboxSubject}>{email.subject.slice(0, 70)}</div>
        <span style={{ color: SCORE_COLOR(score), fontSize: 11, flexShrink: 0 }}>
          {score} · {SCORE_LABEL(score)}
        </span>
      </div>
      <div className={s.inboxMeta}>
        {email.from.split('<')[0].trim() || email.fromAddress} · {dateStr}
      </div>
      {expanded && (
        <div className={s.inboxBody}>{email.body.slice(0, 400)}</div>
      )}
      <div className={s.btnGroup} style={{ marginTop: 6 }}>
        {isLegit && !expanded && (
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setExpanded(true)}>
            Track
          </button>
        )}
        {expanded && (
          <>
            <input
              type="text"
              placeholder="Journal name"
              value={journalName}
              onChange={e => setJournalName(e.target.value)}
              style={{
                background: '#141414', border: '1px solid #222', color: '#bbb',
                padding: '4px 8px', borderRadius: 4, fontSize: 11, flex: 1,
              }}
            />
            <input
              type="text"
              placeholder="Role (optional)"
              value={role}
              onChange={e => setRole(e.target.value)}
              style={{
                background: '#141414', border: '1px solid #222', color: '#bbb',
                padding: '4px 8px', borderRadius: 4, fontSize: 11, width: 120,
              }}
            />
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={track} disabled={saving || !journalName.trim()}>
              {saving ? '…' : 'Save'}
            </button>
            <button className={s.btn} onClick={() => setExpanded(false)}>Cancel</button>
          </>
        )}
        <button className={s.btn} style={{ marginLeft: 'auto' }} onClick={onDismiss}>
          ✕
        </button>
        {!expanded && (
          <button className={s.btn} onClick={() => setExpanded(v => !v)}>
            {expanded ? 'Hide' : 'Preview'}
          </button>
        )}
      </div>
    </div>
  );
}

function InboxSection({ onTracked }) {
  const [status, setStatus] = useState('idle'); // idle | loading | loaded | error | not_configured
  const [emails, setEmails] = useState([]);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAll, setShowAll] = useState(false);

  async function loadInbox(force = false) {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch(force ? '/api/desk/inbox?refresh=1' : '/api/desk/inbox');
      const data = await res.json();
      if (data.error === 'not_configured') {
        setStatus('not_configured');
      } else if (data.error) {
        setStatus('error');
        setErrorMsg(data.error);
      } else {
        setEmails(data.emails || []);
        setFetchedAt(data.fetched_at);
        setStatus('loaded');
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message);
    }
  }

  useEffect(() => { loadInbox(); }, []);

  function dismiss(uid) {
    fetch('/api/desk/inbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss', uid }),
    });
    setEmails(prev => prev.filter(e => e.uid !== uid));
  }

  const legit = emails.filter(e => (e.classification?.score ?? 100) < 45);
  const filtered = emails.filter(e => (e.classification?.score ?? 100) >= 45);
  const visible = showAll ? emails : legit;

  if (status === 'not_configured') {
    return (
      <div className={s.inboxSetup}>
        <div className={s.scanLabel}>Gmail inbox — setup required</div>
        <div style={{ fontSize: 12, color: '#555', lineHeight: 1.8, marginTop: 8 }}>
          1. <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{ color: '#666' }}>console.cloud.google.com</a> → new project → enable <strong style={{ color: '#666' }}>Gmail API</strong><br />
          2. APIs &amp; Services → Credentials → Create → <strong style={{ color: '#666' }}>OAuth 2.0 Client ID → Desktop app</strong><br />
          3. Download JSON → rename to <code style={{ color: '#666' }}>credentials.json</code> → put in <code style={{ color: '#666' }}>web/</code><br />
          4. Run:
        </div>
        <pre className={s.inboxSetupCode}>node web/scripts/gmail_auth.js</pre>
        <div style={{ fontSize: 11, color: '#444' }}>
          Browser opens → sign in with Gmail → done. Restart dev server.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span className={s.scanLabel} style={{ margin: 0 }}>Gmail inbox</span>
        {status === 'loaded' && (
          <>
            <span style={{ fontSize: 11, color: '#444' }}>
              {legit.length} to review · {filtered.length} spam filtered
            </span>
            {fetchedAt && (
              <span style={{ fontSize: 10, color: '#333', marginLeft: 'auto' }}>
                {new Date(fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </>
        )}
        <button
          className={s.btn}
          style={{ marginLeft: status === 'loaded' ? 0 : 'auto', fontSize: 11 }}
          onClick={() => loadInbox(true)}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '…' : '↻ Refresh'}
        </button>
      </div>

      {status === 'error' && (
        <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>
          Error: {errorMsg}
        </div>
      )}

      {status === 'loaded' && (
        <>
          {visible.length === 0 && legit.length === 0 && (
            <div className={s.empty} style={{ padding: '10px 0' }}>
              No journal-related emails in the last 14 days.
            </div>
          )}
          {visible.map(email => (
            <InboxEmail
              key={email.uid}
              email={email}
              onDismiss={() => dismiss(email.uid)}
              onTracked={() => { onTracked(); loadInbox(); }}
            />
          ))}
          {filtered.length > 0 && (
            <button
              className={s.btn}
              style={{ fontSize: 11, marginTop: 4 }}
              onClick={() => setShowAll(v => !v)}
            >
              {showAll ? 'Hide spam' : `Show ${filtered.length} filtered`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function JournalPanel({ entries, onUpdate }) {
  const active = (entries || []).filter(e => !['spam', 'likely_spam'].includes(e.category));
  const pending = active.filter(e => e.status === 'pending');
  const done = active.filter(e => e.status !== 'pending');

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <span className={s.panelTitle}>Journal inbox</span>
        <span className={s.panelCount}>{pending.length} pending</span>
      </div>
      <div className={s.panelBody}>
        <InboxSection onTracked={onUpdate} />
        <ScanPanel onSaved={onUpdate} />

        {!entries ? (
          <div className={s.loading}>Loading…</div>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <div className={s.sectionHeading}>Pending decisions</div>
                {pending.map(e => <JournalEntry key={e.id} entry={e} onUpdated={onUpdate} />)}
              </>
            )}
            {done.length > 0 && (
              <>
                <div className={s.sectionHeading}>Resolved</div>
                {done.map(e => <JournalEntry key={e.id} entry={e} onUpdated={onUpdate} />)}
              </>
            )}
            {active.length === 0 && (
              <div className={s.empty}>No journal entries yet. Scan an email above.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
