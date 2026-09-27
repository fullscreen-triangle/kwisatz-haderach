import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Markdown from '../../components/console/Markdown';
import { KIND_COLOR } from '../../components/console/ForceGraph';

// The console — the phone's home screen (PWA start_url).
//
//   Say it       type or dictate a command; agents perform it. "?words" searches instead.
//   Now / next   what the plan says to be doing
//   Feed         one line per thing that moved: runs, mail, notes, drafts, repos, keys
//   Reader       tap anything → it opens in full, as clean text; links inside open in place
//   Graph        the selected run as a live force graph: command → subtasks → agents →
//                sources → answer (drag, pinch/scroll to zoom, tap a node to read it)

const ForceGraph = dynamic(() => import('../../components/console/ForceGraph'), { ssr: false });

const C = {
  ground: '#0B0E13', panel: '#12161E', panel2: '#171C26', ink: '#E6EBF2', soft: '#B4BECC',
  faint: '#7A8698', line: '#2A313E', signal: '#3FD0C9', warn: '#E0A93E', bad: '#EF6B6B', ok: '#5CC98A',
};
const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const MARK = { run: '◉', mail: '✉', note: '✎', draft: '✉︎', repo: '⎇', key: '⚿' };
const STATE_COLOR = { running: C.warn, planning: C.warn, failed: C.bad, done: C.ok, action: C.warn,
                      pending: C.faint, moved: C.signal, dead: C.bad, expired: C.bad, soon: C.warn, draft: C.warn };

const CSS = `
        .md { color: ${C.soft}; font-size: 15px; line-height: 1.7; word-wrap: break-word; }
        .md h1, .md h2, .md h3 { color: ${C.ink}; line-height: 1.3; margin: 1.3em 0 0.5em; letter-spacing: normal; font-family: ${sans}; }
        body { background: ${C.ground}; }
        .md h3 { font-size: 16px; } .md h2 { font-size: 18px; }
        .md a { color: ${C.signal}; text-decoration: none; }
        .md blockquote { border-left: 3px solid ${C.signal}; margin: 0.8em 0; padding: 0.2em 0 0.2em 12px; color: ${C.ink}; }
        .md code { background: ${C.panel2}; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
        .md pre { background: ${C.panel2}; padding: 12px; border-radius: 8px; overflow-x: auto; }
        .md table { border-collapse: collapse; font-size: 13px; } .md td, .md th { border: 1px solid ${C.line}; padding: 4px 8px; }
        .md hr { border: none; border-top: 1px solid ${C.line}; margin: 1.4em 0; }
        .md ul, .md ol { padding-left: 1.3em; }
      `;

const hm = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
function ago(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                         body: JSON.stringify(body) }).then(r => r.json());

function useDictation(onText) {
  const [listening, setListening] = useState(false);
  const rec = useRef(null);
  const [supported, setSupported] = useState(false);   // after mount: the server can't know, and must match
  useEffect(() => setSupported(!!(window.SpeechRecognition || window.webkitSpeechRecognition)), []);
  const toggle = useCallback(() => {
    if (!supported) return;
    if (listening) { rec.current?.stop(); return; }
    const R = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    R.lang = navigator.language?.startsWith('de') ? 'de-DE' : 'en-GB';
    R.interimResults = true;
    R.continuous = false;
    R.onresult = e => onText(Array.from(e.results).map(r => r[0].transcript).join(' '));
    R.onend = () => setListening(false);
    R.onerror = () => setListening(false);
    rec.current = R;
    R.start();
    setListening(true);
  }, [listening, onText, supported]);
  return { supported, listening, toggle };
}

