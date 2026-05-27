import { useState, useEffect, useCallback, useRef } from 'react';
import s from '../../styles/desk.module.css';

// ── Response templates ──────────────────────────────────────────────────────

const TEMPLATES = {
  accept_reviewer:  j => `Dear Editors,\n\nThank you for the invitation to review for ${j}. I am happy to serve as a reviewer and will submit my review by the stated deadline.\n\nKind regards,\nKundai Farai Sachikonye`,
  decline_reviewer: j => `Dear Editors,\n\nThank you for the review invitation for ${j}. Unfortunately I have conflicting commitments and am unable to take on this review at this time.\n\nKind regards,\nKundai Farai Sachikonye`,
  accept_editor:    j => `Dear Editorial Team,\n\nThank you for your invitation to join the editorial board of ${j}. I am pleased to accept.\n\nKind regards,\nKundai Farai Sachikonye`,
  decline_editor:   j => `Dear Editorial Team,\n\nThank you for considering me for the editorial board of ${j}. Due to current commitments I am not able to take on this role at this time.\n\nKind regards,\nKundai Farai Sachikonye`,
  acknowledge_offer: j => `Dear Editors,\n\nThank you for reaching out. I will keep ${j} in mind for future work.\n\nKind regards,\nKundai Farai Sachikonye`,
  decline_offer:    j => `Dear Editors,\n\nThank you for your interest. I am not planning a submission at this time.\n\nKind regards,\nKundai Farai Sachikonye`,
};

const RESPONSE_ACTIONS = {
  reviewer: ['accept_reviewer',  'decline_reviewer'],
  editor:   ['accept_editor',    'decline_editor'],
  offer:    ['acknowledge_offer', 'decline_offer'],
};

const CAT_ICON = { reviewer: '🔬', editor: '✏', offer: '📬', uncertain: '❓', spam: '🗑', likely_spam: '⚠' };

// ── Horizontal bar chart ────────────────────────────────────────────────────

