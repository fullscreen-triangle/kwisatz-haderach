import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';

const TEAL   = '#14bfb5';
const STORES = ['rewe', 'kaufland', 'penny', 'amazon'];
const STORE_COLORS = {
  Rewe: '#ef4444', Kaufland: '#f59e0b', Penny: '#e11d48', Amazon: '#f97316',
};

// ── helpers ──────────────────────────────────────────────────────────────────

function storeColor(s) { return STORE_COLORS[s] || '#60a5fa'; }

function fmt(v) { return v != null ? `€ ${Number(v).toFixed(2)}` : '—'; }

function bestPrice(prices) {
  if (!prices || !Object.keys(prices).length) return null;
  return Math.min(...Object.values(prices).filter(v => v != null));
}

// ── sub-components ────────────────────────────────────────────────────────────

function Tag({ label, color }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 1,
      padding: '2px 7px', borderRadius: 3, marginRight: 4,
      background: color + '22', color,
    }}>{label}</span>
  );
}

function SearchResult({ result, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [qty, setQty]       = useState(1);
  const [store, setStore]   = useState('');

  function handleAdd() {
    const prices = {};
    if (store && result.price != null) prices[result.store] = result.price;
    onAdd({ name: result.name, qty, prices, unit: result.quantity || '' });
    setAdding(false);
  }

  return (
    <div style={{
      background: 'var(--assistant-color,#101010)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      {result.image && (
        <img src={result.image} alt="" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 4, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--heading-color,#fff)', marginBottom: 3 }}>
          {result.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--font-color,#bbb)', opacity: 0.6, marginBottom: 6 }}>
          {[result.brand, result.quantity].filter(Boolean).join(' · ')}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tag label={result.store} color={storeColor(result.store)} />
          {result.price != null && (
            <span style={{ fontWeight: 700, color: TEAL, fontSize: 14 }}>{fmt(result.price)}</span>
          )}
          {result.unit_price != null && (
            <span style={{ fontSize: 11, color: 'var(--font-color,#bbb)', opacity: 0.5 }}>
              {fmt(result.unit_price)} / 100g
            </span>
          )}
          {result.url && (
            <a href={result.url} target="_blank" rel="noreferrer"
               style={{ fontSize: 11, color: TEAL, opacity: 0.7, marginLeft: 'auto' }}>↗ view</a>
          )}
        </div>
      </div>
      {adding ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <input
            type="number" min="0.1" step="0.1" value={qty}
            onChange={e => setQty(e.target.value)}
            style={{ width: 48, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff', padding: '4px 6px', fontSize: 12 }}
          />
          <button onClick={handleAdd} style={{ background: TEAL, color: '#000', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            Add
          </button>
          <button onClick={() => setAdding(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: 'var(--font-color,#bbb)', padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>
            ✕
          </button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} style={{
          background: 'none', border: `1px solid ${TEAL}`, color: TEAL,
          borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, flexShrink: 0,
        }}>+ Add</button>
      )}
    </div>
  );
}

function ListItem({ item, onDelete, onPriceUpdate }) {
  const bp = bestPrice(item.prices);
  const [editing, setEditing] = useState(false);
  const [newStore, setNewStore]   = useState('Rewe');
  const [newPrice, setNewPrice]   = useState('');

  function savePrice() {
    if (!newPrice) return;
    const updated = { ...item.prices, [newStore]: parseFloat(newPrice) };
    onPriceUpdate(item.id, updated);
    setEditing(false);
    setNewPrice('');
  }

  return (
    <div style={{
      background: 'var(--assistant-color,#101010)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 8, padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, color: 'var(--heading-color,#fff)', fontSize: 14, flex: 1 }}>
          {item.qty > 1 && <span style={{ color: TEAL, marginRight: 4 }}>{item.qty}×</span>}
          {item.name}
          {item.unit && <span style={{ color: 'var(--font-color,#bbb)', fontSize: 11, opacity: 0.5, marginLeft: 6 }}>{item.unit}</span>}
        </span>
        {bp != null && <span style={{ fontWeight: 700, color: TEAL, fontSize: 14 }}>{fmt(bp)}</span>}
        <button onClick={() => setEditing(!editing)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, color: 'var(--font-color,#bbb)', padding: '3px 8px', cursor: 'pointer', fontSize: 11 }}>
          {editing ? '✕' : '+ price'}
        </button>
        <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
      </div>

      {Object.keys(item.prices || {}).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: editing ? 10 : 0 }}>
          {Object.entries(item.prices).map(([s, p]) => (
            <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: storeColor(s) + '22', color: storeColor(s) }}>
              {s}: {fmt(p)}
            </span>
          ))}
        </div>
      )}

      {editing && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}>
          <select value={newStore} onChange={e => setNewStore(e.target.value)}
            style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff', padding: '4px 8px', fontSize: 12 }}>
            {['Rewe','Kaufland','Penny','Lidl','Aldi','Amazon','Other'].map(s => <option key={s}>{s}</option>)}
          </select>
          <input type="number" min="0" step="0.01" placeholder="Price €" value={newPrice} onChange={e => setNewPrice(e.target.value)}
            style={{ width: 80, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff', padding: '4px 8px', fontSize: 12 }} />
          <button onClick={savePrice} style={{ background: TEAL, color: '#000', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Save</button>
        </div>
      )}
    </div>
  );
}

function OptimizeResult({ result, tripCost }) {
  const { global_cheapest, best_single_store, optimal_split } = result;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Cheapest per item', value: fmt(global_cheapest?.total), sub: 'ignore travel', color: '#60a5fa' },
          { label: 'Best single store', value: fmt(best_single_store?.total), sub: best_single_store?.store || '—', color: '#fbbf24' },
          { label: 'Optimal split', value: fmt(optimal_split?.total), sub: `saves ${fmt(optimal_split?.savings_vs_single)} vs single`, color: TEAL },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--assistant-color,#101010)', border: `1px solid ${s.color}33`,
            borderRadius: 8, padding: '16px 18px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: s.color, fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--heading-color,#fff)', marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--font-color,#bbb)', opacity: 0.6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Optimal split detail */}
      {optimal_split?.by_store && Object.keys(optimal_split.by_store).length > 0 && (
        <div style={{ background: 'var(--assistant-color,#101010)', border: `1px solid ${TEAL}33`, borderRadius: 8, padding: '18px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: TEAL, marginBottom: 14, letterSpacing: 1, textTransform: 'uppercase' }}>
            Shopping plan — {optimal_split.stores?.join(' + ')}
            {tripCost > 0 && optimal_split.stores?.length > 1 && (
              <span style={{ color: 'var(--font-color,#bbb)', fontWeight: 400, marginLeft: 8 }}>
                (incl. {fmt(optimal_split.trip_cost)} travel)
              </span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {Object.entries(optimal_split.by_store).map(([store, data]) => (
              <div key={store} style={{ borderLeft: `3px solid ${storeColor(store)}`, paddingLeft: 12 }}>
                <div style={{ fontWeight: 700, color: storeColor(store), marginBottom: 8, fontSize: 13 }}>
                  {store} <span style={{ color: 'var(--font-color,#bbb)', fontWeight: 400 }}>— {fmt(data.subtotal)}</span>
                </div>
                {data.items.map(item => (
                  <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--font-color,#bbb)', marginBottom: 4 }}>
                    <span>{item.qty > 1 ? `${item.qty}× ` : ''}{item.name}</span>
                    <span style={{ color: 'var(--heading-color,#fff)', marginLeft: 8 }}>{fmt(item.price)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Groceries() {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const [list,    setList]    = useState([]);
  const [listErr, setListErr] = useState(null);

  const [tripCost, setTripCost]     = useState(2.0);
  const [optimRes, setOptimRes]     = useState(null);
  const [optimLoad, setOptimLoad]   = useState(false);
  const [optimErr,  setOptimErr]    = useState(null);

  const [addName, setAddName]   = useState('');
  const [addQty,  setAddQty]    = useState(1);
  const [addUnit, setAddUnit]   = useState('');

  const debounceRef = useRef(null);

  useEffect(() => { fetchList(); }, []);

  function fetchList() {
    fetch('/api/desk/groceries/list')
      .then(r => r.json())
      .then(setList)
      .catch(e => setListErr(e.message));
  }

  function handleSearch(e) {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    setResults(null);
    fetch(`/api/desk/groceries/search?query=${encodeURIComponent(query)}&stores=rewe,kaufland,penny,amazon&limit=5`)
      .then(r => r.json())
      .then(data => { setResults(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }

  function addFromSearch({ name, qty, prices, unit }) {
    fetch('/api/desk/groceries/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, qty, prices, unit }),
    }).then(r => r.json()).then(item => setList(l => [...l, item]));
  }

  function addManual(e) {
    e.preventDefault();
    if (!addName.trim()) return;
    fetch('/api/desk/groceries/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName.trim(), qty: addQty || 1, unit: addUnit, prices: {} }),
    }).then(r => r.json()).then(item => {
      setList(l => [...l, item]);
      setAddName(''); setAddQty(1); setAddUnit('');
    });
  }

  function deleteItem(id) {
    fetch(`/api/desk/groceries/list?id=${id}`, { method: 'DELETE' })
      .then(() => setList(l => l.filter(i => i.id !== id)));
  }

  function updatePrices(id, prices) {
    fetch('/api/desk/groceries/list', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, prices }),
    }).then(r => r.json()).then(updated => setList(l => l.map(i => i.id === id ? updated : i)));
    setOptimRes(null);
  }

  function optimize() {
    const itemsWithPrices = list.filter(i => Object.keys(i.prices || {}).length > 0);
    if (itemsWithPrices.length === 0) {
      setOptimErr('Add prices to at least one item first (use search or the + price button).');
      return;
    }
    setOptimLoad(true);
    setOptimErr(null);
    setOptimRes(null);
    fetch('/api/desk/groceries/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: itemsWithPrices.map(i => ({ name: i.name, qty: Number(i.qty) || 1, prices: i.prices })),
        trip_cost: tripCost,
      }),
    })
      .then(r => r.json())
      .then(data => { setOptimRes(data); setOptimLoad(false); })
      .catch(e => { setOptimErr(e.message); setOptimLoad(false); });
  }

  const allResults = results?.results
    ? Object.values(results.results).flat().filter(r => !r.error)
    : [];

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Groceries — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Grocery Optimizer</span>
        </p>
        <h1 className="title text-uppercase">Groceries</h1>
        <p style={{ opacity: 0.4, fontSize: 13, marginTop: 10 }}>
          Search prices · Build list · Optimize across stores
        </p>
      </HeaderNormal>

      <div className="container" style={{ marginBottom: 80 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>

          {/* LEFT — Search + results */}
          <div>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search item (e.g. butter, Milch 3.8%)…"
                style={{
                  flex: 1, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8, color: '#fff', padding: '10px 14px', fontSize: 14,
                  outline: 'none',
                }}
              />
              <button type="submit" disabled={loading} style={{
                background: TEAL, color: '#000', border: 'none', borderRadius: 8,
                padding: '10px 22px', cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 700, fontSize: 14, opacity: loading ? 0.6 : 1,
              }}>
                {loading ? '…' : 'Search'}
              </button>
            </form>

            {error && (
              <div style={{ color: '#f87171', fontSize: 12, marginBottom: 12 }}>{error}</div>
            )}

            {loading && (
              <div style={{ color: 'var(--font-color,#bbb)', fontSize: 13, opacity: 0.5, textAlign: 'center', padding: 24 }}>
                Querying stores…
              </div>
            )}

            {allResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--font-color,#bbb)', opacity: 0.5, marginBottom: 4 }}>
                  {allResults.length} results for "{results.query}"
                  {results.cached && <span style={{ marginLeft: 8, color: TEAL }}>· cached</span>}
                </div>
                {allResults.map((r, i) => (
                  <SearchResult key={i} result={r} onAdd={addFromSearch} />
                ))}
              </div>
            )}

            {results && allResults.length === 0 && !loading && (
              <div style={{ fontSize: 13, color: 'var(--font-color,#bbb)', opacity: 0.5, padding: '20px 0' }}>
                No results found.
              </div>
            )}
          </div>

          {/* RIGHT — List */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--font-color,#bbb)', opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>
              Shopping list ({list.length})
            </div>

            {/* Manual add */}
            <form onSubmit={addManual} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="Item name"
                style={{ flex: '2 1 140px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', padding: '8px 12px', fontSize: 13, outline: 'none' }} />
              <input type="number" min="0.1" step="0.1" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="Qty"
                style={{ width: 64, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', padding: '8px 10px', fontSize: 13, outline: 'none' }} />
              <input value={addUnit} onChange={e => setAddUnit(e.target.value)} placeholder="Unit"
                style={{ width: 70, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: '#fff', padding: '8px 10px', fontSize: 13, outline: 'none' }} />
              <button type="submit" style={{ background: 'none', border: `1px solid ${TEAL}`, color: TEAL, borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                + Add
              </button>
            </form>

            {listErr && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{listErr}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {list.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--font-color,#bbb)', opacity: 0.4, textAlign: 'center', padding: '24px 0' }}>
                  List is empty — search for items or add manually
                </div>
              )}
              {list.map(item => (
                <ListItem key={item.id} item={item} onDelete={deleteItem} onPriceUpdate={updatePrices} />
              ))}
            </div>

            {/* Optimize controls */}
            {list.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ fontSize: 12, color: 'var(--font-color,#bbb)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Trip cost per extra store €
                  <input type="number" min="0" step="0.5" value={tripCost}
                    onChange={e => setTripCost(parseFloat(e.target.value) || 0)}
                    style={{ width: 60, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#fff', padding: '4px 8px', fontSize: 12, outline: 'none' }} />
                </label>
                <button onClick={optimize} disabled={optimLoad} style={{
                  background: TEAL, color: '#000', border: 'none', borderRadius: 8,
                  padding: '10px 20px', cursor: optimLoad ? 'not-allowed' : 'pointer',
                  fontWeight: 700, fontSize: 13, opacity: optimLoad ? 0.6 : 1, marginLeft: 'auto',
                }}>
                  {optimLoad ? 'Optimizing…' : 'Optimize'}
                </button>
              </div>
            )}
            {optimErr && <div style={{ color: '#f87171', fontSize: 12, marginTop: 8 }}>{optimErr}</div>}
          </div>
        </div>

        {/* Optimization results */}
        {optimRes && (
          <div style={{ marginTop: 32 }}>
            <div style={{ width: 40, height: 3, background: TEAL, borderRadius: 2, marginBottom: 16 }} />
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--font-color,#bbb)', opacity: 0.5, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 }}>
              Optimization result
            </div>
            <OptimizeResult result={optimRes} tripCost={tripCost} />
          </div>
        )}
      </div>

      <Footer className="background-section" />
    </Layout>
  );
}