function CommandBar({ onRun, onSearch, busy }) {
  const [text, setText] = useState('');
  const dict = useDictation(setText);
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    if (t.startsWith('?')) onSearch(t.slice(1).trim()); else onRun(t);
    setText('');
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
        placeholder="Say what to do — or ?words to search mail and the laptop"
        style={{ flex: 1, resize: 'none', background: C.panel, color: C.ink, border: `1px solid ${C.line}`,
                 borderRadius: 12, padding: '12px 14px', fontSize: 16, fontFamily: sans, outline: 'none' }} />
      {dict.supported && (
        <button onClick={dict.toggle} title="Dictate" style={{
          width: 48, height: 48, borderRadius: 24, border: `1px solid ${dict.listening ? C.bad : C.line}`,
          background: dict.listening ? 'rgba(239,107,107,0.15)' : C.panel, color: dict.listening ? C.bad : C.soft,
          fontSize: 20, cursor: 'pointer' }}>🎙</button>
      )}
      <button onClick={submit} disabled={busy} style={{
        height: 48, padding: '0 18px', borderRadius: 12, border: 'none', background: C.signal, color: C.ground,
        fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Go</button>
    </div>
  );
}

function NowNext({ feed }) {
  if (!feed?.now && !feed?.next) return null;
  return (
    <div style={{ display: 'flex', gap: 10, fontSize: 13, color: C.soft, margin: '14px 0 4px', flexWrap: 'wrap' }}>
      {feed.now && <span><b style={{ color: C.ink }}>now</b> {feed.now.title} <span style={{ color: C.faint }}>→ {hm(feed.now.end)}</span></span>}
      {feed.next && <span style={{ color: C.faint }}>next {hm(feed.next.start)} · {feed.next.title}</span>}
      {!!feed.at_risk?.length && <span style={{ color: C.warn }}>{feed.at_risk.length} at risk</span>}
    </div>
  );
}

function FeedRow({ item, onOpen, selected }) {
  const color = STATE_COLOR[item.state] || C.faint;
  return (
    <div onClick={() => onOpen(item)} style={{
      display: 'flex', gap: 12, padding: '11px 4px', borderBottom: `1px solid ${C.line}`, cursor: 'pointer',
      background: selected ? C.panel2 : 'transparent', borderRadius: selected ? 8 : 0 }}>
      <div style={{ width: 20, textAlign: 'center', color: KIND_COLOR[item.kind] || C.soft, fontSize: 15 }}>
        {MARK[item.kind] || '•'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: C.ink, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.title}
        </div>
        <div style={{ color: C.faint, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.sub}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ color: C.faint, fontSize: 12 }}>{ago(item.at)}</div>
        <div style={{ width: 8, height: 8, borderRadius: 4, background: color, marginLeft: 'auto', marginTop: 6 }} />
      </div>
    </div>
  );
}

function RunPanel({ runId, onRead }) {
  const [run, setRun] = useState(null);
  useEffect(() => {
    if (!runId) return undefined;
    setRun(null);
    const es = new EventSource(`/api/desk/agents/runs/${encodeURIComponent(runId)}/stream`);
    es.addEventListener('run', e => setRun(JSON.parse(e.data)));
    return () => es.close();
  }, [runId]);
  const opened = useRef(null);              // "open the Mietvertrag": show the file itself, once per run
  useEffect(() => {
    if (run?.status === 'done' && run.open && opened.current !== run.id) {
      opened.current = run.id;
      onRead(run.open.kind, run.open.ref);
    }
  }, [run, onRead]);
  if (!runId) return null;
  if (!run) return <div style={{ color: C.faint, fontSize: 13, padding: 12 }}>starting…</div>;
  const busy = run.status === 'planning' || run.status === 'running';
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, margin: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ color: C.ink, fontSize: 15, fontWeight: 600 }}>{run.text}</div>
        <div style={{ color: STATE_COLOR[run.status], fontSize: 12, flexShrink: 0 }}>
          {busy ? '● ' : ''}{run.status}{run.brain ? ` · ${run.brain}` : ''}
        </div>
      </div>
      <ForceGraph graph={run.graph} height={320}
        onNodeClick={n => (n.ref ? onRead(n.kind, n.ref) : n.kind === 'result' || n.kind === 'command' ? onRead('run', run.id) : null)} />
      {run.note && <div style={{ color: C.faint, fontSize: 12, marginTop: 8 }}>{run.note}</div>}
      {run.error && <div style={{ color: C.bad, fontSize: 13, marginTop: 8 }}>{run.error}</div>}
      {run.answer && (
        <div style={{ marginTop: 12 }}>
          <Markdown text={run.answer} onRead={onRead} />
          <button onClick={() => onRead('run', run.id)} style={linkBtn}>sources & steps →</button>
        </div>
      )}
      {busy && !run.answer && (
        <div style={{ color: C.faint, fontSize: 13, marginTop: 10 }}>
          {run.subtasks.map(s => `${s.id} ${s.status}`).join(' · ') || 'planning…'}
        </div>
      )}
    </div>
  );
}

