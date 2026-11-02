import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { C, CSS, linkBtn, pill, post, sans } from '../../components/console/Reader';

// Filling in documents (backend/forms). Each field is a node of the working memory: a model
// may propose a value with a quote, but only a quote found verbatim in a document you
// attached — or your own answer — counts. A field is written into the PDF only once it is
// solved; everything else waits here for you, with the evidence behind it.

const STATUS = {
  solved: { color: C.ok, says: 'will be filled' },
  declined: { color: C.faint, says: 'left blank' },
  undecided: { color: C.warn, says: 'needs you' },
  assumed: { color: C.warn, says: 'needs you' },
};

const b64 = file => new Promise((ok, fail) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result));
  r.onerror = fail;
  r.readAsDataURL(file);
});

function NewForm({ onMade }) {
  const [title, setTitle] = useState('');
  const [labels, setLabels] = useState('');
  const [needLabels, setNeedLabels] = useState(false);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const make = async () => {
    setErr('');
    const body = { title: title || file?.name || 'Form' };
    if (file) body.pdf_b64 = await b64(file);
    if (labels.trim()) body.labels = labels.split('\n');
    const r = await post('/api/desk/forms', body).catch(() => null);
    if (r?.id) onMade(r);
    else { setErr(r?.detail || r?.error || 'the node did not answer'); if (String(r?.detail).includes('labels')) setNeedLabels(true); }
  };
  const input = { background: C.panel, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 15, width: '100%' };
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, margin: '12px 0' }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>A new form</div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What it is, e.g. Ergänzungsfragebogen" style={input} />
      <div style={{ margin: '10px 0', fontSize: 14, color: C.soft }}>
        The PDF: <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
      </div>
      {(needLabels || !file) && (
        <textarea value={labels} onChange={e => setLabels(e.target.value)} rows={4} style={{ ...input, fontFamily: sans }}
          placeholder="No fillable PDF? The field labels, one per line — you get a value sheet back" />
      )}
      {err && <div style={{ color: C.bad, fontSize: 13, marginTop: 6 }}>{err}</div>}
      <button onClick={make} style={{ ...pill, marginTop: 10 }}>Make it</button>
    </div>
  );
}

