import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import s from '../../styles/desk.module.css';

// Live credential dashboard. The node's keeper (backend/keeper/) probes every credential
// against its real provider and renews what can be renewed; this page subscribes to its
// SSE stream, so a state change shows up here within a second. Values never reach it.

const STATE_BADGE = {
  ok:      { label: 'OK',        cls: s.badgeOk },
  soon:    { label: 'SOON',      cls: s.badgeWarning },
  expired: { label: 'EXPIRED',   cls: s.badgeDanger },
  dead:    { label: 'REJECTED',  cls: s.badgeDanger },
  missing: { label: 'NOT SET',   cls: s.badgeMuted },
  unknown: { label: 'CHECKING',  cls: s.badgeInfo },
};

const STRATEGY = {
  refresh: 'renews itself',
  mint:    'mints its own tokens',
  static:  'you renew it',
};

// The few the desk cannot take a new value for (a GitHub App, a Garmin session, local services).
const PUSH_HINT = 'This one is set in KeePassXC: update the entry, then run python -m tools.keeper push on the laptop.';
// Cards that need you come first.
const ORDER = { dead: 0, expired: 1, soon: 2, missing: 3, unknown: 4, ok: 5 };

function ago(iso, now) {
  if (!iso) return '—';
  const sec = Math.round((now - new Date(iso).getTime()) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} h ago`;
  return `${Math.floor(sec / 86400)} d ago`;
}

function until(iso, now) {
  if (!iso) return '—';
  const sec = Math.round((new Date(iso).getTime() - now) / 1000);
  if (sec <= 0) return 'now';
  if (sec < 3600) return `in ${Math.ceil(sec / 60)} min`;
  if (sec < 86400) return `in ${Math.round(sec / 3600)} h`;
  return `in ${Math.round(sec / 86400)} days`;
}

// Bar fills as the human-renewed expiry approaches (full = expired), over a 90-day window.
function progressPct(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return 0;
  if (daysLeft <= 0) return 100;
  return Math.max(4, Math.min(100, 100 - (daysLeft / 90) * 100));
}

const PROGRESS_CLS = { ok: s.progressOk, soon: s.progressWarning, expired: s.progressDanger, dead: s.progressDanger };

const label = { fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 4 };
const value = { fontSize: 14, fontWeight: 600, color: 'var(--heading-color)' };
const sub   = { fontSize: 12, color: 'var(--font-color)', opacity: 0.5 };

// ── Renewing on the desk (backend/keeper/desk.py) ─────────────────────────────
// The new value goes to the node, which asks the provider first and keeps it only if it is
// accepted; nothing is ever sent back. The services restart a few seconds later to use it.
const inputStyle = { background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--font-color)',
  padding: '7px 10px', borderRadius: 4, fontSize: 13, width: '100%' };

async function post(path, body) {
  const r = await fetch(`/api/desk/keeper/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail || d.error || `HTTP ${r.status}`);
  return d;
}