const linkBtn = { background: 'none', border: 'none', color: C.signal, cursor: 'pointer', padding: '8px 0', fontSize: 13 };
const pill = { background: C.panel2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 18, padding: '8px 14px',
               fontSize: 13, cursor: 'pointer' };

// "Email it": a real draft with this file attached lands in the mailbox's Drafts folder —
// nothing is sent; he checks and sends it from his mail app.
function EmailForm({ doc, onRun, onDone }) {
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const attach = doc.kind === 'attachment' ? `mail:${doc.ref}` : doc.ref;
  const go = () => {
    if (!to.includes('@')) return;
    onRun(`Email ${doc.title} to ${to}`, 'email_draft',
          { to, subject: doc.title.replace(/\.[^.]+$/, ''), body: note, attach });
    onDone();
  };
  const field = { width: '100%', background: C.panel, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 10,
                  padding: '10px 12px', fontSize: 15, fontFamily: sans, outline: 'none', boxSizing: 'border-box' };
  return (
    <div style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, marginBottom: 18,
                  display: 'grid', gap: 8 }}>
      <input type="email" inputMode="email" value={to} onChange={e => setTo(e.target.value)} placeholder="to: name@example.org" style={field} />
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} style={{ ...field, resize: 'vertical' }}
                placeholder="What should the email say? (a line is enough — it gets written for you)" />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={go} style={{ ...pill, background: C.signal, color: C.ground, border: 'none', fontWeight: 700 }}>
          Put in Drafts
        </button>
        <span style={{ color: C.faint, fontSize: 12 }}>with {doc.title} attached · not sent</span>
      </div>
    </div>
  );
}