function Sources({ form, onChange }) {
  const [path, setPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const send = async body => {
    setBusy(true); setErr('');
    const r = await post(`/api/desk/forms/${form.id}/sources`, body).catch(() => null);
    setBusy(false);
    if (r?.id) onChange(r); else setErr(r?.detail || r?.error || 'the node did not answer');
  };
  const upload = async e => {
    for (const f of e.target.files || []) await send({ name: f.name, ctype: f.type, data_b64: await b64(f) });
  };
  return (
    <div style={{ margin: '12px 0', fontSize: 14, color: C.soft }}>
      <div style={{ color: C.ink, fontWeight: 600, marginBottom: 6 }}>Documents the values may come from</div>
      {form.sources.map(s => <div key={s.id} style={{ color: C.soft }}>{s.id} · {s.name} <span style={{ color: C.faint }}>({s.chars} characters)</span></div>)}
      {!form.sources.length && <div style={{ color: C.faint }}>None yet: your passport, contract, last year's form, a letter …</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="file" multiple onChange={upload} disabled={busy} />
        <input value={path} onChange={e => setPath(e.target.value)} placeholder="or a path on the laptop"
          style={{ flex: 1, minWidth: 180, background: C.panel, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: '6px 8px' }} />
        <button disabled={!path || busy} onClick={() => send({ laptop_path: path }).then(() => setPath(''))} style={pill}>add</button>
      </div>
      {err && <div style={{ color: C.bad, fontSize: 13, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

function Row({ form, r, onChange }) {
  const [typed, setTyped] = useState('');
  const st = STATUS[r.status];
  const answer = async value => {
    const v = await post(`/api/desk/forms/${form.id}/answer`, { field: r.name, value, remember: true }).catch(() => null);
    if (v?.id) { onChange(v); setTyped(''); }
  };
  const best = r.status === 'solved' ? r.value : (r.leader && r.leader !== '⊥' ? r.leader : r.candidates?.[0]);
  return (
    <div style={{ borderBottom: `1px solid ${C.line}`, padding: '10px 2px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ color: C.ink, fontSize: 15 }}>{r.label}{r.label !== r.name && <span style={{ color: C.faint, fontSize: 12 }}> · {r.name}</span>}</div>
        <div style={{ color: st.color, fontSize: 12, flexShrink: 0 }}>{st.says}{r.margin != null && r.status !== 'assumed' ? ` · ${r.margin}/${form.theta} nats` : ''}</div>
      </div>
      {best && <div style={{ color: r.status === 'solved' ? C.ok : C.soft, fontSize: 15, margin: '4px 0' }}>{best}</div>}
      {r.evidence.map((e, i) => (
        <div key={i} style={{ color: C.faint, fontSize: 12, borderLeft: `2px solid ${C.line}`, paddingLeft: 8, margin: '2px 0' }}>
          {e.channel === 'person' ? 'you' : e.source}: “{e.cue}”
        </div>
      ))}
      {r.status !== 'solved' && r.status !== 'declined' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {best && <button onClick={() => answer(best)} style={pill}>✓ {best.length > 30 ? 'confirm' : best}</button>}
          {r.kind === 'checkbox' && r.options.map(o => o !== best && <button key={o} onClick={() => answer(o)} style={pill}>{o}</button>)}
          {r.kind !== 'checkbox' && (
            <input value={typed} onChange={e => setTyped(e.target.value)} onKeyDown={e => e.key === 'Enter' && typed && answer(typed)}
              placeholder="type the value" style={{ flex: 1, minWidth: 140, background: C.panel, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 18, padding: '6px 12px' }} />
          )}
          <button onClick={() => answer(null)} style={{ ...linkBtn, color: C.faint }}>leave blank</button>
        </div>
      )}
    </div>
  );
}

function Form({ id, onBack }) {
  const [f, setF] = useState(null);
  const [cloud, setCloud] = useState(false);
  const load = useCallback(() => fetch(`/api/desk/forms/${id}`).then(r => r.json()).then(d => d.id && setF(d)).catch(() => {}), [id]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {                                   // while a model reads, look again every few seconds
    if (f?.status !== 'reading') return undefined;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [f?.status, load]);
  if (!f) return <div style={{ color: C.faint }}>loading…</div>;
  const read = async () => { const v = await post(`/api/desk/forms/${id}/read`, { allow_cloud: cloud }).catch(() => null); if (v?.id) setF(v); };
  const open = f.rows.filter(r => r.status === 'undecided' || r.status === 'assumed');
  return (
    <div>
      <button onClick={onBack} style={{ ...linkBtn, padding: 0 }}>← all forms</button>
      <h2 style={{ margin: '8px 0 2px', fontSize: 20 }}>{f.title}</h2>
      <div style={{ color: C.faint, fontSize: 13 }}>
        {f.counts.solved} will be filled · {f.counts.declined} left blank · {open.length} need you · a value is written at {f.theta} nats
      </div>
      <Sources form={f} onChange={setF} />
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '8px 0 4px' }}>
        <button onClick={read} disabled={f.status === 'reading' || !f.sources.length} style={pill}>
          {f.status === 'reading' ? 'reading the documents…' : 'Read the documents'}
        </button>
        <label style={{ fontSize: 13, color: cloud ? C.warn : C.faint }}>
          <input type="checkbox" checked={cloud} onChange={e => setCloud(e.target.checked)} /> allow cloud models
          {cloud && ' — the documents’ text leaves the server (Gemini’s free tier may use it to improve Google’s products)'}
        </label>
      </div>
      {f.note && <div style={{ color: C.soft, fontSize: 13, margin: '4px 0 10px' }}>{f.note}</div>}
      <a href={`/api/desk/forms/${id}/filled`} style={{ ...pill, display: 'inline-block', textDecoration: 'none', margin: '6px 0 12px' }}>
        Download {f.kind === 'pdf' ? 'the filled PDF' : 'the value sheet'} ({f.counts.solved} field{f.counts.solved === 1 ? '' : 's'})
      </a>
      {open.length > 0 && <div style={{ color: C.warn, fontWeight: 600, marginTop: 8 }}>Needs you</div>}
      {open.map(r => <Row key={r.name} form={f} r={r} onChange={setF} />)}
      {f.rows.some(r => r.status === 'solved' || r.status === 'declined') && <div style={{ color: C.faint, fontWeight: 600, marginTop: 16 }}>Settled</div>}
      {f.rows.filter(r => r.status === 'solved' || r.status === 'declined').map(r => <Row key={r.name} form={f} r={r} onChange={setF} />)}
    </div>
  );
}

export default function Forms() {
  const [list, setList] = useState(null);
  const [id, setId] = useState(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('id');
    if (q) setId(q);
    fetch('/api/desk/forms').then(r => r.json()).then(d => Array.isArray(d) && setList(d)).catch(() => setList([]));
  }, []);
  const pick = fid => { setId(fid); window.history.replaceState(null, '', fid ? `?id=${fid}` : '/desk/forms'); };
  return (
    <div style={{ minHeight: '100vh', background: C.ground, color: C.ink, fontFamily: sans }}>
      <Head><title>Forms · Agent Smith</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '18px 16px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <Link href="/desk/console" style={{ color: C.faint, textDecoration: 'none' }}>← console</Link>
          <div style={{ fontWeight: 700 }}>Forms</div>
        </div>
        {id ? <Form id={id} onBack={() => pick(null)} /> : (
          <>
            <NewForm onMade={f => { setList([f, ...(list || [])]); pick(f.id); }} />
            {list?.map(f => (
              <div key={f.id} onClick={() => pick(f.id)} style={{ padding: '12px 4px', borderBottom: `1px solid ${C.line}`, cursor: 'pointer' }}>
                <div style={{ color: C.ink }}>{f.title}</div>
                <div style={{ color: C.faint, fontSize: 12 }}>{f.kind === 'pdf' ? 'fillable PDF' : 'value sheet'} · {new Date(f.created).toLocaleDateString('en-GB')}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

Forms.bare = true;