function RenewHere({ c, fields }) {
  const [vals, setVals] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const go = async () => {
    setBusy(true); setMsg(null);
    try {
      const d = await post(`renew/${encodeURIComponent(c.id)}`, { values: vals });
      setMsg({ ok: d.ok, text: d.ok ? `Accepted: ${d.detail}. The desk restarts in a few seconds to use it.` : d.detail });
      if (d.ok) setVals({});
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {fields.map(f => (
        <input key={f.name} type={f.secret ? 'password' : 'text'} autoComplete="off" placeholder={f.label}
          value={vals[f.name] || ''} onChange={e => setVals({ ...vals, [f.name]: e.target.value })} style={inputStyle} />
      ))}
      <div className={s.btnGroup}>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={go} disabled={busy || fields.some(f => !vals[f.name])}>
          {busy ? 'Checking with the provider…' : 'Check and use'}
        </button>
      </div>
      {msg && <div style={{ fontSize: 12, color: msg.ok ? '#34d399' : '#fca5a5' }}>{msg.text}</div>}
    </div>
  );
}

// Gitea (the university forge): a new token made from your forge password. The password goes
// to the node for this one request and is kept nowhere; the token is checked before it is kept.
function MintHere({ c, info }) {
  const [vals, setVals] = useState({ user: info.user || '', password: '', otp: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const go = async () => {
    setBusy(true); setMsg(null);
    try {
      const d = await post(`mint/${encodeURIComponent(c.id)}`, vals);
      setMsg({ ok: d.ok, text: d.ok ? `${d.detail}. The desk restarts in a few seconds to use it.` : d.detail });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setVals(v => ({ ...v, password: '', otp: '' }));
    setBusy(false);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.6 }}>Make a new token on {info.host} with your password (used once, not kept):</div>
      {!info.user && <input placeholder="User name" autoComplete="username" value={vals.user}
        onChange={e => setVals({ ...vals, user: e.target.value })} style={inputStyle} />}
      <input type="password" placeholder={`Password on ${info.host}`} autoComplete="current-password" value={vals.password}
        onChange={e => setVals({ ...vals, password: e.target.value })} style={inputStyle} />
      <input inputMode="numeric" placeholder="Two-factor code (only if asked)" autoComplete="one-time-code" value={vals.otp}
        onChange={e => setVals({ ...vals, otp: e.target.value })} style={inputStyle} />
      <div className={s.btnGroup}>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={go} disabled={busy || !vals.password || !vals.user}>
          {busy ? 'Making the token…' : 'Make a new token'}
        </button>
      </div>
      {msg && <div style={{ fontSize: 12, color: msg.ok ? '#34d399' : '#fca5a5' }}>{msg.text}</div>}
    </div>
  );
}

// GitLab: the token renews itself while it still works (the keeper does this by itself two
// weeks before the end; the button does it now).
function RotateHere({ c }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const go = async () => {
    setBusy(true); setMsg(null);
    try {
      const d = await post(`rotate/${encodeURIComponent(c.id)}`);
      setMsg({ ok: d.ok, text: d.ok ? `${d.detail}. The desk restarts in a few seconds to use it.` : d.detail });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy(false);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className={s.btnGroup}>
        <button className={s.btn} onClick={go} disabled={busy}>{busy ? 'Renewing…' : 'Renew it now (with itself)'}</button>
      </div>
      {msg && <div style={{ fontSize: 12, color: msg.ok ? '#34d399' : '#fca5a5' }}>{msg.text}</div>}
    </div>
  );
}

function Copy({ text }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* the text is shown anyway */ }
  };
  return <button className={s.btn} onClick={copy}>{done ? 'Copied' : 'Copy'}</button>;
}

const Step = ({ n, children }) => (
  <div style={{ opacity: 0.75, lineHeight: 1.7 }}><b>{n}.</b> {children}</div>
);

function GmailRenew({ callback }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const [paste, setPaste] = useState(null);      // the sign-in waits for the 127.0.0.1 address
  const [pasted, setPasted] = useState('');
  const [client, setClient] = useState({ client_id: '', client_secret: '', kind: 'web' });
  const keepFields = async () => {
    setBusy('client'); setMsg(null);
    try {
      const d = await post('google/client-fields', client);
      setClient({ client_id: '', client_secret: '', kind: client.kind });
      setMsg({ ok: true, text: `Client kept (${d.kind}). Now tap Connect Gmail.` });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy('');
  };
  const upload = async file => {
    if (!file) return;
    setBusy('client'); setMsg(null);
    try {
      const d = await post('google/client', { text: await file.text() });
      setMsg({ ok: true, text: `Client kept (${d.kind}${d.project ? `, project ${d.project}` : ''}). ${d.redirect_ok
        ? 'Its redirect is this desk: Connect returns here by itself.' : 'Connect will ask you to paste the address Google sends you to.'}` });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy('');
  };
  const connect = async () => {
    setBusy('start'); setMsg(null);
    try {
      const d = await post('google/start');
      if (d.mode === 'redirect') { window.location.href = d.url; return; }
      setPaste(d); window.open(d.url, '_blank', 'noopener');
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy('');
  };
  const finish = async () => {
    setBusy('finish'); setMsg(null);
    try {
      const d = await post('google/finish', { pasted });
      setPaste(null); setPasted('');
      setMsg({ ok: true, text: `Connected to ${d.mailbox}${d.calendar ? ' with Calendar' : ''}.${d.testing_until
        ? ` Google will end this token on ${d.testing_until} because the app is in Testing — publish it once and connect again.` : ''}`,
        publish: d.publish_url });
    } catch (e) { setMsg({ ok: false, text: e.message }); }
    setBusy('');
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
      <Step n={1}>Only if Google refused the client itself: <a href="https://console.cloud.google.com/auth/clients/create"
        target="_blank" rel="noreferrer">create an OAuth client</a> of type <b>Web application</b> with this redirect URI:</Step>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <code style={{ wordBreak: 'break-all', fontSize: 11, flex: 1 }}>{callback}</code>
        <Copy text={callback || ''} />
      </div>
      <Step n={2}>Copy its client ID and secret here (or choose its downloaded JSON):</Step>
      <input placeholder="Client ID (…apps.googleusercontent.com)" autoComplete="off" value={client.client_id}
        onChange={e => setClient({ ...client, client_id: e.target.value })} style={inputStyle} />
      <input type="password" placeholder="Client secret" autoComplete="off" value={client.client_secret}
        onChange={e => setClient({ ...client, client_secret: e.target.value })} style={inputStyle} />
      <label style={{ opacity: 0.6 }}>
        <input type="checkbox" checked={client.kind === 'installed'}
          onChange={e => setClient({ ...client, kind: e.target.checked ? 'installed' : 'web' })} />
        {' '}it is a Desktop client (then you paste one address at the end)
      </label>
      <div className={s.btnGroup}>
        <button className={s.btn} onClick={keepFields} disabled={!!busy || !client.client_id || !client.client_secret}>
          {busy === 'client' ? 'Keeping…' : 'Keep this client'}
        </button>
        <label className={s.btn} style={{ cursor: 'pointer' }}>
          Choose client JSON
          <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0])} />
        </label>
      </div>
      <Step n={3}>Sign in to Google with the mailbox:</Step>
      <div className={s.btnGroup}>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={connect} disabled={!!busy}>{busy === 'start' ? 'Opening…' : 'Connect Gmail'}</button>
      </div>
      {paste && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ opacity: 0.6 }}>Sign in on the Google tab. It ends on a page that does not load (127.0.0.1…): copy that whole address and paste it here.</div>
          <input value={pasted} onChange={e => setPasted(e.target.value)} placeholder="http://127.0.0.1:8765/?state=…&code=…" style={inputStyle} />
          <div className={s.btnGroup}>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={finish} disabled={!pasted || !!busy}>{busy === 'finish' ? 'Finishing…' : 'Finish'}</button>
          </div>
        </div>
      )}
      {msg && (
        <div style={{ color: msg.ok ? '#34d399' : '#fca5a5' }}>
          {msg.text}{msg.publish && <> <a href={msg.publish} target="_blank" rel="noreferrer">Publish the app →</a></>}
        </div>
      )}
    </div>
  );
}

