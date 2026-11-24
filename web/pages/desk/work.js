import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';

// The work desk (currentValue, shared with Mark): what waits for you, the newest brief, and
// every project as its record stands — what is open, what was written up, what is new on its
// branch. Read only; the desk itself is kept by its two AIs. Data: backend/routes/work.py.

const TEAL = '#14bfb5';
const AMBER = '#fbbf24';
const RED = '#f87171';
const API = '/api/desk/work';

const label = { fontSize: 12, fontWeight: 700, color: 'var(--font-color,#bbb)', opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase', margin: '28px 0 12px' };
const card = { background: 'var(--assistant-color,#101010)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '14px 16px' };
const button = { background: 'none', border: `1px solid ${TEAL}`, color: TEAL, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 };
const faint = { opacity: 0.5, fontSize: 12 };

async function call(path, options) {
  const r = await fetch(`${API}${path}`, options);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || data.error || `HTTP ${r.status}`);
  return data;
}

function Doc({ doc, onClose }) {
  const [t, setT] = useState(null);
  useEffect(() => {
    call(`/file?doc=${encodeURIComponent(doc)}`).then(d => setT(d.text)).catch(e => setT(`(${e.message})`));
  }, [doc]);
  return (
    <div style={{ ...card, marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', ...faint }}>
        <span>{doc}</span>
        <button onClick={onClose} style={{ ...button, padding: '2px 8px', border: 'none' }}>close</button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5, margin: '8px 0 0', fontFamily: 'inherit' }}>{t ?? '…'}</pre>
    </div>
  );
}

function Project({ p, onOpen }) {
  const [open, setOpen] = useState(false);
  const newest = p.commits?.[0];
  const behind = p.unwritten && p.unwritten !== 0 ? `${p.unwritten} commits not written up` : '';
  return (
    <div style={{ ...card, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</span>
          <span style={{ ...faint, marginLeft: 8 }}>{p.branch}</span>
          <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>{p.about}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12 }}>
          <div style={{ color: p.open?.length ? AMBER : 'inherit' }}>{p.open?.length || 0} open</div>
          {behind && <div style={{ color: AMBER }}>{behind}</div>}
          {newest && <div style={faint}>newest {newest.date} · {newest.subject.slice(0, 60)}</div>}
          {!newest && p.activity_error && <div style={{ ...faint, maxWidth: 320 }}>commits: {p.activity_error}</div>}
        </div>
      </div>
      {p.log?.[0] && (
        <div style={{ fontSize: 13, marginTop: 8 }}>
          <span style={faint}>written up {p.log[0].date}: </span>
          <button onClick={() => onOpen(p.log[0].file)} style={{ ...button, border: 'none', padding: 0, textAlign: 'left' }}>{p.log[0].title}</button>
        </div>
      )}
      <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
        <button onClick={() => setOpen(!open)} style={{ ...button, border: 'none', padding: 0 }}>{open ? 'hide' : 'open items'}</button>
        <button onClick={() => onOpen(`projects/${p.name}/status.md`)} style={{ ...button, border: 'none', padding: 0 }}>status</button>
      </div>
      {open && (
        <ul style={{ fontSize: 13, margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
          {(p.open || []).map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
          {p.against_plan?.length > 0 && <li style={{ listStyle: 'none', ...faint, marginTop: 6 }}>against the plan</li>}
          {(p.against_plan || []).map((x, i) => <li key={`p${i}`} style={{ marginBottom: 4, opacity: 0.8 }}>{x}</li>)}
        </ul>
      )}
    </div>
  );
}

export default function Work() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [doc, setDoc] = useState('');
  const load = useCallback(async () => {
    try { setS(await call('')); setErr(''); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const refresh = async () => {
    setBusy(true);
    try { setS(await call('/refresh', { method: 'POST' })); setErr(''); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const b = s?.brief;

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Work — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">currentValue</span>
        </p>
        <h1 className="title text-uppercase">Work</h1>
        <p style={{ opacity: 0.4, fontSize: 13, marginTop: 10 }}>
          The work desk with Mark · what waits for you · every project as its record stands
        </p>
      </HeaderNormal>

      <div className="container" style={{ marginBottom: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={faint}>
            {s?.as_of ? `read from ${s.source} · ${new Date(s.as_of).toLocaleString('de-DE')}${s.stale ? ' · stale' : ''}` : s?.note}
          </div>
          <button onClick={refresh} disabled={busy} style={button}>{busy ? 'reading…' : 'read again'}</button>
        </div>
        {err && <div style={{ color: RED, fontSize: 13, marginTop: 10 }}>{err}</div>}
        {s?.notes?.length > 0 && s.notes.map((n, i) => <div key={i} style={{ ...faint, marginTop: 4 }}>{n}</div>)}
        {doc && <Doc doc={doc} onClose={() => setDoc('')} />}

        {(s?.needs_you?.length > 0 || b?.needs_you?.length > 0) && (
          <>
            <div style={label}>Needs you</div>
            {(s.needs_you || []).map(t => (
              <div key={t.id} style={{ ...card, borderLeft: `3px solid ${AMBER}`, marginBottom: 6, fontSize: 13 }}>
                <b>{t.title}</b> <span style={faint}>· thread with {t.to === 'kundai' ? t.asked_by : t.to} · {t.posts} posts</span>
                <div style={{ opacity: 0.75, marginTop: 4 }}>{t.last.slice(0, 300)}</div>
              </div>
            ))}
            {(b?.needs_you || []).map((x, i) => (
              <div key={`b${i}`} style={{ ...card, borderLeft: `3px solid ${AMBER}`, marginBottom: 6, fontSize: 13 }}>{x}</div>
            ))}
          </>
        )}

        {b && (
          <>
            <div style={label}>Newest brief · {b.date}</div>
            <div style={card}>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.5, margin: 0, fontFamily: 'inherit' }}>{b.first}</pre>
              <button onClick={() => setDoc(b.file)} style={{ ...button, border: 'none', padding: '8px 0 0' }}>the whole brief →</button>
            </div>
          </>
        )}

        {s?.projects?.length > 0 && (
          <>
            <div style={label}>Projects</div>
            {s.projects.map(p => <Project key={p.name} p={p} onOpen={setDoc} />)}
          </>
        )}

        {s?.as_of && (
          <>
            <div style={label}>Plan · decisions · your notes</div>
            {[...(s.plan || []), ...(s.decisions || []), ...(s.inbox || [])].map(d => (
              <div key={d.file} style={{ fontSize: 13, marginBottom: 4 }}>
                <button onClick={() => setDoc(d.file)} style={{ ...button, border: 'none', padding: 0, textAlign: 'left' }}>{d.title}</button>
                <span style={{ ...faint, marginLeft: 8 }}>{d.file.split('/')[0]}</span>
              </div>
            ))}
            {s.documents && Object.entries(s.documents).filter(([, v]) => v.length).map(([k, v]) => (
              <div key={k} style={{ fontSize: 13, marginTop: 10 }}>
                <span style={faint}>{k}: </span>
                {v.map((d, i) => (
                  <span key={d.file}>{i > 0 && ' · '}<button onClick={() => setDoc(d.file)} style={{ ...button, border: 'none', padding: 0 }}>{d.title}</button></span>
                ))}
              </div>
            ))}
            {s.desk_log?.length > 0 && (
              <>
                <div style={label}>On the desk lately</div>
                {s.desk_log.map(c => <div key={c.sha} style={{ fontSize: 12, opacity: 0.7 }}>{c.date} · {c.by} · {c.subject}</div>)}
              </>
            )}
          </>
        )}
      </div>
      <Footer />
    </Layout>
  );
}