function HBar({ data, color = 'var(--theme-color)' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      {data.map(({ label, count }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <span style={{
            width: 110, fontSize: 11, color: 'var(--font-color)', opacity: 0.45,
            textAlign: 'right', flexShrink: 0, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {label}
          </span>
          <div style={{ flex: 1, height: 4, background: 'var(--assistant-color)', borderRadius: 2 }}>
            <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
          <span style={{ width: 22, fontSize: 11, color: 'var(--font-color)', opacity: 0.35, flexShrink: 0, textAlign: 'right' }}>
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Inbox dashboard ─────────────────────────────────────────────────────────

function InboxDashboard({ existingEntries, onNewEntries }) {
  const [status, setStatus]       = useState('idle');
  const [stats, setStats]         = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [errorMsg, setErrorMsg]   = useState('');
  const [autoTracked, setAutoTracked] = useState(0);

  const entriesRef = useRef(existingEntries);
  useEffect(() => { entriesRef.current = existingEntries; }, [existingEntries]);

  const load = useCallback(async (force = false) => {
    setStatus('loading');
    setErrorMsg('');
    try {
      const res  = await fetch(force ? '/api/desk/inbox?refresh=1' : '/api/desk/inbox');
      const data = await res.json();

      if (data.error === 'not_configured') { setStatus('not_configured'); return; }
      if (data.error) { setStatus('error'); setErrorMsg(data.error); return; }

      const emails = data.emails || [];
      setFetchedAt(data.fetched_at);

      // ── Aggregate stats ──
      const spam       = emails.filter(e => (e.classification?.score ?? 100) >= 70).length;
      const likelySpam = emails.filter(e => { const sc = e.classification?.score ?? 100; return sc >= 45 && sc < 70; }).length;
      const reviewer   = emails.filter(e => e.classification?.category === 'reviewer').length;
      const editor     = emails.filter(e => e.classification?.category === 'editor').length;
      const freeOffers = emails.filter(e => e.classification?.freePublicationOffered).length;
      const legit      = emails.filter(e => (e.classification?.score ?? 100) < 45).length;

      // ── Research domain bar chart ──
      const domainCounts = {};
      for (const e of emails) {
        for (const kw of (e.classification?.domainKeywords || [])) {
          domainCounts[kw] = (domainCounts[kw] || 0) + 1;
        }
      }
      const topDomains = Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([label, count]) => ({ label, count }));

      // ── Publisher bar chart ──
      const pubCounts = {};
      for (const e of emails) {
        const d = e.classification?.senderDomain;
        if (d) pubCounts[d] = (pubCounts[d] || 0) + 1;
      }
      const topPubs = Object.entries(pubCounts)
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([label, count]) => ({ label, count }));

      setStats({ total: emails.length, spam, likelySpam, reviewer, editor, freeOffers, legit, topDomains, topPubs });
      setStatus('loaded');

      // ── Auto-track legitimate invitations ──
      const current = entriesRef.current;
      const toTrack = emails.filter(e => {
        const cat   = e.classification?.category;
        const score = e.classification?.score ?? 100;
        if (!['reviewer', 'editor', 'offer'].includes(cat) || score >= 45) return false;
        const jName = (e.classification?.journalName || '').toLowerCase().trim();
        if (!jName) return false;
        return !current.some(entry => {
          const en = (entry.journal_name || '').toLowerCase();
          return en === jName || en.includes(jName) || jName.includes(en);
        });
      });

      if (toTrack.length > 0) {
        let tracked = 0;
        for (const email of toTrack) {
          const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
          const jName = email.classification.journalName;
          const slug  = jName.toLowerCase().replace(/[^\w]+/g, '_').slice(0, 40);
          const entry = {
            id:                       `${today}_${slug}_auto`,
            date_received:            new Date().toISOString().split('T')[0],
            category:                 email.classification.category,
            journal_name:             jName,
            publisher:                email.classification.senderDomain || '',
            domain:                   (email.classification.domainKeywords || []).slice(0, 3).join(', '),
            status:                   'pending',
            role:                     email.classification.category === 'reviewer' ? 'reviewer'
                                    : email.classification.category === 'editor'   ? 'associate_editor' : '',
            email_snippet:            email.body.slice(0, 600),
            is_doaj_listed:           null,
            doaj_subjects:            [],
            free_publication_offered: email.classification.freePublicationOffered || false,
            deadline:                 '',
            notes:                    'Auto-tracked from Gmail',
            response_sent:            false,
          };
          try {
            await fetch('/api/desk/journals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'add', entry }),
            });
            tracked++;
          } catch {}
        }
        if (tracked > 0) {
          setAutoTracked(tracked);
          onNewEntries();
        }
      }
    } catch (e) {
      setStatus('error');
      setErrorMsg(e.message);
    }
  }, [onNewEntries]);

  useEffect(() => { load(); }, [load]);

  if (status === 'not_configured') {
    return (
      <div className={s.inboxSetup}>
        <div className={s.scanLabel}>Gmail — setup required</div>
        <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.5, lineHeight: 1.8, marginTop: 6 }}>
          Run <code>node scripts/gmail_auth.js</code> from the <code>web/</code> directory to authorise Gmail access.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className={s.scanLabel} style={{ margin: 0 }}>Gmail · last 14 days</span>
        {fetchedAt && (
          <span style={{ fontSize: 10, color: 'var(--font-color)', opacity: 0.25 }}>
            {new Date(fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button className={s.btn} style={{ marginLeft: 'auto', fontSize: 11 }}
          onClick={() => load(true)} disabled={status === 'loading'}>
          {status === 'loading' ? '…' : '↻ Refresh'}
        </button>
      </div>

      {status === 'error' && (
        <div style={{ fontSize: 11, color: '#f87171', marginBottom: 8 }}>Error: {errorMsg}</div>
      )}

      {status === 'loading' && !stats && (
        <div className={s.loading} style={{ padding: '8px 0' }}>Reading inbox…</div>
      )}

      {stats && (
        <>
          {/* Stats row */}
          <div className={s.inboxStatsRow}>
            <div className={s.inboxStat}>
              <span className={s.inboxStatNum}>{stats.total}</span>
              <span className={s.inboxStatLabel}>emails</span>
            </div>
            <div className={s.inboxStat}>
              <span className={s.inboxStatNum} style={{ color: '#f87171' }}>{stats.spam + stats.likelySpam}</span>
              <span className={s.inboxStatLabel}>blocked</span>
            </div>
            <div className={s.inboxStat}>
              <span className={s.inboxStatNum} style={{ color: '#60a5fa' }}>{stats.reviewer + stats.editor}</span>
              <span className={s.inboxStatLabel}>invitations</span>
            </div>
            <div className={s.inboxStat}>
              <span className={s.inboxStatNum} style={{ color: '#fbbf24' }}>{stats.freeOffers}</span>
              <span className={s.inboxStatLabel}>free pub</span>
            </div>
          </div>

          {autoTracked > 0 && (
            <div style={{ fontSize: 11, color: 'var(--theme-color)', margin: '6px 0 10px' }}>
              ✓ {autoTracked} new invitation{autoTracked > 1 ? 's' : ''} auto-added below
            </div>
          )}

          {/* Category breakdown bar */}
          {stats.total > 0 && (
            <div className={s.inboxBreakdownBar} style={{ marginBottom: 12 }}
              title={`spam ${stats.spam} · likely spam ${stats.likelySpam} · reviewer ${stats.reviewer} · editor ${stats.editor} · legit ${stats.legit}`}>
              <div style={{ width: `${(stats.spam / stats.total) * 100}%`, background: '#f87171' }} />
              <div style={{ width: `${(stats.likelySpam / stats.total) * 100}%`, background: '#fbbf24' }} />
              <div style={{ width: `${(stats.editor / stats.total) * 100}%`, background: '#60a5fa' }} />
              <div style={{ width: `${(stats.reviewer / stats.total) * 100}%`, background: '#818cf8' }} />
              <div style={{ width: `${Math.max(0, (stats.legit - stats.editor - stats.reviewer) / stats.total) * 100}%`, background: '#4ade80' }} />
            </div>
          )}

          {stats.topDomains.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className={s.scanLabel} style={{ marginBottom: 8 }}>Research areas publishers target you in</div>
              <HBar data={stats.topDomains} color="var(--theme-color)" />
            </div>
          )}

          {stats.topPubs.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className={s.scanLabel} style={{ marginBottom: 8 }}>Publishers by email volume</div>
              <HBar data={stats.topPubs} color="#60a5fa" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Pending decision card ───────────────────────────────────────────────────

function PendingCard({ entry, onUpdated }) {
  const [draft, setDraft]   = useState('');
  const [copied, setCopied] = useState(false);

  const actions = RESPONSE_ACTIONS[entry.category] || [];
  const jName   = entry.journal_name || 'this journal';

  function buildDraft(actionKey) {
    setDraft(TEMPLATES[actionKey]?.(jName) || '');
  }

  async function copyAndMark(status) {
    if (draft) {
      try { await navigator.clipboard.writeText(draft); } catch {}
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    await fetch('/api/desk/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', entryId: entry.id, status }),
    });
    onUpdated();
  }

  async function skip() {
    await fetch('/api/desk/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', entryId: entry.id, status: 'declined' }),
    });
    onUpdated();
  }

  return (
    <div className={s.journalEntry}>
      <div className={s.journalEntryHeader}>
        <div className={s.journalName}>
          {CAT_ICON[entry.category] || '❓'} {entry.journal_name || 'Unknown journal'}
        </div>
        <span className={`${s.badge} ${entry.category === 'editor' ? s.badgeOk : s.badgeInfo}`}>
          {entry.category}
        </span>
      </div>
      <div className={s.journalMeta}>
        {entry.domain && <>{entry.domain} · </>}
        {entry.date_received}
        {entry.free_publication_offered && ' · 💰 free pub'}
        {entry.notes === 'Auto-tracked from Gmail' && (
          <span style={{ color: 'var(--theme-color)', marginLeft: 6, fontSize: 10 }}>auto</span>
        )}
      </div>

      {!draft ? (
        <div className={s.btnGroup}>
          {actions[0] && (
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => buildDraft(actions[0])}>
              Draft accept
            </button>
          )}
          {actions[1] && (
            <button className={s.btn} onClick={() => buildDraft(actions[1])}>
              Draft decline
            </button>
          )}
          <button className={s.btn} style={{ marginLeft: 'auto', opacity: 0.4 }} onClick={skip}>
            Skip
          </button>
        </div>
      ) : (
        <>
          <div className={s.draftBox}>{draft}</div>
          <div className={s.btnGroup} style={{ marginTop: 8 }}>
            <button className={`${s.btn} ${s.btnPrimary}`}
              onClick={() => copyAndMark(draft.includes('pleased to accept') || draft.includes('happy to serve') ? 'accepted' : 'declined')}>
              {copied ? '✓ Copied & done' : 'Copy & mark done'}
            </button>
            <button className={s.btn} onClick={() => setDraft('')}>Back</button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Manual scan panel (hidden by default) ───────────────────────────────────

function ScanPanel({ onSaved }) {
  const [text, setText]           = useState('');
  const [result, setResult]       = useState(null);
  const [scanning, setScanning]   = useState(false);
  const [journalName, setJournalName] = useState('');
  const [role, setRole]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  async function scan() {
    if (!text.trim()) return;
    setScanning(true); setResult(null); setSaved(false);
    const res  = await fetch('/api/desk/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emailText: text }) });
    const data = await res.json();
    setResult(data); setJournalName(data.journalName || ''); setScanning(false);
  }

  async function trackEntry() {
    setSaving(true);
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const slug  = (journalName || 'unknown').toLowerCase().replace(/[^\w]+/g, '_').slice(0, 40);
    const entry = {
      id: `${today}_${slug}`, date_received: new Date().toISOString().split('T')[0],
      category: result.category, journal_name: journalName, publisher: result.senderDomain || '',
      domain: (result.domainKeywords || []).slice(0, 3).join(', '), status: 'pending', role,
      email_snippet: text.slice(0, 600), is_doaj_listed: null, doaj_subjects: [],
      free_publication_offered: result.freePublicationOffered || false, deadline: '', notes: '', response_sent: false,
    };
    await fetch('/api/desk/journals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', entry }) });
    setSaving(false); setSaved(true); setText(''); setResult(null); onSaved();
  }

  const isLegit  = result && result.score < 45;
  const verdict  = !result ? null
    : result.score >= 70   ? { label: 'SPAM',         color: '#f87171' }
    : result.score >= 45   ? { label: 'LIKELY SPAM',  color: '#fbbf24' }
    : result.category === 'editor'   ? { label: 'EDITORIAL APPOINTMENT', color: '#4ade80' }
    : result.category === 'reviewer' ? { label: 'REVIEWER INVITATION',   color: '#60a5fa' }
    : { label: 'OFFER / LEGITIMATE', color: '#4ade80' };

  return (
    <div className={s.scanArea}>
      <div className={s.scanLabel}>Scan incoming email</div>
      <textarea className={s.scanTextarea} placeholder="Paste email here…" value={text} onChange={e => setText(e.target.value)} />
      <div className={s.btnGroup}>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={scan} disabled={scanning || !text.trim()}>
          {scanning ? 'Scanning…' : 'Scan'}
        </button>
        <button className={s.btn} onClick={() => { setText(''); setResult(null); setSaved(false); }}>Clear</button>
      </div>
      {result && (
        <div className={s.scanResult}>
          <div className={s.scanResultScore} style={{ color: verdict.color }}>{verdict.label} · Spam score: {result.score}/100</div>
          <div className={s.scanResultNotes}>
            {result.signals.filter(sg => !sg.isSpam).map((sg, i) => <div key={i} className={s.scanResultNote}><span>✅</span> {sg.label}</div>)}
            {result.signals.filter(sg => sg.isSpam).map((sg, i) => <div key={i} className={s.scanResultNote}><span style={{color:'#f87171'}}>⚠</span> {sg.label}</div>)}
            {result.domainKeywords.length > 0 && <div className={s.scanResultNote} style={{marginTop:4}}><span>🔬</span> Domain: {result.domainKeywords.slice(0,4).join(', ')}</div>}
          </div>
          {isLegit && !saved && (
            <div style={{ marginTop: 10 }}>
              <div className={s.scanLabel} style={{ marginBottom: 6 }}>Track this entry</div>
              <input type="text" placeholder="Journal name" value={journalName} onChange={e => setJournalName(e.target.value)}
                style={{ width:'100%', background:'var(--assistant-color)', border:'1px solid var(--border-color)', color:'var(--font-color)', padding:'5px 8px', borderRadius:4, fontSize:12, marginBottom:6, boxSizing:'border-box' }} />
              <input type="text" placeholder="Role (reviewer / associate_editor / …)" value={role} onChange={e => setRole(e.target.value)}
                style={{ width:'100%', background:'var(--assistant-color)', border:'1px solid var(--border-color)', color:'var(--font-color)', padding:'5px 8px', borderRadius:4, fontSize:12, marginBottom:8, boxSizing:'border-box' }} />
              <div className={s.btnGroup}>
                <button className={`${s.btn} ${s.btnPrimary}`} onClick={trackEntry} disabled={saving}>{saving ? 'Saving…' : 'Track entry'}</button>
                <button className={s.btn} onClick={() => setResult(null)}>Ignore</button>
              </div>
            </div>
          )}
          {saved && <div style={{ fontSize: 12, color: '#4ade80', marginTop: 8 }}>✅ Saved to tracker</div>}
        </div>
      )}
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────

export default function JournalPanel({ entries, onUpdate }) {
  const [showScan,     setShowScan]     = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  const active  = (entries || []).filter(e => !['spam', 'likely_spam'].includes(e.category));
  const pending = active.filter(e => e.status === 'pending');
  const done    = active.filter(e => e.status !== 'pending');

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <span className={s.panelTitle}>Journal inbox</span>
        <span className={s.panelCount}>{pending.length} pending</span>
      </div>
      <div className={s.panelBody}>

        {/* Inbox intelligence — reads Gmail, shows charts, auto-tracks */}
        <InboxDashboard existingEntries={entries || []} onNewEntries={onUpdate} />

        {/* Action queue */}
        {!entries ? (
          <div className={s.loading}>Loading…</div>
        ) : (
          <>
            {pending.length > 0 && (
              <>
                <div className={s.sectionHeading}>Pending decisions ({pending.length})</div>
                {pending.map(e => <PendingCard key={e.id} entry={e} onUpdated={onUpdate} />)}
              </>
            )}

            {pending.length === 0 && done.length > 0 && (
              <div className={s.empty}>No pending decisions — all caught up.</div>
            )}

            {done.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
                  <div className={s.sectionHeading} style={{ margin: 0 }}>Resolved ({done.length})</div>
                  <button className={s.btn} style={{ fontSize: 10 }} onClick={() => setShowResolved(v => !v)}>
                    {showResolved ? 'hide' : 'show'}
                  </button>
                </div>
                {showResolved && done.map(e => (
                  <div key={e.id} className={s.journalEntry} style={{ opacity: 0.45 }}>
                    <div className={s.journalEntryHeader}>
                      <div className={s.journalName}>{CAT_ICON[e.category] || '❓'} {e.journal_name}</div>
                      <span className={`${s.badge} ${e.status === 'accepted' ? s.badgeOk : s.badgeMuted}`}>{e.status}</span>
                    </div>
                    <div className={s.journalMeta}>{e.domain && <>{e.domain} · </>}{e.date_received}</div>
                  </div>
                ))}
              </>
            )}

            {active.length === 0 && (
              <div className={s.empty}>No tracked entries yet — Gmail invitations will appear here automatically.</div>
            )}
          </>
        )}

        {/* Manual scan — collapsed by default */}
        <div style={{ marginTop: 20, borderTop: '1px solid var(--border-color)', paddingTop: 14 }}>
          <button className={s.btn} style={{ fontSize: 11 }} onClick={() => setShowScan(v => !v)}>
            {showScan ? 'Hide manual scan ↑' : '+ Scan email manually'}
          </button>
          {showScan && <div style={{ marginTop: 10 }}><ScanPanel onSaved={onUpdate} /></div>}
        </div>

      </div>
    </div>
  );
}