function Settings({ settings }) {
  const [vals, setVals] = useState(() => Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, v.value])));
  const [msg, setMsg] = useState('');
  const save = async () => {
    setMsg('');
    try {
      for (const [k, v] of Object.entries(vals)) if (v !== settings[k].value) await post('setting', { name: k, value: v });
      setMsg('Saved. The desk restarts in a few seconds to use it.');
    } catch (e) { setMsg(e.message); }
  };
  return (
    <div style={{ background: 'var(--assistant-color, #101010)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
      <div style={label}>Home (weather, travel)</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginTop: 6 }}>
        {Object.entries(settings).map(([k, v]) => (
          <input key={k} value={vals[k] || ''} placeholder={v.label} title={v.label} style={inputStyle}
            onChange={e => setVals({ ...vals, [k]: e.target.value })} />
        ))}
      </div>
      <div className={s.btnGroup} style={{ marginTop: 8 }}><button className={s.btn} onClick={save}>Save</button></div>
      {msg && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>{msg}</div>}
    </div>
  );
}

function KeyCard({ c, now, fields, actions, callback }) {
  const badge = STATE_BADGE[c.state] || STATE_BADGE.unknown;
  const bad = ['dead', 'expired'].includes(c.state);
  const needsHuman = bad || c.state === 'soon' || c.state === 'missing';

  return (
    <div style={{
      background: 'var(--assistant-color, #101010)',
      border: `1px solid ${bad ? 'rgba(239,68,68,0.35)' : c.state === 'soon' ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: 10, padding: 28, display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--heading-font)', fontSize: 18, fontWeight: 700, color: 'var(--heading-color)', marginBottom: 4 }}>
            {c.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.4 }}>
            {c.mode === 'pat' ? 'GitHub personal token' : c.provider} · {STRATEGY[c.strategy] || c.strategy}
          </div>
        </div>
        <span className={`${s.badge} ${badge.cls}`}>{badge.label}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={label}>You must renew</div>
          <div style={{ ...value, color: bad ? '#f87171' : c.state === 'soon' ? '#fbbf24' : value.color }}>
            {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-GB') : 'never'}
          </div>
          <div style={sub}>{c.expires_at ? (c.days_left < 0 ? `${-c.days_left} days ago` : `${c.days_left} days left`) : 'no expiry known'}</div>
        </div>
        <div>
          <div style={label}>{c.strategy === 'static' ? 'Last verified' : 'Auto-renewal'}</div>
          <div style={value}>
            {c.strategy === 'static' ? ago(c.last_ok, now) : (c.auto_expires_at ? until(c.auto_expires_at, now) : '—')}
          </div>
          <div style={sub}>
            {c.last_renewed ? `last renewed ${ago(c.last_renewed, now)}` : `checked ${ago(c.last_checked, now)}`}
          </div>
        </div>
      </div>

      {c.expires_at && (
        <div className={s.progress}>
          <div className={`${s.progressBar} ${PROGRESS_CLS[c.state] || s.progressOk}`} style={{ width: `${progressPct(c.days_left)}%` }} />
        </div>
      )}

      <div style={{ fontSize: 12, color: bad ? '#fca5a5' : 'var(--font-color)', opacity: bad ? 0.9 : 0.55, lineHeight: 1.6 }}>
        {c.detail}
      </div>
      <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.35 }}>used by: {c.used_by}</div>

      {needsHuman && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actions?.mint && <MintHere c={c} info={actions.mint} />}
          {c.renew_url && (
            <div className={s.btnGroup}>
              <a className={`${s.btn} ${actions?.mint ? '' : s.btnPrimary}`} href={c.renew_url} target="_blank" rel="noreferrer">
                {c.id.startsWith('forge-') ? `Make a token on ${c.provider}` : `Get a new key from ${c.provider}`}
              </a>
            </div>
          )}
          {c.id === 'gmail' && <GmailRenew callback={callback} />}
          {fields?.length > 0 && <RenewHere c={c} fields={fields} />}
          {c.id !== 'gmail' && !fields?.length && !actions && (
            <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.45 }}>{PUSH_HINT}</div>)}
        </div>
      )}
      {!needsHuman && actions?.rotate && <RotateHere c={c} />}
      {!needsHuman && (fields?.length > 0 || c.id === 'gmail') && (
        <details style={{ fontSize: 12 }}>
          <summary style={{ cursor: 'pointer', opacity: 0.5 }}>Replace it anyway</summary>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {actions?.mint && <MintHere c={c} info={actions.mint} />}
            {c.id === 'gmail' ? <GmailRenew callback={callback} /> : <RenewHere c={c} fields={fields} />}
          </div>
        </details>
      )}
    </div>
  );
}

export default function KeysPage() {
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const [checking, setChecking] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [desk, setDesk] = useState(null);           // what can be renewed here (value-free)
  const [back, setBack] = useState(null);           // what Google's sign-in came back with

  // Relative times ("3 min ago") move on their own between events.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch('/api/desk/keeper/desk').then(r => r.json()).then(d => d.fields && setDesk(d)).catch(() => {});
    const q = new URLSearchParams(window.location.search);
    if (q.get('gmail')) {
      setBack(q.get('gmail') === 'ok'
        ? { ok: true, text: `Gmail connected (${q.get('box') || 'mailbox'}).${q.get('testing') ? ` Google ends this token on ${q.get('testing')}: publish the app and connect again.` : ''}` }
        : { ok: false, text: `Gmail sign-in failed: ${q.get('why') || 'unknown'}` });
      window.history.replaceState(null, '', '/desk/keys');
    }
    fetch('/api/desk/keys')
      .then(r => r.json())
      .then(d => (d.error ? setError(d.error) : setSnap(d)))
      .catch(() => setError('node unreachable'));

    const es = new EventSource('/api/desk/keys/stream');
    es.addEventListener('status', e => {
      setSnap(JSON.parse(e.data));
      setError('');
      setChecking(false);
      setNow(Date.now());
    });
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false); // EventSource retries by itself
    return () => es.close();
  }, []);

  const checkNow = useCallback(async () => {
    setChecking(true);
    await fetch('/api/desk/keys', { method: 'POST' }).catch(() => {});
    setTimeout(() => setChecking(false), 20_000); // no change ⇒ no event; stop spinning anyway
  }, []);

  const creds = [...(snap?.credentials || [])].sort((a, b) => (ORDER[a.state] ?? 9) - (ORDER[b.state] ?? 9));
  const needAction = creds.filter(c => ['dead', 'expired', 'soon'].includes(c.state)).length;

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Keys — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Desk · Keys</span>
        </p>
        <h1 className="title text-uppercase">Keys</h1>
        <p style={{ fontSize: 13, marginTop: 12, opacity: 0.6 }}>
          <span style={{ color: live ? '#34d399' : '#fbbf24' }}>●</span>{' '}
          {live ? 'live' : 'reconnecting…'}
          {snap && ` · ${creds.length - needAction}/${creds.length} fine`}
          {needAction > 0 && <span style={{ color: '#f87171' }}> · {needAction} need you</span>}
        </p>
      </HeaderNormal>

      <section className="container section-margin" data-dsn-title="Keys">
        <div className={s.btnGroup} style={{ marginBottom: 24 }}>
          <button className={s.btn} onClick={checkNow} disabled={checking}>
            {checking ? 'Checking…' : 'Check all now'}
          </button>
        </div>
        {back && <div style={{ color: back.ok ? '#34d399' : '#fca5a5', fontSize: 13, marginBottom: 16 }}>{back.text}</div>}
        {desk?.settings && <Settings settings={desk.settings} />}
        {error && !snap && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
        {!snap && !error && <div style={{ color: 'var(--font-color)', opacity: 0.4 }}>Loading…</div>}
        {snap && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(340px, 100%), 1fr))', gap: 24 }}>
            {creds.map(c => <KeyCard key={c.id} c={c} now={now} fields={desk?.fields?.[c.id]} actions={desk?.actions?.[c.id]} callback={desk?.callback} />)}
          </div>
        )}
      </section>

      <Footer className="background-section" />
    </Layout>
  );
}
