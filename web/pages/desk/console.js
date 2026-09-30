import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Markdown from '../../components/console/Markdown';
import FindRun from '../../components/desk/FindRun';
import { C, CSS, Reader, linkBtn, post, sans } from '../../components/console/Reader';
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

const MARK = { run: '◉', mail: '✉', note: '✎', draft: '✉︎', repo: '⎇', key: '⚿' };
const STATE_COLOR = { running: C.warn, planning: C.warn, failed: C.bad, done: C.ok, action: C.warn,
                      pending: C.faint, moved: C.signal, dead: C.bad, expired: C.bad, soon: C.warn, draft: C.warn };

const hm = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
function ago(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

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
        placeholder="Say what to do — or ?words to search the laptop, mail and web"
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
      {run.find && <div style={{ marginTop: 12 }}><FindRun run={run.find} onRead={onRead} /></div>}
      {run.answer && !run.find && (
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

// ?words: search everywhere (laptop, mail, web) as a Harare run, each source judged by
// spraypaint (components/desk/FindRun); above it, the mail's phrased answer when it has one.
function SearchResults({ q, onRead, onClose }) {
  const [run, setRun] = useState(null);
  const [err, setErr] = useState('');
  const [answer, setAnswer] = useState(null);
  useEffect(() => {
    setRun(null); setErr(''); setAnswer(null);
    post('/api/desk/find', { query: q })
      .then(j => (j.run ? setRun(j.run) : setErr(j.detail || j.error || 'the search could not start')))
      .catch(() => setErr('the node did not answer'));
    fetch(`/api/desk/mail/ask?q=${encodeURIComponent(q)}`).then(r => r.json()).then(setAnswer).catch(() => {});
  }, [q]);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, margin: '16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ color: C.ink, fontWeight: 600 }}>“{q}”</div>
        <button onClick={onClose} style={{ ...linkBtn, padding: 0 }}>close</button>
      </div>
      {answer && !answer.error && answer.status !== 'declined' && (
        <div style={{ color: C.soft, fontSize: 14, margin: '0 0 10px', borderLeft: `3px solid ${C.signal}`, paddingLeft: 10 }}>
          <span style={{ color: C.faint, fontSize: 12 }}>{answer.status}</span><br />{answer.claim?.slice(0, 400)}
        </div>
      )}
      {err && <div style={{ color: C.bad, fontSize: 13 }}>{err}</div>}
      {!run && !err && <div style={{ color: C.faint, fontSize: 13 }}>starting…</div>}
      {run && <FindRun run={run} onRead={onRead} />}
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
            {[['runtime', '/desk/runtime'], ['brief', '/desk/brief'], ['plan', '/desk/plan'], ['inbox', '/desk/inbox'], ['keys', '/desk/keys']].map(([l, h]) => (
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
