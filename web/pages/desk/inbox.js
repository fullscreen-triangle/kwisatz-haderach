import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import s from '../../styles/desk.module.css';

// Unified inbox: every account the node reads (Gmail, Uni Greifswald, webmail), each message
// with what the node extracted from it and where the planner put it. Live over SSE — a new
// mail appears, then fills in its summary once extracted. Nothing here changes read/unread
// state at the provider; "done" is the desk's own mark.

const CAT_COLOR = {
  work: '#60a5fa', research: '#a78bfa', admin: '#fbbf24', job: '#34d399', finance: '#f472b6',
  travel: '#14bfb5', personal: '#fb923c', journal: '#c084fc', newsletter: '#6b7280',
  notification: '#6b7280', spam: '#ef4444',
};

const fmtWhen = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};
const fmtSlot = iso => new Date(iso).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

const chip = (color, active) => ({
  display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, cursor: 'pointer',
  border: `1px solid ${active ? color : 'rgba(255,255,255,0.12)'}`, color: active ? color : 'var(--font-color)',
  background: active ? 'rgba(255,255,255,0.04)' : 'transparent', marginRight: 6, marginBottom: 6,
});
const muted = { fontSize: 12, color: 'var(--font-color)', opacity: 0.5 };

function AccountStrip({ status, account, setAccount }) {
  const accounts = status?.accounts || [];
  const counts = status?.counts || {};
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={chip('#e5e7eb', !account)} onClick={() => setAccount('')}>All</span>
      {accounts.map(a => {
        const c = counts[a.id] || {};
        const color = a.ok === false ? '#f87171' : '#34d399';
        return (
          <span key={a.id} style={chip(color, account === a.id)} onClick={() => setAccount(a.id)}
                title={a.error || `last checked ${fmtWhen(a.last_poll)}`}>
            {a.label} · {Object.values(c).reduce((x, y) => x + y, 0)}
            {c.pending ? ` · ${c.pending} to read` : ''}{a.ok === false ? ' · !' : ''}
          </span>
        );
      })}
      {accounts.some(a => a.ok === false) && (
        <div style={{ ...muted, color: '#fca5a5', opacity: 0.9 }}>
          {accounts.filter(a => a.ok === false).map(a => `${a.label}: ${a.error}`).join(' · ')} — see <Link href="/desk/keys">Keys</Link>
        </div>
      )}
      {!accounts.length && <div style={muted}>No mail account connected yet — add them to the vault and push (see Keys).</div>}
    </div>
  );
}

function Extracted({ m }) {
  const ex = m.extraction;
  if (m.status === 'pending') return <div style={muted}>reading…</div>;
  if (m.status === 'failed') return <div style={{ ...muted, color: '#fca5a5' }}>could not extract: {m.error}</div>;
  if (!ex) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 14, color: 'var(--heading-color)', lineHeight: 1.5 }}>{ex.summary}</div>
      {(ex.action_items || []).map((a, i) => (
        <div key={i} style={{ fontSize: 13 }}>
          ☐ {a.title} <span style={muted}>· {a.estimated_minutes} min{a.due ? ` · due ${fmtSlot(a.due)}` : ''}{a.priority === 'high' ? ' · high' : ''}</span>
        </div>
      ))}
      {(ex.events || []).map((e, i) => (
        <div key={i} style={{ fontSize: 13 }}>
          📅 {e.title} <span style={muted}>· {fmtSlot(e.start)}{e.location ? ` · ${e.location}` : ''}{e.confirmed ? '' : ' · proposed'}</span>
        </div>
      ))}
      {ex.needs_reply && <div style={{ fontSize: 13, color: '#fbbf24' }}>↩ needs a reply{ex.reply_by ? ` by ${fmtSlot(ex.reply_by)}` : ''}</div>}
      {!!(ex.people || []).length && (
        <div style={muted}>people: {ex.people.map(p => [p.name, p.role, p.org].filter(Boolean).join(', ')).join(' · ')}</div>
      )}
    </div>
  );
}

