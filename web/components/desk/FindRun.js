import { useState, useEffect, useCallback } from 'react';
import { C, CSS, Reader, post, sans } from '../console/Reader';

// Search everywhere — one query, run on the node as a Harare run over the laptop, the mail
// and the web (backend/find.py). Each source is judged by spraypaint, so each card carries
// one verdict: covered (every query word is in what was found), partial, or declined (the
// words are not there; what is shown only shares a word with the query — a look-alike).
// Passages are cited path:lines with the words that matched. Mail and laptop hits open in
// the desk reader; web hits open the page.

const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const ORDER = [['mail', 'Mail'], ['laptop', 'Laptop'], ['web', 'Web']];
const VERDICT = { covered: C.ok, partial: C.warn, declined: C.faint };
const STATE = {
  pending: ['searching…', C.signal], error: ['failed', C.bad], skipped: ['skipped', C.faint], empty: ['nothing found', C.faint],
};
const LOOKALIKE = {
  mail: 'Your mail doesn’t contain these words — these only share a word with the query.',
  laptop: 'The files found don’t contain these words — these only share a word with the query.',
  web: 'The pages fetched don’t contain these words — these only share a word with the query.',
};

function Badge({ src }) {
  const [label, color] = src.state === 'done'
    ? [src.verdict || 'answered', VERDICT[src.verdict] || C.soft]
    : STATE[src.state] || [src.state, C.faint];
  return <span style={{ ...s.badge, color, borderColor: color }}>{label}</span>;
}

const escapeRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// the evidence lines, with the query words they contain picked out
function Evidence({ text, terms }) {
  if (!terms.length) return <div style={s.snippet}>{text}</div>;
  const parts = text.split(new RegExp(`(${terms.map(escapeRe).join('|')})`, 'gi'));
  return <div style={s.snippet}>{parts.map((x, i) => (i % 2 ? <b key={i} style={s.hit}>{x}</b> : x))}</div>;
}

// matched terms come from the whole 40-line passage; the snippet is its evidence lines only.
// Green: in the lines shown. Faint: elsewhere in the passage (open it to see).
function Passage({ p, onOpen }) {
  const [a, b] = p.lines || [];
  const seen = p.in_evidence || [];
  const elsewhere = (p.matched || []).filter(t => !seen.includes(t));
  return (
    <div style={s.passage}>
      <button style={s.title} onClick={() => onOpen(p.open)}>{p.title}</button>
      <div style={s.cite}>
        <span style={{ wordBreak: 'break-all' }}>{p.path}{a ? `:${a}${b && b !== a ? `–${b}` : ''}` : ''}</span>
        <span style={{ flex: 'none' }}>
          {seen.length > 0 && <span style={s.matched}>{seen.join(' ')}</span>}
          {elsewhere.length > 0 && <span title="in the passage, outside the lines shown" style={s.elsewhere}> +{elsewhere.join(' ')}</span>}
        </span>
      </div>
      {p.snippet && <Evidence text={p.snippet} terms={seen} />}
    </div>
  );
}

function SourceCard({ name, src, onOpen }) {
  const [more, setMore] = useState(false);
  const passages = src.passages || [];
  const shown = more ? passages : passages.slice(0, 3);
  const border = src.state === 'done' ? VERDICT[src.verdict] || C.line : src.state === 'error' ? C.bad : C.line;
  const looked = src.results || src.candidates || [];
  return (
    <div style={{ ...s.card, borderColor: border }}>
      <div style={s.head}>
        <span style={s.name}>{name}</span>
        <Badge src={src} />
      </div>
      {src.reason && <div style={s.reason}>{src.reason}</div>}
      {src.error && <div style={{ ...s.reason, color: C.bad }}>{src.error}</div>}
      {src.verdict === 'declined' && passages.length > 0 && <div style={s.lookalike}>{LOOKALIKE[src.source]}</div>}
      {shown.map((p, i) => <Passage key={i} p={p} onOpen={onOpen} />)}
      {passages.length > 3 && (
        <button style={s.more} onClick={() => setMore(m => !m)}>{more ? 'fewer' : `${passages.length - 3} more`}</button>
      )}
      {looked.length > 0 && (
        <details style={s.details}>
          <summary style={s.summary}>
            {src.results ? `${looked.length} search results` : `${looked.length} files looked at`}
          </summary>
          {looked.map((r, i) => (
            <div key={i} style={s.lookedRow}>
              {r.url
                ? <a href={r.url} target="_blank" rel="noopener noreferrer" style={s.link}>{r.title || r.url}</a>
                : <button style={s.title} onClick={() => onOpen({ kind: 'laptop', ref: r.path })}>{r.name || r.path}</button>}
              {r.note && <span style={s.note}> · {r.note}</span>}
              {r.snippet && <div style={s.snippet}>{r.snippet}</div>}
              {r.where && <div style={s.note}>{r.where}</div>}
            </div>
          ))}
        </details>
      )}
    </div>
  );
}

