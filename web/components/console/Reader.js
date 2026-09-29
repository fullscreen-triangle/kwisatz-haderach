import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Markdown from './Markdown';

// The desk's reader overlay and theme, shared by the console and the runtime map: tap anything,
// it opens in full as markdown, with its actions (open, summarise, reply, email it, …).

const ForceGraph = dynamic(() => import('./ForceGraph'), { ssr: false });

export const C = {
  ground: '#0B0E13', panel: '#12161E', panel2: '#171C26', ink: '#E6EBF2', soft: '#B4BECC',
  faint: '#7A8698', line: '#2A313E', signal: '#3FD0C9', warn: '#E0A93E', bad: '#EF6B6B', ok: '#5CC98A',
};
export const sans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
export const CSS = `
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

export const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
                                         body: JSON.stringify(body) }).then(r => r.json());

export const linkBtn = { background: 'none', border: 'none', color: C.signal, cursor: 'pointer', padding: '8px 0', fontSize: 13 };
export const pill = { background: C.panel2, border: `1px solid ${C.line}`, color: C.ink, borderRadius: 18, padding: '8px 14px',
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

export function Reader({ doc, onClose, onRead, onRun }) {
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