function Reader({ doc, onClose, onRead, onRun }) {
  const [copied, setCopied] = useState(false);
  const [emailing, setEmailing] = useState(false);
  useEffect(() => setEmailing(false), [doc?.ref]);
  if (!doc) return null;
  const act = async a => {
    if (a === 'open') window.open(`/api/desk/laptop/file?path=${encodeURIComponent(doc.ref)}`, '_blank', 'noopener');
    if (a === 'email') setEmailing(e => !e);
    if (a === 'copy') {
      await navigator.clipboard.writeText(doc.markdown.replace(/^\*Reply draft[^\n]*\n\n/, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    if (a === 'done') { await post(`/api/desk/mail/messages/${encodeURIComponent(doc.ref)}/done`, { done: true }); onClose(); }
    if (a === 'reply') onRun(`Draft a reply to “${doc.title}”`, 'draft_reply', { key: doc.ref, intent: '' });
    if (a === 'summarize') {
      if (doc.kind === 'attachment') {
        const [key, n] = [doc.parent, doc.ref.split('/').pop()];
        onRun(`Summarise ${doc.title}`, 'summarize_attachment', { key, name: n });
      } else if (doc.kind === 'laptop') onRun(`Summarise ${doc.title}`, 'summarize_file', { path: doc.ref });
      else onRun(`Summarise “${doc.title}”`, 'read_mail', { key: doc.ref });
    }
    if (a === 'rerun') onRun(doc.title);
  };
  const label = { reply: 'Draft reply', done: 'Done', summarize: 'Summarise', copy: copied ? 'Copied' : 'Copy',
                  rerun: 'Run again', open: 'Open', email: emailing ? 'Cancel email' : 'Email it' };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,7,10,0.65)', zIndex: 50, display: 'flex',
                  justifyContent: 'flex-end' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(760px, 100%)', height: '100%', overflowY: 'auto', background: C.ground,
        borderLeft: `1px solid ${C.line}`, padding: '20px 22px 60px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ color: C.faint, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{doc.kind}</div>
          <button onClick={onClose} style={{ ...linkBtn, color: C.soft, fontSize: 22, padding: 0 }}>×</button>
        </div>
        <h1 style={{ color: C.ink, fontSize: 22, lineHeight: 1.3, margin: '8px 0 16px', fontFamily: sans, letterSpacing: 'normal' }}>{doc.title}</h1>
        {!!doc.actions?.length && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {doc.actions.map(a => <button key={a} style={pill} onClick={() => act(a)}>{label[a] || a}</button>)}
          </div>
        )}
        {emailing && <EmailForm doc={doc} onRun={onRun} onDone={() => setEmailing(false)} />}
        {doc.graph && <div style={{ marginBottom: 18 }}><ForceGraph graph={doc.graph} height={300}
          onNodeClick={n => n.ref && onRead(n.kind, n.ref)} /></div>}
        <Markdown text={doc.markdown} onRead={onRead} />
      </div>
    </div>
  );
}

