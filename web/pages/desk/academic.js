import { useState, useCallback, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import s from '../../styles/desk.module.css';

// ── helpers ──────────────────────────────────────────────────────────────────

function maxOf(arr, fn) { return arr.length ? Math.max(...arr.map(fn)) : 1; }

// ── Stat box ─────────────────────────────────────────────────────────────────

function Stat({ n, label, color = 'var(--font-color)', sub }) {
  return (
    <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '18px 16px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--heading-font)', fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 10, color: 'var(--font-color)', opacity: 0.35, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 8 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.3, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Horizontal bar chart ──────────────────────────────────────────────────────

function BarChart({ rows, color, label, valueKey = 'count', nameKey = 'name', maxVal }) {
  const max = maxVal || maxOf(rows, r => r[valueKey]) || 1;
  return (
    <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '24px 24px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 16 }}>{label}</div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 140, fontSize: 12, color: 'var(--font-color)', opacity: 0.6, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row[nameKey]}>
            {row[nameKey]}
          </div>
          <div style={{ flex: 1, background: 'var(--bg-color)', borderRadius: 2, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${(row[valueKey] / max) * 100}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--font-color)', opacity: 0.5, width: 28, textAlign: 'right', flexShrink: 0 }}>{row[valueKey]}</div>
        </div>
      ))}
    </div>
  );
}

// ── Papers by year ────────────────────────────────────────────────────────────

function YearChart({ byYear }) {
  const years = Object.keys(byYear).sort();
  if (!years.length) return null;
  const max = Math.max(...Object.values(byYear), 1);
  return (
    <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '24px 24px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 20 }}>Papers per year</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 90 }}>
        {years.map(y => (
          <div key={y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.5 }}>{byYear[y]}</div>
            <div style={{ width: '100%', height: `${(byYear[y] / max) * 70}px`, background: 'var(--theme-color)', borderRadius: '2px 2px 0 0', transition: 'height 0.4s ease' }} />
            <div style={{ fontSize: 10, color: 'var(--font-color)', opacity: 0.3, writingMode: 'vertical-rl', transform: 'rotate(180deg)', marginTop: 2 }}>{y}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Topic pills ───────────────────────────────────────────────────────────────

function TopicPills({ topics }) {
  if (!topics?.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {topics.map((t, i) => (
        <span key={i} style={{
          background: 'var(--bg-color)', border: '1px solid var(--border-color)',
          borderRadius: 20, padding: '4px 12px', fontSize: 12, color: 'var(--font-color)', opacity: 0.6,
        }}>
          {t.name}
          {t.count && <span style={{ opacity: 0.5, marginLeft: 6 }}>×{t.count}</span>}
        </span>
      ))}
    </div>
  );
}

// ── Work row ──────────────────────────────────────────────────────────────────

function WorkRow({ work, rank }) {
  const citColor = work.cited_by > 0 ? '#4ade80' : 'var(--font-color)';
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr 60px 80px',
      gap: 12,
      alignItems: 'start',
      padding: '14px 0',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.25, paddingTop: 2 }}>{rank}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--heading-color)', lineHeight: 1.4, marginBottom: 4 }}>
          {work.doi_url ? (
            <a href={work.doi_url} target="_blank" rel="noreferrer"
              style={{ color: 'var(--heading-color)', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = 'var(--theme-color)'}
              onMouseLeave={e => e.target.style.color = 'var(--heading-color)'}
            >
              {work.title}
            </a>
          ) : work.title}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {work.year && <span style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.35 }}>{work.year}</span>}
          {work.venue && (
            <span style={{ fontSize: 11, color: 'var(--font-color)', opacity: 0.35, fontStyle: 'italic' }}>
              {work.venue}
            </span>
          )}
          {work.is_oa && (
            <span style={{ fontSize: 10, color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 3, padding: '1px 5px' }}>OA</span>
          )}
          {work.type !== 'article' && (
            <span style={{ fontSize: 10, color: 'var(--font-color)', opacity: 0.3, border: '1px solid var(--border-color)', borderRadius: 3, padding: '1px 5px' }}>{work.type}</span>
          )}
        </div>
      </div>
      <div style={{ textAlign: 'center', paddingTop: 2 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: citColor, lineHeight: 1 }}>{work.cited_by}</div>
        <div style={{ fontSize: 9, color: 'var(--font-color)', opacity: 0.3, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>cit.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        {work.doi_url && (
          <a href={work.doi_url} target="_blank" rel="noreferrer" className={s.btn} style={{ fontSize: 10, padding: '3px 8px', textDecoration: 'none', display: 'inline-block' }}>
            DOI
          </a>
        )}
        {work.oa_url && work.oa_url !== work.doi_url && (
          <a href={work.oa_url} target="_blank" rel="noreferrer" className={s.btn} style={{ fontSize: 10, padding: '3px 8px', textDecoration: 'none', display: 'inline-block', color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)' }}>
            PDF
          </a>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AcademicPage() {
  const [data,     setData]     = useState(null);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [refresh,  setRefresh]  = useState(false);
  const [sortBy,   setSortBy]   = useState('cited_by'); // 'cited_by' | 'year'
  const [showAll,  setShowAll]  = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true); setError('');
    try {
      const res  = await fetch(`/api/desk/academic${force ? '?refresh=1' : ''}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => { setRefresh(true); load(true).then(() => setRefresh(false)); };

  const author = data?.author;
  const works  = data?.works || [];

  const sorted = [...works].sort((a, b) => sortBy === 'year' ? (b.year || 0) - (a.year || 0) : b.cited_by - a.cited_by);
  const displayed = showAll ? sorted : sorted.slice(0, 15);

  // top cited for bar chart
  const topCited = [...works].sort((a, b) => b.cited_by - a.cited_by).slice(0, 10).map(w => ({
    name:  w.title.length > 50 ? w.title.slice(0, 50) + '…' : w.title,
    count: w.cited_by,
  }));

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Academic — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Desk · Academic</span>
        </p>
        <h1 className="title text-uppercase">Academic Profile</h1>
        {author && (
          <p style={{ color: 'var(--font-color)', opacity: 0.4, fontSize: 13, marginTop: 12 }}>
            {author.name}
            {author.orcid && (
              <a href={author.orcid} target="_blank" rel="noreferrer"
                style={{ marginLeft: 12, color: 'var(--theme-color)', textDecoration: 'none', fontSize: 12 }}>
                ORCID ↗
              </a>
            )}
            {data?._stale && <span style={{ marginLeft: 12, color: '#fbbf24' }}>⚠ cached data</span>}
          </p>
        )}
      </HeaderNormal>

      {/* Stats row */}
      <section className="container section-margin" data-dsn-title="Stats">
        {loading && !data && (
          <div style={{ color: 'var(--font-color)', opacity: 0.4 }}>Fetching from OpenAlex…</div>
        )}
        {error && !data && (
          <div style={{ color: '#f87171', fontSize: 13 }}>Error: {error}</div>
        )}
        {author && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 40 }}>
              <Stat n={author.works_count} label="Papers"      color="var(--theme-color)" />
              <Stat n={author.cited_by}    label="Citations"   color="#4ade80" />
              <Stat n={author.h_index}     label="h-index"     color="#fbbf24" />
              <Stat n={author.i10_index}   label="i10-index"   color="#60a5fa" />
              <Stat n={works.filter(w => w.is_oa).length} label="Open Access" color="#a78bfa" />
            </div>

            {/* Topic pills */}
            {author.topics?.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--font-color)', opacity: 0.35, marginBottom: 12 }}>Research areas</div>
                <TopicPills topics={author.topics} />
              </div>
            )}

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 40 }}>
              <YearChart byYear={data.byYear || {}} />
              {data.topVenues?.length > 0 && (
                <BarChart rows={data.topVenues} color="#60a5fa" label="Top venues" />
              )}
            </div>

            {/* Top cited chart */}
            {topCited.some(r => r.count > 0) && (
              <div style={{ marginBottom: 40 }}>
                <BarChart rows={topCited} color="var(--theme-color)" label="Most cited papers" />
              </div>
            )}
          </>
        )}
      </section>

      {/* Papers list */}
      {author && (
        <section className="container section-margin" data-dsn-title="Papers">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--font-color)', opacity: 0.35 }}>
              All papers ({works.length})
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button className={`${s.btn} ${sortBy === 'cited_by' ? s.btnPrimary : ''}`}
                onClick={() => setSortBy('cited_by')} style={{ fontSize: 11 }}>
                By citations
              </button>
              <button className={`${s.btn} ${sortBy === 'year' ? s.btnPrimary : ''}`}
                onClick={() => setSortBy('year')} style={{ fontSize: 11 }}>
                By year
              </button>
              <button className={s.btn} onClick={handleRefresh} disabled={refresh} style={{ fontSize: 11, opacity: 0.6 }}>
                {refresh ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--assistant-color)', border: '1px solid var(--border-color)', borderRadius: 10, padding: '8px 24px' }}>
            {displayed.map((w, i) => (
              <WorkRow key={w.id} work={w} rank={i + 1} />
            ))}
          </div>

          {works.length > 15 && !showAll && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button className={s.btn} onClick={() => setShowAll(true)}>
                Show all {works.length} papers
              </button>
            </div>
          )}
          {showAll && works.length > 15 && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button className={s.btn} onClick={() => setShowAll(false)}>Show less</button>
            </div>
          )}

          <div style={{ marginTop: 20, fontSize: 11, color: 'var(--font-color)', opacity: 0.25, textAlign: 'right' }}>
            Data from <a href="https://openalex.org" target="_blank" rel="noreferrer" style={{ color: 'var(--font-color)', opacity: 0.5 }}>OpenAlex</a>
            {data?._ts && ` · cached ${new Date(data._ts).toLocaleString()}`}
          </div>
        </section>
      )}

      <Footer className="background-section" />
    </Layout>
  );
}
