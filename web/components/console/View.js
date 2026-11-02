import { useEffect, useRef, useState } from 'react';
import { C } from './Reader';

// A spectacular view (linked views of one table) from a spec whose rows are inline
// (data.values). The viewer is one prebuilt ES module, loaded at run time from
// /vendor/spectacular/spectacular.js — viewer, worker and WASM in one file, no fetches.
// That file is either the desk build (renderers/spectacular: exports show/check) or the
// currentValue widget (anywidget: default.render); both are handled.

export function viewsIn(text) {
  const out = [];
  const rest = String(text || '').replace(/```spectacular\s*\n([\s\S]*?)```/g, (_, body) => {
    try { out.push({ spec: JSON.parse(body) }); } catch (e) { out.push({ error: `the view's spec is not JSON: ${e.message}` }); }
    return '';
  });
  return { views: out, text: rest.trim() };
}

export default function View({ spec, error, height = 420 }) {
  const el = useRef(null);
  const [err, setErr] = useState(error || '');
  useEffect(() => {
    if (error || !spec) return undefined;
    let cleanup;
    let gone = false;
    (async () => {
      try {
        if (spec?.data?.url) throw new Error('the spec reads data.url; a view in the desk carries its rows inline (data.values)');
        const mod = await import(/* webpackIgnore: true */ '/vendor/spectacular/spectacular.js');
        if (gone || !el.current) return;
        el.current.innerHTML = '';
        if (mod.show) {
          const h = await mod.show(el.current, spec);
          cleanup = h.destroy;
        } else {
          const host = { get: k => (k === 'spec' ? spec : k === 'files' ? {} : k === 'height' ? height : undefined),
                         set() {}, save_changes() {} };
          cleanup = await mod.default.render({ model: host, el: el.current });
        }
      } catch (e) {
        setErr(e?.problems ? e.problems.map(p => `${p.path}: ${p.message}`).join('\n') : String(e?.message || e));
      }
    })();
    return () => { gone = true; cleanup?.(); };
  }, [spec, error, height]);
  return (
    <div style={{ margin: '10px 0' }}>
      {spec?.title && <div style={{ color: C.soft, fontSize: 13, marginBottom: 4 }}>{spec.title}</div>}
      {err ? <pre style={{ color: C.bad, fontSize: 12, whiteSpace: 'pre-wrap' }}>{err}</pre>
           : <div ref={el} style={{ minHeight: height, position: 'relative' }} />}
    </div>
  );
}
