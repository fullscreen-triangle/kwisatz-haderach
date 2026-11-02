import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { C, CSS, linkBtn, sans } from '../../components/console/Reader';

// Your repositories on every forge (backend/forges.py): GitHub, gitlab.com, Bitspark's
// GitLab and the university's Gitea, one row per repository with each forge it lives on.
// Tokens come from KeePassXC's Git group (tracker keeps them); an account whose token is
// missing or refused shows why instead of its repositories.

const FORGE_COLOR = { github: '#8b949e', gitlab: '#fc6d26', gitea: '#609926' };

function ago(iso) {
  if (!iso) return '';
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 60 ? `${Math.floor(d)} days ago` : new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export default function Forges() {
  const [d, setD] = useState(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const load = refresh => {
    setBusy(true);
    fetch(`/api/desk/console/forges${refresh ? '?refresh=true' : ''}`).then(r => r.json())
      .then(x => x.groups && setD(x)).catch(() => {}).finally(() => setBusy(false));
  };
  useEffect(() => load(false), []);
  const shown = (d?.groups || []).filter(g => !q || g.name.includes(q.toLowerCase())
    || g.copies.some(c => (c.description || '').toLowerCase().includes(q.toLowerCase())));
  return (
    <div style={{ minHeight: '100vh', background: C.ground, color: C.ink, fontFamily: sans }}>
      <Head><title>Repositories · Agent Smith</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '18px 16px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <Link href="/desk/console" style={{ color: C.faint, textDecoration: 'none' }}>← console</Link>
          <div style={{ fontWeight: 700 }}>Repositories</div>
        </div>
        {d?.accounts?.map(a => (
          <div key={a.id} style={{ fontSize: 13, color: a.error ? C.bad : C.soft }}>
            <span style={{ color: FORGE_COLOR[a.kind] }}>●</span> {a.id} · {a.host} — {a.error ? `not listed (${a.error})` : `${a.count} repositories`}
          </div>
        ))}
        {d && !d.accounts.length && <div style={{ color: C.warn, fontSize: 14 }}>No forge tokens on the node yet: set them with tracker (tracker tokens set &lt;account&gt;), then python -m tools.keeper push.</div>}
        <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="filter by name or description"
            style={{ flex: 1, background: C.panel, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 10, padding: '8px 12px', fontSize: 15 }} />
          <button onClick={() => load(true)} disabled={busy} style={linkBtn}>{busy ? 'asking…' : 'refresh'}</button>
        </div>
        {!d && <div style={{ color: C.faint }}>loading…</div>}
        {shown.map(g => (
          <div key={g.name} style={{ padding: '10px 2px', borderBottom: `1px solid ${C.line}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ color: C.ink }}>{g.copies[0].name}</div>
              <div style={{ color: C.faint, fontSize: 12 }}>{ago(g.updated)}</div>
            </div>
            {g.copies[0].description && <div style={{ color: C.soft, fontSize: 13 }}>{g.copies[0].description}</div>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, marginTop: 3 }}>
              {g.copies.map(c => (
                <a key={c.url} href={c.url} target="_blank" rel="noreferrer" style={{ color: FORGE_COLOR[c.kind], textDecoration: 'none' }}>
                  {c.account}:{c.full_name}{c.private ? ' 🔒' : ''}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Forges.bare = true;