// onRead(kind, ref): the host page's reader; without it the cards bring their own.
export default function FindRun({ run, onRead }) {
  const [rep, setRep] = useState(null);
  const [err, setErr] = useState('');
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    if (!run) return undefined;
    let live = true;
    let timer;
    const poll = async () => {
      const r = await fetch(`/api/desk/find/${encodeURIComponent(run)}`).catch(() => null);
      const j = r ? await r.json().catch(() => null) : null;
      if (!live) return;
      if (!r || !r.ok || !j) setErr(j?.detail || j?.error || 'the node did not answer');
      else { setErr(''); setRep(j); if (j.quiescent) return; }
      timer = setTimeout(poll, 1500);
    };
    poll();
    return () => { live = false; clearTimeout(timer); };
  }, [run]);

  const read = useCallback(async (kind, ref) => {
    const path = ['read', kind, ...ref.split('/')].map(encodeURIComponent).join('/');
    const d = await fetch(`/api/desk/console/${path}`).then(r => r.json()).catch(() => null);
    if (d && !d.error && !d.detail) setDoc(d);
  }, []);
  const open = o => (o.kind === 'web' ? window.open(o.ref, '_blank', 'noopener') : (onRead || read)(o.kind, o.ref));
  // the reader's actions (summarise, draft a reply, …) run as agents; follow them on the console
  const runAgent = useCallback(async (text, tool, args) => {
    await post('/api/desk/agents/runs', tool ? { text, tool, args } : { text }).catch(() => null);
    window.location.href = '/desk/console';
  }, []);

  if (!run) return null;
  return (
    <div style={s.wrap}>
      {!onRead && <style dangerouslySetInnerHTML={{ __html: CSS }} />}
      {err && <div style={{ ...s.reason, color: C.warn }}>{err}</div>}
      {rep && !rep.quiescent && <div style={s.progress}>searching the laptop, mail and web…</div>}
      {rep && ORDER.map(([k, name]) => rep.sources?.[k] && <SourceCard key={k} name={name} src={rep.sources[k]} onOpen={open} />)}
      {!onRead && <Reader doc={doc} onClose={() => setDoc(null)} onRead={read} onRun={runAgent} />}
    </div>
  );
}

const s = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 10, fontFamily: sans },
  progress: { fontFamily: mono, fontSize: 12, color: C.signal },
  card: { background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 14px' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  name: { fontWeight: 700, color: C.ink, fontSize: 15 },
  badge: { fontFamily: mono, fontSize: 11.5, fontWeight: 700, border: '1px solid', borderRadius: 100, padding: '2px 9px' },
  reason: { fontSize: 13, color: C.soft, marginTop: 6, lineHeight: 1.45 },
  lookalike: { fontSize: 12.5, color: C.faint, marginTop: 6, fontStyle: 'italic' },
  passage: { marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.line}` },
  title: { background: 'none', border: 'none', padding: 0, color: C.signal, fontSize: 14.5, fontWeight: 600,
           textAlign: 'left', cursor: 'pointer', fontFamily: sans },
  cite: { display: 'flex', justifyContent: 'space-between', gap: 10, fontFamily: mono, fontSize: 11.5, color: C.faint, marginTop: 2 },
  matched: { color: C.ok },
  elsewhere: { color: C.faint },
  hit: { color: C.ink, fontWeight: 700 },
  snippet: { fontSize: 13, color: C.soft, marginTop: 4, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  more: { background: 'none', border: 'none', color: C.signal, padding: '8px 0 0', fontSize: 13, cursor: 'pointer' },
  details: { marginTop: 10 },
  summary: { color: C.faint, fontSize: 12.5, cursor: 'pointer', fontFamily: mono },
  lookedRow: { marginTop: 8 },
  link: { color: C.signal, textDecoration: 'none', fontSize: 14 },
  note: { color: C.faint, fontSize: 12 },
};
