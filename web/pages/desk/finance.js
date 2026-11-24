import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';

// Personal finance: what you owe, what you are owed, the debt plan, parcels, bank imports.
// It reads, calculates and reminds; it never moves money. Data: backend/routes/finance.py.

const TEAL = '#14bfb5';
const AMBER = '#fbbf24';
const RED = '#f87171';
const GREEN = '#34d399';
const API = '/api/desk/finance';

const label = { fontSize: 12, fontWeight: 700, color: 'var(--font-color,#bbb)', opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 };
const card = { background: 'var(--assistant-color,#101010)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '14px 16px' };
const input = { background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', padding: '8px 12px', fontSize: 13, outline: 'none' };
const button = { background: 'none', border: `1px solid ${TEAL}`, color: TEAL, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 };

function eur(v) {
  if (v == null) return '—';
  const n = Number(v);
  return `€ ${n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function call(path, options) {
  const r = await fetch(`${API}/${path}`, options);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || data.error || `HTTP ${r.status}`);
  return data;
}

const post = (path, body) => call(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

function Figure({ title, value, color }) {
  return (
    <div style={{ ...card, flex: '1 1 160px' }}>
      <div style={{ fontSize: 11, opacity: 0.55, color: 'var(--font-color,#bbb)', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--heading-color,#fff)' }}>{value}</div>
    </div>
  );
}

function Alerts({ alerts }) {
  if (!alerts?.length) return null;
  const color = { urgent: RED, warning: AMBER, info: 'rgba(255,255,255,0.45)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
      {alerts.map((a, i) => (
        <div key={i} style={{ ...card, borderLeft: `3px solid ${color[a.level]}`, fontSize: 13 }}>
          <span style={{ color: color[a.level], fontWeight: 700, marginRight: 8, textTransform: 'uppercase', fontSize: 10 }}>{a.level}</span>
          {a.text}
        </div>
      ))}
    </div>
  );
}

function Receivable({ r, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function act(fn) {
    setBusy(true); setErr('');
    try { await fn(); await onChange(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }
  const deadline = r.days_to_deadline != null
    ? <span style={{ color: r.days_to_deadline <= 60 ? AMBER : 'inherit' }}>claim by {r.claim_deadline} ({r.days_to_deadline} days)</span>
    : null;
  return (
    <div style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--heading-color,#fff)' }}>{r.what || r.id}</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            {r.debtor}{r.due ? ` · due ${r.due}` : ''}{r.overdue_days ? ` · ${r.overdue_days} days overdue` : ''}
          </div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{deadline}</div>
          {r.last_action && (
            <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>last: {r.last_action.date} · {r.last_action.action} {r.last_action.note}</div>
          )}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>{eur(r.outstanding)}</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button style={button} disabled={busy} onClick={() => act(() => post(`receivables/${r.id}/log`, { action: 'claimed-in-writing', note: 'from the desk' }))}>Claimed in writing</button>
        <button style={button} disabled={busy} onClick={() => act(() => post(`receivables/${r.id}/log`, { action: 'reminded', note: 'from the desk' }))}>Reminded</button>
        <button style={button} disabled={busy} onClick={() => {
          const amount = window.prompt('Amount received (€)', r.outstanding);
          if (amount) act(() => post(`receivables/${r.id}/payment`, { amount: amount.replace(',', '.') }));
        }}>Payment received</button>
      </div>
      {err && <div style={{ color: RED, fontSize: 12, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

function PlanPanel({ debts, defaultMonthly }) {
  const [monthly, setMonthly] = useState(defaultMonthly || '');
  const [lumpMonth, setLumpMonth] = useState('');
  const [lumpAmount, setLumpAmount] = useState('');
  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    const qs = new URLSearchParams();
    if (monthly) qs.append('monthly', monthly);
    if (lumpMonth && lumpAmount) qs.append('lump', `${lumpMonth}=${lumpAmount}`);
    try { setPlan(await call(`plan?${qs}`)); } catch (e) { setErr(e.message); }
  }, [monthly, lumpMonth, lumpAmount]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {debts.map(d => (
          <div key={d.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--heading-color,#fff)' }}>{d.name}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {(Number(d.annual_rate) * 100).toFixed(1)} % a year {d.rate_basis === 'assumed' ? '(assumed)' : ''} · minimum {eur(d.minimum)}
              </div>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: RED }}>{eur(d.balance)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input style={{ ...input, width: 150 }} placeholder="€ per month to debt" value={monthly} onChange={e => setMonthly(e.target.value)} />
        <input style={{ ...input, width: 110 }} placeholder="YYYY-MM" value={lumpMonth} onChange={e => setLumpMonth(e.target.value)} />
        <input style={{ ...input, width: 120 }} placeholder="€ one-off" value={lumpAmount} onChange={e => setLumpAmount(e.target.value)} />
        <button style={button} onClick={load}>Plan</button>
      </div>
      {err && <div style={{ color: RED, fontSize: 12 }}>{err}</div>}
      {plan && (
        <div style={card}>
          {plan.never
            ? <div style={{ color: RED }}>At these payments the debt never ends: they do not cover the interest.</div>
            : <div style={{ fontSize: 15 }}>Debt-free in <b style={{ color: GREEN }}>{plan.debt_free}</b> · {plan.months} months · interest {eur(plan.total_interest)}</div>}
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 6 }}>
            {plan.debts.map(d => `${d.name}: paid off ${d.paid_off || '—'}, interest ${eur(d.interest)}`).join(' · ')}
          </div>
          {!plan.monthly_to_debt && <div style={{ fontSize: 12, opacity: 0.5, marginTop: 6 }}>Minimum payments only. Enter a monthly amount to see a faster plan.</div>}
        </div>
      )}
    </div>
  );
}

function Afford() {
  const [price, setPrice] = useState('');
  const [out, setOut] = useState(null);
  const [err, setErr] = useState('');
  async function check(e) {
    e.preventDefault(); setErr('');
    try { setOut(await call(`afford?price=${encodeURIComponent(price.replace(',', '.'))}`)); } catch (x) { setErr(x.message); }
  }
  return (
    <form onSubmit={check}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input style={{ ...input, width: 140 }} placeholder="Price €" value={price} onChange={e => setPrice(e.target.value)} />
        <button style={button} type="submit">Check</button>
      </div>
      {err && <div style={{ color: RED, fontSize: 12 }}>{err}</div>}
      {out && (
        <div style={{ ...card, fontSize: 13 }}>
          {out.delay_days != null
            ? <>Buying this now makes you debt-free about <b>{out.delay_days} days</b> later and costs {eur(out.extra_interest)} extra interest.</>
            : <>{out.note}</>}
        </div>
      )}
    </form>
  );
}

function Parcels() {
  const [parcels, setParcels] = useState([]);
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    try { setParcels((await call('deliveries')).parcels); } catch (e) { setMsg(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function scan() {
    setMsg('Reading mail…');
    try {
      const out = await post('deliveries/scan', {});
      setParcels(out.parcels);
      setMsg(`${out.scan.messages_read} messages read, ${out.scan.parcels_touched} parcels updated`);
    } catch (e) { setMsg(e.message); }
  }
  const color = { delivered: GREEN, 'out-for-delivery': AMBER };
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <button style={button} onClick={scan}>Scan mail</button>
        <span style={{ fontSize: 12, opacity: 0.6 }}>{msg}</span>
      </div>
      {parcels.length === 0 && <div style={{ fontSize: 13, opacity: 0.4 }}>No parcels yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {parcels.map(p => (
          <div key={p.number} style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 13 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{p.shop || p.carrier}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>
                {(p.carrier || '?').toUpperCase()} ·{' '}
                {p.url ? <a href={p.url} target="_blank" rel="noreferrer" style={{ color: TEAL }}>{p.number}</a> : p.number}
                {p.return_by ? ` · return by ${p.return_by} (${p.return_days_left} days)` : ''}
              </div>
            </div>
            <div style={{ color: color[p.status] || 'inherit', fontWeight: 700 }}>{p.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BankImport() {
  const [msg, setMsg] = useState('');
  const [months, setMonths] = useState(null);
  useEffect(() => { call('transactions?limit=1').then(d => setMonths(d.by_month)).catch(() => {}); }, []);
  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg('Importing…');
    // Sparkasse exports are often Windows-1252; decode them as such, else UTF-8.
    const buf = await file.arrayBuffer();
    let text = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
    try {
      const out = await post('import', { filename: file.name, text });
      setMsg(`${out.file}: ${out.added} new of ${out.rows} rows (${out.total} in total)`);
      setMonths(out.by_month);
    } catch (x) { setMsg(x.message); }
    e.target.value = '';
  }
  return (
    <div>
      <input type="file" accept=".csv,text/csv" onChange={onFile} style={{ fontSize: 12, marginBottom: 8 }} />
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 10 }}>{msg || 'Sparkasse (CSV-CAMT) or Revolut statement CSV.'}</div>
      {months && Object.keys(months).length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(months).map(([m, v]) => (
            <div key={m} style={{ ...card, fontSize: 12 }}>
              <b>{m}</b> · in {eur(v.in)} · out {eur(v.out)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Finance() {
  const [o, setO] = useState(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { setO(await call('overview')); setErr(''); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Money — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Personal finance</span>
        </p>
        <h1 className="title text-uppercase">Money</h1>
        <p style={{ opacity: 0.4, fontSize: 13, marginTop: 10 }}>
          What you owe · what you are owed · when you are free · parcels
        </p>
      </HeaderNormal>

      <div className="container" style={{ marginBottom: 80 }}>
        {err && <div style={{ color: RED, fontSize: 13, marginBottom: 16 }}>{err}</div>}
        {o && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              <Figure title="Owed to you" value={eur(o.owed_to_you)} color={GREEN} />
              <Figure title="Invested" value={eur(o.invested)} />
              <Figure title="You owe" value={eur(o.you_owe)} color={RED} />
              <Figure title="Net" value={eur(o.net)} color={Number(o.net) >= 0 ? GREEN : RED} />
            </div>
            {o.monthly?.net_income && (
              <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 20 }}>
                Each month: income {eur(o.monthly.net_income)} · fixed {eur(o.monthly.fixed_costs)} · debt minimums {eur(o.monthly.debt_minimums)} · left {eur(o.monthly.left_after_fixed_and_minimums)}
              </div>
            )}
            <Alerts alerts={o.alerts} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32 }}>
              <div>
                <div style={label}>Owed to you</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {o.receivables.length === 0 && <div style={{ fontSize: 13, opacity: 0.4 }}>Nothing outstanding.</div>}
                  {o.receivables.map(r => <Receivable key={r.id} r={r} onChange={load} />)}
                </div>
              </div>
              <div>
                <div style={label}>Debts and plan</div>
                <PlanPanel debts={o.debts} defaultMonthly="" />
                <div style={{ ...label, marginTop: 28 }}>Can I afford it?</div>
                <Afford />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 32, marginTop: 36 }}>
              <div>
                <div style={label}>Parcels</div>
                <Parcels />
              </div>
              <div>
                <div style={label}>Bank exports</div>
                <BankImport />
              </div>
            </div>
          </>
        )}
      </div>

      <Footer className="background-section" />
    </Layout>
  );
}