function SearchResults({ q, onRead, onClose }) {
  const [hits, setHits] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [files, setFiles] = useState(null);
  useEffect(() => {
    setHits(null); setAnswer(null); setFiles(null);
    fetch(`/api/desk/console/laptop/search?q=${encodeURIComponent(q)}&k=8`).then(r => r.json())
      .then(d => setFiles(d.results ? d : { error: d.detail || d.error || 'laptop unavailable' }))
      .catch(() => setFiles({ error: 'laptop unavailable' }));
    fetch(`/api/desk/mail/search?q=${encodeURIComponent(q)}&k=12`).then(r => r.json()).then(setHits).catch(() => setHits({ error: 'offline' }));
    fetch(`/api/desk/mail/ask?q=${encodeURIComponent(q)}`).then(r => r.json()).then(setAnswer).catch(() => {});
  }, [q]);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, margin: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ color: C.ink, fontWeight: 600 }}>“{q}”</div>
        <button onClick={onClose} style={{ ...linkBtn, padding: 0 }}>close</button>
      </div>
      {answer && !answer.error && answer.status !== 'declined' && (
        <div style={{ color: C.soft, fontSize: 14, margin: '10px 0', borderLeft: `3px solid ${C.signal}`, paddingLeft: 10 }}>
          <span style={{ color: C.faint, fontSize: 12 }}>{answer.status}</span><br />{answer.claim?.slice(0, 400)}
        </div>
      )}
      <div style={{ color: C.faint, fontSize: 12, marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        On the laptop</div>
      {!files && <div style={{ color: C.faint, fontSize: 13, marginTop: 6 }}>asking the laptop…</div>}
      {files?.error && <div style={{ color: C.faint, fontSize: 13, marginTop: 6 }}>{files.error}</div>}
      {files?.results?.length === 0 && <div style={{ color: C.faint, fontSize: 13, marginTop: 6 }}>no files match</div>}
      {(files?.results || []).map(f => (
        <div key={f.path} onClick={() => onRead('laptop', f.path)}
             style={{ padding: '9px 0', borderBottom: `1px solid ${C.line}`, cursor: 'pointer', display: 'flex', gap: 10 }}>
          <span style={{ color: KIND_COLOR.laptop }}>▤</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.ink, fontSize: 14 }}>{f.name}</div>
            <div style={{ color: C.faint, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.shown} · {f.where}</div>
          </div>
        </div>
      ))}
      <div style={{ color: C.faint, fontSize: 12, marginTop: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        In mail</div>
      {!hits && <div style={{ color: C.faint, fontSize: 13, marginTop: 8 }}>searching…</div>}
      {hits?.error && <div style={{ color: C.bad, fontSize: 13, marginTop: 8 }}>{hits.error}</div>}
      {(hits?.results || []).map((r, i) => (
        <div key={i} onClick={() => r.key && onRead('mail', r.key)} style={{ padding: '10px 0', borderBottom: `1px solid ${C.line}`, cursor: 'pointer' }}>
          <div style={{ color: C.faint, fontSize: 12 }}>{r.scene} · {r.path}</div>
          <div style={{ color: C.soft, fontSize: 14, whiteSpace: 'pre-wrap' }}>{(r.snippet || '').slice(0, 260)}</div>
        </div>
      ))}
    </div>
  );
}

export default function Console() {
  const [feed, setFeed] = useState(null);
  const [live, setLive] = useState(false);
  const [runId, setRunId] = useState(null);
  const [doc, setDoc] = useState(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/desk/console/feed').then(r => r.json()).then(d => !d.error && setFeed(d)).catch(() => {});
    const es = new EventSource('/api/desk/console/feed/stream');
    es.addEventListener('feed', e => setFeed(JSON.parse(e.data)));
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    return () => es.close();
  }, []);

  const run = useCallback(async (text, tool, args) => {
    setBusy(true);
    const r = await post('/api/desk/agents/runs', tool ? { text, tool, args } : { text }).catch(() => null);
    setBusy(false);
    if (r?.id) { setRunId(r.id); setDoc(null); setQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  }, []);

  const read = useCallback(async (kind, ref) => {
    const path = ['read', kind, ...ref.split('/')].map(encodeURIComponent).join('/');
    const d = await fetch(`/api/desk/console/${path}`).then(r => r.json()).catch(() => null);
    if (d && !d.error && !d.detail) setDoc(d);
  }, []);

  const open = item => (item.kind === 'run' ? setRunId(item.ref) : read(item.kind === 'draft' ? 'note' : item.kind, item.ref));

  return (
    <div style={{ minHeight: '100vh', background: C.ground, color: C.ink, fontFamily: sans }}>
      <Head>
        <title>Agent Smith</title>
        <meta name="robots" content="noindex" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content={C.ground} />
        <link rel="icon" href="/img/favicon.ico" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '18px 16px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, letterSpacing: '0.02em' }}>
            <span style={{ color: live ? C.ok : C.warn }}>●</span> Agent Smith
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 13 }}>
            {[['brief', '/desk/brief'], ['plan', '/desk/plan'], ['inbox', '/desk/inbox'], ['keys', '/desk/keys']].map(([l, h]) => (
              <Link key={h} href={h} style={{ color: C.faint, textDecoration: 'none' }}>{l}</Link>
            ))}
          </div>
        </div>

        <CommandBar onRun={run} onSearch={setQuery} busy={busy} />
        <NowNext feed={feed} />

        {query && <SearchResults q={query} onRead={read} onClose={() => setQuery('')} />}
        {runId && <RunPanel runId={runId} onRead={read} />}

        <div style={{ marginTop: 12 }}>
          {!feed && <div style={{ color: C.faint, fontSize: 13 }}>loading…</div>}
          {feed?.items?.map(it => <FeedRow key={it.id} item={it} onOpen={open} selected={it.kind === 'run' && it.ref === runId} />)}
          {feed && !feed.items?.length && <div style={{ color: C.faint, fontSize: 13 }}>Nothing yet — say something above.</div>}
        </div>
      </div>

      <Reader doc={doc} onClose={() => setDoc(null)} onRead={read} onRun={run} />
    </div>
  );
}

Console.bare = true;   // no portfolio chrome over the controls (see pages/_app.js)
