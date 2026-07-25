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
  const areaRef = useRef(null);

  useEffect(() => {
    if (areaRef.current) areaRef.current.focus();
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

function ResultView({ result }) {
  const { tool, query, slice, m } = result;
  const toolColor = tool === 'spraypaint' ? COLORS.spraypaint : COLORS.purpose;

  return (
    <section style={S.result}>
      <div style={S.metaRow}>
        <span style={{ ...S.toolTag, color: toolColor, borderColor: toolColor }}>{tool}</span>
        <span style={S.query}>“{query}”</span>
        <span style={S.count}>m&nbsp;=&nbsp;{m}</span>
      </div>

      {slice.kind === 'purpose' ? (
        <PurposeSlice text={slice.text} />
      ) : (
        <SpraypaintSlice slice={slice} />
      )}
    </section>
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
};
