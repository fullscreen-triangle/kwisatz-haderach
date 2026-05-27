import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import s from '../../styles/desk.module.css';

// ── Response templates ──────────────────────────────────────────────────────

const TEMPLATES = {
  accept_reviewer:   j => `Dear Editors,\n\nThank you for the invitation to review for ${j}. I am happy to serve as a reviewer and will submit my review by the stated deadline.\n\nKind regards,\nKundai Farai Sachikonye`,
  decline_reviewer:  j => `Dear Editors,\n\nThank you for the review invitation for ${j}. Unfortunately I have conflicting commitments and am unable to take on this review at this time.\n\nKind regards,\nKundai Farai Sachikonye`,
  accept_editor:     j => `Dear Editorial Team,\n\nThank you for your invitation to join the editorial board of ${j}. I am pleased to accept.\n\nKind regards,\nKundai Farai Sachikonye`,
  decline_editor:    j => `Dear Editorial Team,\n\nThank you for considering me for the editorial board of ${j}. Due to current commitments I am unable to take on this role at this time.\n\nKind regards,\nKundai Farai Sachikonye`,
  acknowledge_offer: j => `Dear Editors,\n\nThank you for reaching out. I will keep ${j} in mind for future work.\n\nKind regards,\nKundai Farai Sachikonye`,
  decline_offer:     j => `Dear Editors,\n\nThank you for your interest. I am not planning a submission at this time.\n\nKind regards,\nKundai Farai Sachikonye`,
};

const RESPONSE_ACTIONS = {
  reviewer: ['accept_reviewer',  'decline_reviewer'],
  editor:   ['accept_editor',    'decline_editor'],
  offer:    ['acknowledge_offer', 'decline_offer'],
};

const CAT_ICON = { reviewer: '🔬', editor: '✏', offer: '📬', uncertain: '❓' };

// ── Horizontal bar chart ────────────────────────────────────────────────────

