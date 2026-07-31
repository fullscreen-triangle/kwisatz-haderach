import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';

// Agent Smith — the command surface.
//
// A phone-first, standalone PWA page (no portfolio chrome). Dictate a command
// with the native keyboard mic, hit Run, and the intent travels to the local
// node and returns a ranked slice. This is the whole MVP round-trip, from the
// user's side of the screen.

const COLORS = {
  ground: '#0B0E13',
  panel: '#12161E',
  panel2: '#171C26',
  ink: '#E6EBF2',
  inkSoft: '#B4BECC',
  inkFaint: '#7A8698',
  line: '#2A313E',
  signal: '#3FD0C9',
  signalDim: 'rgba(63,208,201,.14)',
  purpose: '#C08A2E',
  spraypaint: '#3FD0C9',
  warn: '#E0A93E',
};

const EXAMPLES = [
  'where is the tick loop',
  'find passages about water filling',
  'where is the committed count',
];

export default function CommandPage() {
  const [text, setText] = useState('');
  const [state, setState] = useState('idle'); // idle | running | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [keys, setKeys] = useState(null); // {n_set, n_missing_known, missing, keys[]} | 'error' | null
  const areaRef = useRef(null);

  useEffect(() => {
    if (areaRef.current) areaRef.current.focus();
  }, []);

  // Pull the node's credential status once on load — value-free presence report, so the
  // strip can flag "your keys are stale" before you waste a command on a dead integration.
  useEffect(() => {
    let alive = true;
    fetch('/api/secrets-status')
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d) => alive && setKeys(d))
      .catch(() => alive && setKeys('error'));
    return () => {
      alive = false;
    };
  }, []);

  async function run() {
    const t = text.trim();
    if (!t || state === 'running') return;
    setState('running');
    setError('');
    setResult(null);
    try {
      const resp = await fetch('/api/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: t }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || data.detail || `Error ${resp.status}`);
        setState('error');
        return;
      }
      setResult(data);
      setState('done');
    } catch (e) {
      setError(e.message || 'Network error');
      setState('error');
    }
  }

  function onKeyDown(e) {
    // Enter runs; Shift+Enter is a newline.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      run();
    }
  }

  return (
    <>
      <Head>
        <title>Agent Smith</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>

      <main style={S.main}>
        <div style={S.wrap}>
          <header style={S.header}>
            <div style={S.brand}>
              <span style={S.dot} />
              Agent&nbsp;Smith
            </div>
            <div style={S.sub}>utter a command · your machine runs it</div>
          </header>

          <KeyStrip keys={keys} />


          <div style={S.inputCard}>
            <textarea
              ref={areaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Tap the mic on your keyboard and speak, or type…"
              rows={3}
              style={S.textarea}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              onClick={run}
              disabled={state === 'running' || !text.trim()}
              style={{
                ...S.run,
                opacity: state === 'running' || !text.trim() ? 0.5 : 1,
                cursor: state === 'running' || !text.trim() ? 'default' : 'pointer',
              }}
            >
              {state === 'running' ? 'Running…' : 'Run ▸'}
            </button>
          </div>

          {state === 'idle' && (
            <div style={S.examples}>
              {EXAMPLES.map((ex) => (
                <button key={ex} style={S.chip} onClick={() => setText(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          )}

          {state === 'error' && (
            <div style={S.errorBox}>
              <b style={{ color: COLORS.warn }}>Couldn’t run that.</b>
              <div style={{ marginTop: 4 }}>{error}</div>
            </div>
          )}

          {state === 'done' && result && <ResultView result={result} />}
        </div>
      </main>
    </>
  );
}

// KeyStrip — a value-free glance at the node's credentials. Green when all known keys are
// present, amber when some are missing (so you know an integration is dead before you call
// it), muted when the node is unreachable. Tap to see WHICH keys are missing — never values.
function KeyStrip({ keys }) {
  const [open, setOpen] = useState(false);
  if (keys == null) return null; // still loading — say nothing
  if (keys === 'error' || keys.error) {
    return <div style={{ ...S.keyStrip, borderColor: COLORS.line, color: COLORS.inkFaint }}>
      keys · node offline
    </div>;
  }
  const nSet = keys.n_set ?? 0;
  const known = (keys.keys || []).filter((k) => k.known);
  const total = known.length || (nSet + (keys.n_missing_known ?? 0));
  const missing = keys.missing || [];
  const allGood = missing.length === 0 && total > 0;
  const color = allGood ? COLORS.signal : COLORS.warn;

  return (
    <div
      style={{ ...S.keyStrip, borderColor: color, color, cursor: missing.length ? 'pointer' : 'default' }}
      onClick={() => missing.length && setOpen((o) => !o)}
    >
      <span>
        <span style={{ fontWeight: 700 }}>keys</span> · {nSet}/{total} live
        {allGood ? ' ✓' : ` · ${missing.length} missing`}
      </span>
      {open && missing.length > 0 && (
        <div style={S.keyMissing}>
          missing on node: {missing.join(', ')}
          <div style={{ color: COLORS.inkFaint, marginTop: 4 }}>
            set on the Chromebook: <code>bash backend/manage-secrets.sh set {missing[0]}</code>
          </div>
        </div>
      )}
    </div>
  );
}

const TOOL_COLORS = {
  spraypaint: COLORS.spraypaint,
  purpose: COLORS.purpose,
  facts: COLORS.warn,
  nav: '#7FB4FF',
  web: '#8AB4F8',
};

function ResultView({ result }) {
  const { tool, query, slice, m, answer } = result;
  const toolColor = TOOL_COLORS[tool] || COLORS.purpose;

  return (
    <section style={S.result}>
      <div style={S.metaRow}>
        <span style={{ ...S.toolTag, color: toolColor, borderColor: toolColor }}>{tool}</span>
        <span style={S.query}>“{query}”</span>
        <span style={S.count}>m&nbsp;=&nbsp;{m}</span>
      </div>

      {slice.kind === 'purpose' && <PurposeSlice text={slice.text} />}
      {slice.kind === 'spraypaint' && <SpraypaintSlice slice={slice} />}
      {slice.kind === 'web' && <WebSlice slice={slice} />}
      {slice.kind === 'facts' && <PhrasedSlice slice={slice} />}
      {slice.kind === 'nav' && <NavSlice slice={slice} />}
      {slice.kind === 'readfile' && <ReadfileSlice slice={slice} />}

      {answer && <div style={S.answer}>{answer}</div>}
    </section>
  );
}

// web — "search Google in Chrome on the node". The node opens Chrome; the phone gets a
// tappable link so it can open the same search here too (the "open on node, link on phone"
// shape). launched=false just means the node was headless — the link still works.
function WebSlice({ slice }) {
  return (
    <div style={S.slice}>
      <div style={S.answer}>{slice.answer}</div>
      {slice.url && (
        <a href={slice.url} target="_blank" rel="noopener noreferrer" style={S.openBtn}>
          Open search ▸
        </a>
      )}
      <div style={S.webMeta}>
        {slice.launched
          ? `✓ opened in Chrome on your machine (${slice.launch_detail})`
          : `machine didn’t open a window — ${slice.launch_detail}`}
      </div>
    </div>
  );
}

// facts — a phrased answer + optional rows (repo list).
function PhrasedSlice({ slice }) {
  const rows = slice.rows || [];
  return (
    <div style={S.slice}>
      <div style={S.answer}>{slice.answer}</div>
      {rows.length > 0 && (
        <div style={S.sceneGroup}>
          {rows.map((r, i) => (
            <div key={i} style={S.passage}>
              <div style={S.passageHead}>
                {r.name || r.path}
                {r.language && <span style={S.score}>{r.language}</span>}
              </div>
              {r.description && <div style={S.snippet}>{r.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// nav — a directory listing (folders/files) with a spoken hint per entry.
function NavSlice({ slice }) {
  const entries = slice.entries || [];
  return (
    <div style={S.slice}>
      <div style={S.answer}>{slice.answer}</div>
      {entries.length === 0 && <div style={S.empty}>(empty)</div>}
      {entries.map((e, i) => {
        const isDir = e.type === 'dir';
        return (
          <div key={i} style={S.navRow}>
            <span>{isDir ? '📁' : '📄'} {e.name}</span>
            <span style={S.navHint}>{isDir ? `say “open ${e.name}”` : `say “read ${e.name}”`}</span>
          </div>
        );
      })}
    </div>
  );
}

// readfile — a summary (if Ollama was up) + a collapsible file excerpt.
function ReadfileSlice({ slice }) {
  return (
    <div style={S.slice}>
      <div style={S.webMeta}>read {slice.path}{slice.truncated ? ' (head only)' : ''}</div>
      {slice.answer
        ? <div style={S.answer}>{slice.answer}</div>
        : <div style={S.answer}>Summary needs Ollama (it’s down). Excerpt below.</div>}
      {slice.excerpt && (
        <details style={{ marginTop: 8 }}>
          <summary style={{ color: COLORS.signal, fontSize: 13, cursor: 'pointer' }}>
            show file excerpt
          </summary>
          <div style={{ ...S.rawLine, marginTop: 8 }}>{slice.excerpt}</div>
        </details>
      )}
    </div>
  );
}

function PurposeSlice({ text }) {
  // purpose returns plain ranked lines: `path:line  [kind] name` + snippet.
  const lines = text.split('\n').filter((l) => l.trim());
  return (
    <div style={S.slice}>
      {lines.map((l, i) => (
        <div key={i} style={S.rawLine}>
          {l}
        </div>
      ))}
    </div>
  );
}

function SpraypaintSlice({ slice }) {
  const results = slice.results || [];
  // group by scene so a dense area cannot crowd out the rest
  const byScene = results.reduce((acc, r) => {
    (acc[r.scene] = acc[r.scene] || []).push(r);
    return acc;
  }, {});
  return (
    <div style={S.slice}>
      {slice.price != null && (
        <div style={S.price}>
          water-filling price p* = {Number(slice.price).toFixed(2)}
        </div>
      )}
      {Object.entries(byScene).map(([scene, rs]) => (
        <div key={scene} style={S.sceneGroup}>
          <div style={S.sceneLabel}>{scene}</div>
          {rs.map((r, i) => (
            <div key={i} style={S.passage}>
              <div style={S.passageHead}>
                {r.path}:{r.start_line}
                <span style={S.score}>{Number(r.score).toFixed(1)}</span>
              </div>
              <div style={S.snippet}>{r.snippet}</div>
            </div>
          ))}
        </div>
      ))}
      {results.length === 0 && <div style={S.empty}>No passages cleared the price.</div>}
    </div>
  );
}

const mono = 'ui-monospace, "JetBrains Mono", Menlo, Consolas, monospace';
const sans = 'system-ui, -apple-system, "Segoe UI", Inter, sans-serif';

const S = {
  main: {
    minHeight: '100vh',
    background: COLORS.ground,
    color: COLORS.ink,
    fontFamily: sans,
    padding: 'max(20px, env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom))',
    WebkitFontSmoothing: 'antialiased',
  },
  wrap: { maxWidth: 620, margin: '0 auto' },
  header: { paddingTop: 8, marginBottom: 22 },
  brand: {
    fontSize: 22, fontWeight: 700, letterSpacing: '-.02em',
    display: 'flex', alignItems: 'center', gap: 9,
  },
  dot: {
    width: 10, height: 10, borderRadius: '50%', background: COLORS.signal,
    boxShadow: `0 0 12px ${COLORS.signal}`,
  },
  sub: { color: COLORS.inkFaint, fontSize: 13, fontFamily: mono, marginTop: 5, letterSpacing: '.02em' },

  inputCard: {
    background: COLORS.panel, border: `1px solid ${COLORS.line}`,
    borderRadius: 14, padding: 12,
  },
  textarea: {
    width: '100%', background: 'transparent', border: 'none', outline: 'none',
    color: COLORS.ink, fontSize: 17, fontFamily: sans, resize: 'none',
    lineHeight: 1.5, padding: '4px 4px 10px',
  },
  run: {
    width: '100%', background: COLORS.signal, color: '#04201E',
    border: 'none', borderRadius: 10, padding: '13px 16px',
    fontSize: 16, fontWeight: 700, fontFamily: mono, letterSpacing: '.02em',
  },

  examples: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: {
    background: COLORS.panel2, border: `1px solid ${COLORS.line}`, color: COLORS.inkSoft,
    borderRadius: 100, padding: '7px 13px', fontSize: 12.5, fontFamily: mono, cursor: 'pointer',
  },

  errorBox: {
    marginTop: 18, background: COLORS.panel, border: `1px solid ${COLORS.warn}`,
    borderRadius: 12, padding: '14px 16px', fontSize: 14, color: COLORS.inkSoft,
  },

  result: { marginTop: 22 },
  metaRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' },
  toolTag: {
    fontFamily: mono, fontSize: 12, fontWeight: 600, padding: '3px 9px',
    border: '1px solid', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '.06em',
  },
  query: { color: COLORS.inkSoft, fontSize: 14, fontStyle: 'italic', flex: 1, minWidth: 120 },
  count: { fontFamily: mono, fontSize: 12, color: COLORS.inkFaint },

  slice: { display: 'flex', flexDirection: 'column', gap: 10 },
  rawLine: {
    fontFamily: mono, fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.6,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    borderLeft: `2px solid ${COLORS.line}`, paddingLeft: 12,
  },
  price: { fontFamily: mono, fontSize: 11.5, color: COLORS.signal, marginBottom: 4 },
  sceneGroup: {
    background: COLORS.panel, border: `1px solid ${COLORS.line}`,
    borderRadius: 12, padding: 14,
  },
  sceneLabel: {
    fontFamily: mono, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em',
    color: COLORS.inkFaint, marginBottom: 10,
  },
  passage: { marginBottom: 12 },
  passageHead: {
    fontFamily: mono, fontSize: 12, color: COLORS.signal,
    display: 'flex', justifyContent: 'space-between', gap: 10, wordBreak: 'break-all',
  },
  score: { color: COLORS.inkFaint, flex: 'none' },
  snippet: { fontSize: 13.5, color: COLORS.inkSoft, marginTop: 3, lineHeight: 1.5 },
  empty: { color: COLORS.inkFaint, fontSize: 13, fontFamily: mono },

  answer: {
    fontSize: 18, lineHeight: 1.45, color: COLORS.ink,
    background: COLORS.panel, border: `1px solid ${COLORS.line}`,
    borderRadius: 12, padding: '15px 16px',
  },
  openBtn: {
    display: 'block', textAlign: 'center', textDecoration: 'none',
    background: '#8AB4F8', color: '#0B0D10', fontWeight: 700, fontFamily: mono,
    fontSize: 16, letterSpacing: '.02em', padding: '14px 16px', borderRadius: 10,
  },
  webMeta: { fontFamily: mono, fontSize: 12, color: COLORS.inkFaint },
  navRow: {
    display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center',
    fontSize: 14.5, color: COLORS.ink, padding: '9px 0',
    borderTop: `1px solid ${COLORS.line}`,
  },
  navHint: { fontFamily: mono, fontSize: 11.5, color: COLORS.inkFaint, flex: 'none' },

  keyStrip: {
    fontFamily: mono, fontSize: 12, letterSpacing: '.02em',
    border: '1px solid', borderRadius: 100, padding: '6px 13px',
    display: 'inline-block', marginBottom: 16,
  },
  keyMissing: {
    fontSize: 11.5, marginTop: 8, paddingTop: 8, color: COLORS.inkSoft,
    borderTop: `1px solid ${COLORS.line}`, lineHeight: 1.5, wordBreak: 'break-word',
  },
};