function MessageCard({ m, onDone }) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(null);
  const color = CAT_COLOR[m.extraction?.category] || '#6b7280';

  async function toggle() {
    setOpen(o => !o);
    if (!full) {
      const r = await fetch(`/api/desk/mail/messages/${encodeURIComponent(m.key)}`);
      setFull(await r.json());
    }
  }

  return (
    <div style={{
      background: 'var(--assistant-color, #101010)', borderRadius: 10, padding: '20px 22px',
      border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${color}`, opacity: m.done ? 0.45 : 1,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--heading-font)', fontSize: 16, fontWeight: 700, color: 'var(--heading-color)' }}>
            {m.subject || '(no subject)'}
          </div>
          <div style={muted}>
            {m.owner ? 'you → ' : ''}{m.from_name || m.from_addr} · {m.account}{m.folder === 'Sent' ? ' · sent' : ''} · {fmtWhen(m.date)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
          {m.extraction?.category && <span className={s.badge} style={{ color, borderColor: color }}>{m.extraction.category}</span>}
          {m.triage && m.triage !== 'model' && <span className={`${s.badge} ${s.badgeMuted}`}>{m.triage}</span>}
        </div>
      </div>

      <Extracted m={m} />

      {!!(m.scheduled || []).length && (
        <div style={{ fontSize: 12 }}>
          {m.scheduled.map(b => (
            <Link key={b.id} href={`/desk/plan?at=${encodeURIComponent(b.start)}`} style={{ marginRight: 10, color: '#34d399' }}>
              ⏱ {b.kind === 'fixed' ? '' : 'planned '}{fmtSlot(b.start)} · {b.title.slice(0, 40)}
            </Link>
          ))}
        </div>
      )}

      <div className={s.btnGroup}>
        <button className={s.btn} onClick={toggle}>{open ? 'Hide' : 'Read'}</button>
        <button className={s.btn} onClick={() => onDone(m.key, !m.done)}>{m.done ? 'Not done' : 'Done'}</button>
      </div>
      {open && (
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, margin: 0,
                      color: 'var(--font-color)', maxHeight: 420, overflow: 'auto' }}>
          {full ? full.text : 'loading…'}
        </pre>
      )}
    </div>
  );
}

function SearchAsk() {
  const [q, setQ] = useState('');
  const [mode, setMode] = useState(null);
  const [out, setOut] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(which) {
    if (!q.trim()) return;
    setBusy(true); setMode(which); setOut(null);
    const url = which === 'search' ? `/api/desk/mail/search?q=${encodeURIComponent(q)}&k=10`
      : which === 'ask' ? `/api/desk/mail/ask?q=${encodeURIComponent(q)}`
      : `/api/desk/mail/memory?q=${encodeURIComponent(q)}`;
    const r = await fetch(url).catch(() => null);
    setOut(r ? await r.json() : { error: 'offline' });
    setBusy(false);
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && run('search')}
               placeholder="Find or ask across all mail…" className={s.urlInput} style={{ flex: '1 1 280px' }} />
        <button className={`${s.btn} ${s.btnPrimary}`} disabled={busy} onClick={() => run('search')}>Search</button>
        <button className={s.btn} disabled={busy} onClick={() => run('ask')} title="four-sided-triangle: an answer, graded by how many independent sources agree">Ask</button>
        <button className={s.btn} disabled={busy} onClick={() => run('memory')} title="chigutiro: graded claims from everything it remembers">Memory</button>
      </div>
      {busy && <div style={{ ...muted, marginTop: 8 }}>working…</div>}
      {out?.error && <div style={{ ...muted, color: '#fca5a5', marginTop: 8 }}>{out.error}</div>}
      {out && !out.error && mode === 'search' && (
        <div style={{ marginTop: 12 }}>
          <div style={muted}>spraypaint · price {out.price?.toFixed?.(3)} · {out.allocation?.map(a => `${a.scene} ${a.allocated}`).join(' · ')}</div>
          {(out.results || []).map((r, i) => (
            <div key={i} style={{ marginTop: 10, fontSize: 13 }}>
              <div style={{ color: 'var(--heading-color)' }}>{r.path} <span style={muted}>· {r.scene} · {r.score?.toFixed?.(2)}</span></div>
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, opacity: 0.7 }}>{r.snippet?.slice(0, 500)}</pre>
            </div>
          ))}
        </div>
      )}
      {out && !out.error && mode === 'ask' && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <span className={`${s.badge} ${out.status === 'grounded' ? s.badgeOk : out.status === 'declined' ? s.badgeMuted : s.badgeWarning}`}>{out.status}</span>
          {out.claim && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: 8 }}>{out.claim}</pre>}
          {out.reason && <div style={muted}>{out.reason}</div>}
          {out.warning && <div style={muted}>{out.warning}</div>}
          {!!(out.support || []).length && <div style={muted}>support: {out.support.map(c => `${c.source} (${(c.power * 100).toFixed(0)}%)`).join(' · ')}</div>}
        </div>
      )}
      {out && !out.error && mode === 'memory' && (
        <div style={{ marginTop: 12, fontSize: 13 }}>
          <span className={s.badge}>{out.grade}</span>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: 8 }}>{out.answer}</pre>
          {(out.claims || []).map((c, i) => <div key={i} style={muted}>· [{c.receiver}, {c.grade}] {c.text}</div>)}
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState(null);
  const [account, setAccount] = useState('');
  const [needsAction, setNeedsAction] = useState(false);
  const [hideDone, setHideDone] = useState(true);
  const [live, setLive] = useState(false);
  const pending = useRef(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ limit: '150', include_done: hideDone ? '0' : '1' });
    if (account) qs.set('account', account);
    if (needsAction) qs.set('needs_action', 'true');
    fetch(`/api/desk/mail/messages?${qs}`).then(r => r.json()).then(d => {
      if (d.error) return;
      setMessages(d.messages);
      setStatus(d);
    }).catch(() => {});
  }, [account, needsAction, hideDone]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const es = new EventSource('/api/desk/mail/stream');
    es.addEventListener('status', e => {
      setStatus(JSON.parse(e.data));
      clearTimeout(pending.current);                       // debounce bursts of extractions
      pending.current = setTimeout(load, 800);
    });
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => { es.close(); clearTimeout(pending.current); };
  }, [load]);

  async function markDone(key, done) {
    await fetch(`/api/desk/mail/messages/${encodeURIComponent(key)}/done`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done }),
    });
    load();
  }

  const extracting = status?.extracting;
  const pendingCount = Object.values(status?.counts || {}).reduce((n, c) => n + (c.pending || 0), 0);

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
        <p style={{ fontSize: 13, marginTop: 12, opacity: 0.6 }}>
          <span style={{ color: live ? '#34d399' : '#fbbf24' }}>●</span> {live ? 'live' : 'reconnecting…'}
          {pendingCount > 0 && ` · reading ${pendingCount} message${pendingCount > 1 ? 's' : ''}${extracting ? '…' : ''}`}
          {' · '}<Link href="/desk/plan">plan</Link>{' · '}<Link href="/desk/inbox-journals">journal triage</Link>
        </p>
      </HeaderNormal>

      <section className="container section-margin" data-dsn-title="Inbox">
        <AccountStrip status={status} account={account} setAccount={setAccount} />
        <div style={{ marginBottom: 20 }}>
          <span style={chip('#fbbf24', needsAction)} onClick={() => setNeedsAction(v => !v)}>needs action</span>
          <span style={chip('#9ca3af', hideDone)} onClick={() => setHideDone(v => !v)}>hide done</span>
          <span style={chip('#9ca3af', false)} onClick={() => fetch('/api/desk/mail/sync', { method: 'POST' })}>check now</span>
        </div>
        <SearchAsk />
        {!messages && <div style={muted}>Loading…</div>}
        {messages && !messages.length && <div style={muted}>Nothing here.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 18 }}>
          {(messages || []).map(m => <MessageCard key={m.key} m={m} onDone={markDone} />)}
        </div>
      </section>

      <Footer className="background-section" />
    </Layout>
  );
}