function HBar({ data, color = 'var(--theme-color)' }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div>
      {data.map(({ label, count }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ width: 160, fontSize: 12, color: 'var(--font-color)', opacity: 0.5, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
          <div style={{ flex: 1, height: 5, background: 'var(--assistant-color)', borderRadius: 3 }}>
            <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
          </div>
          <span style={{ width: 28, fontSize: 13, fontWeight: 600, color: 'var(--font-color)', opacity: 0.5, flexShrink: 0 }}>
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Inbox intelligence section ──────────────────────────────────────────────

function InboxIntelligence({ existingEntries, onNewEntries }) {
  const [status,      setStatus]      = useState('idle');
  const [stats,       setStats]       = useState(null);
  const [fetchedAt,   setFetchedAt]   = useState(null);
  const [errorMsg,    setErrorMsg]    = useState('');
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

      const spam       = emails.filter(e => (e.classification?.score ?? 100) >= 70).length;
      const likelySpam = emails.filter(e => { const sc = e.classification?.score ?? 100; return sc >= 45 && sc < 70; }).length;
      const reviewer   = emails.filter(e => e.classification?.category === 'reviewer').length;
      const editor     = emails.filter(e => e.classification?.category === 'editor').length;
      const freeOffers = emails.filter(e => e.classification?.freePublicationOffered).length;
      const legit      = emails.filter(e => (e.classification?.score ?? 100) < 45).length;

      const domainCounts = {};
      for (const e of emails) {
        for (const kw of (e.classification?.domainKeywords || [])) {
          domainCounts[kw] = (domainCounts[kw] || 0) + 1;
        }
      }
      const topDomains = Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));

      const pubCounts = {};
      for (const e of emails) {
        const d = e.classification?.senderDomain;
        if (d) pubCounts[d] = (pubCounts[d] || 0) + 1;
      }
      const topPubs = Object.entries(pubCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));

      setStats({ total: emails.length, spam, likelySpam, reviewer, editor, freeOffers, legit, topDomains, topPubs });
      setStatus('loaded');

      // Auto-track legitimate invitations
      const current  = entriesRef.current;
      const toTrack  = emails.filter(e => {
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
            id: `${today}_${slug}_auto`,
            date_received: new Date().toISOString().split('T')[0],
            category: email.classification.category,
            journal_name: jName,
            publisher: email.classification.senderDomain || '',
            domain: (email.classification.domainKeywords || []).slice(0, 3).join(', '),
            status: 'pending',
            role: email.classification.category === 'reviewer' ? 'reviewer' : email.classification.category === 'editor' ? 'associate_editor' : '',
            email_snippet: email.body.slice(0, 600),
            is_doaj_listed: null, doaj_subjects: [],
            free_publication_offered: email.classification.freePublicationOffered || false,
            deadline: '', notes: 'Auto-tracked from Gmail', response_sent: false,
          };
          try {
            await fetch('/api/desk/journals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', entry }) });
            tracked++;
          } catch {}
        }
        if (tracked > 0) { setAutoTracked(tracked); onNewEntries(); }
      }
    } catch (e) {
      setStatus('error'); setErrorMsg(e.message);
    }
  }, [onNewEntries]);

  useEffect(() => { load(); }, [load]);

  if (status === 'not_configured') {
    return (
      <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 24, marginBottom: 40 }}>
        <div style={{ fontWeight: 600, color: 'var(--heading-color)', marginBottom: 8 }}>Gmail — setup required</div>
        <div style={{ fontSize: 13, color: 'var(--font-color)', opacity: 0.5 }}>
          Run <code>node scripts/gmail_auth.js</code> from the <code>web/</code> directory to authorise Gmail access.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 50 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h4 style={{ fontFamily: 'var(--heading-font)', color: 'var(--heading-color)', margin: 0 }}>Gmail · last 14 days</h4>
        {fetchedAt && (
          <span style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.3 }}>
            fetched {new Date(fetchedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <button className={s.btn} style={{ marginLeft: 'auto' }} onClick={() => load(true)} disabled={status === 'loading'}>
          {status === 'loading' ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {status === 'error' && <div style={{ color: '#f87171', marginBottom: 16 }}>Error: {errorMsg}</div>}
      {status === 'loading' && !stats && <div style={{ color: 'var(--font-color)', opacity: 0.4 }}>Reading inbox…</div>}

      {stats && (
        <>
          {/* Big stat numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { n: stats.total,                  label: 'emails read',  color: 'var(--font-color)' },
              { n: stats.spam + stats.likelySpam, label: 'spam blocked', color: '#f87171' },
              { n: stats.legit,                   label: 'legitimate',   color: '#34d399' },
              { n: stats.reviewer + stats.editor, label: 'invitations',  color: 'var(--theme-color)' },
              { n: stats.freeOffers,              label: 'free pub offers', color: '#fbbf24' },
            ].map(({ n, label, color }) => (
              <div key={label} style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--heading-font)', fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.35, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Breakdown bar */}
          {stats.total > 0 && (
            <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--assistant-color)', marginBottom: 32 }}>
              <div style={{ width: `${(stats.spam / stats.total) * 100}%`, background: '#f87171' }} title={`spam: ${stats.spam}`} />
              <div style={{ width: `${(stats.likelySpam / stats.total) * 100}%`, background: '#fbbf24' }} title={`likely spam: ${stats.likelySpam}`} />
              <div style={{ width: `${(stats.editor / stats.total) * 100}%`, background: '#60a5fa' }} title={`editor: ${stats.editor}`} />
              <div style={{ width: `${(stats.reviewer / stats.total) * 100}%`, background: 'var(--theme-color)' }} title={`reviewer: ${stats.reviewer}`} />
              <div style={{ width: `${Math.max(0, (stats.legit - stats.editor - stats.reviewer) / stats.total) * 100}%`, background: '#34d399' }} title={`other legit: ${stats.legit - stats.editor - stats.reviewer}`} />
            </div>
          )}

          {autoTracked > 0 && (
            <div style={{ color: 'var(--theme-color)', marginBottom: 24, fontSize: 13 }}>
              ✓ {autoTracked} new invitation{autoTracked > 1 ? 's' : ''} automatically added to tracker below
            </div>
          )}

          {/* Charts side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 16 }}>
                Research areas publishers target you in
              </div>
              <HBar data={stats.topDomains} color="var(--theme-color)" />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 16 }}>
                Publishers by email volume
              </div>
              <HBar data={stats.topPubs} color="#60a5fa" />
            </div>
          </div>
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

  async function copyAndMark(status) {
    if (draft) { try { await navigator.clipboard.writeText(draft); } catch {} }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    await fetch('/api/desk/journals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', entryId: entry.id, status }) });
    onUpdated();
  }

  async function skip() {
    await fetch('/api/desk/journals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update', entryId: entry.id, status: 'declined' }) });
    onUpdated();
  }

  return (
    <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--heading-font)', fontSize: 15, fontWeight: 600, color: 'var(--heading-color)' }}>
          {CAT_ICON[entry.category] || '❓'} {entry.journal_name || 'Unknown journal'}
        </div>
        <span className={`${s.badge} ${entry.category === 'editor' ? s.badgeOk : s.badgeInfo}`}>{entry.category}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.4, marginBottom: 16 }}>
        {entry.domain && <>{entry.domain} · </>}{entry.date_received}
        {entry.notes === 'Auto-tracked from Gmail' && <span style={{ color: 'var(--theme-color)', marginLeft: 8 }}>auto</span>}
      </div>

      {!draft ? (
        <div className={s.btnGroup}>
          {actions[0] && <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => setDraft(TEMPLATES[actions[0]]?.(jName) || '')}>Draft accept</button>}
          {actions[1] && <button className={s.btn} onClick={() => setDraft(TEMPLATES[actions[1]]?.(jName) || '')}>Draft decline</button>}
          <button className={s.btn} style={{ marginLeft: 'auto', opacity: 0.4 }} onClick={skip}>Skip</button>
        </div>
      ) : (
        <>
          <div className={s.draftBox}>{draft}</div>
          <div className={s.btnGroup} style={{ marginTop: 10 }}>
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

// ── Page ───────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const [entries, setEntries]       = useState(null);
  const [showResolved, setShowResolved] = useState(false);

  const fetchEntries = useCallback(() => fetch('/api/desk/journals').then(r => r.json()).then(setEntries), []);
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const active  = (entries || []).filter(e => !['spam', 'likely_spam'].includes(e.category));
  const pending = active.filter(e => e.status === 'pending');
  const done    = active.filter(e => e.status !== 'pending');

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Inbox — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Desk · Inbox</span>
        </p>
        <h1 className="title text-uppercase">Inbox</h1>
        {pending.length > 0 && (
          <p style={{ color: 'var(--theme-color)', fontSize: 13, marginTop: 12 }}>
            {pending.length} pending decision{pending.length > 1 ? 's' : ''}
          </p>
        )}
      </HeaderNormal>

      <section className="container section-margin" data-dsn-title="Email Intelligence">
        <InboxIntelligence existingEntries={entries || []} onNewEntries={fetchEntries} />
      </section>

      <section className="container section-margin" data-dsn-title="Pending Decisions">
        <div style={{ fontFamily: 'var(--heading-font)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 24 }}>
          Pending decisions {pending.length > 0 && `(${pending.length})`}
        </div>
        {!entries ? (
          <div style={{ color: 'var(--font-color)', opacity: 0.4 }}>Loading…</div>
        ) : pending.length === 0 ? (
          <div style={{ color: 'var(--font-color)', opacity: 0.35, fontSize: 14 }}>No pending decisions — all caught up.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {pending.map(e => <PendingCard key={e.id} entry={e} onUpdated={fetchEntries} />)}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="container section-margin" data-dsn-title="History">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--heading-font)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--font-color)', opacity: 0.35 }}>
              History ({done.length})
            </div>
            <button className={s.btn} style={{ fontSize: 11 }} onClick={() => setShowResolved(v => !v)}>
              {showResolved ? 'hide' : 'show'}
            </button>
          </div>
          {showResolved && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {done.map(e => (
                <div key={e.id} style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '14px 18px', opacity: 0.45 }}>
                  <div style={{ fontFamily: 'var(--heading-font)', fontSize: 13, fontWeight: 600, color: 'var(--heading-color)', marginBottom: 4 }}>
                    {CAT_ICON[e.category] || '❓'} {e.journal_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.4 }}>{e.date_received}</div>
                  <span className={`${s.badge} ${e.status === 'accepted' ? s.badgeOk : s.badgeMuted}`} style={{ marginTop: 8 }}>{e.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Footer className="background-section" />
    </Layout>
  );
}
