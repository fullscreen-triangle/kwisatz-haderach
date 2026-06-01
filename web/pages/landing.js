import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper';
import Layout from '../layout/Layout';
import HeaderNormal from '../components/header/HeaderNormal';
import TitleSection from '../components/heading/TitleSection';
import Footer from '../components/footer/Footer';
import NextPage from '../components/next/NextPage';

const TEAL = '#14bfb5';
const MAPS_KEY = 'AIzaSyDMyAS2jdzj-vdgBIFaIStYOWJtSlghndg';

// ── tiny helpers ─────────────────────────────────────────────────────────────

function Pill({ label, color = TEAL }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 1, padding: '2px 8px',
      borderRadius: 3, background: color + '22', color, textTransform: 'uppercase',
    }}>{label}</span>
  );
}

function SectionWrap({ title, sub, id, children, dark }) {
  return (
    <section
      className={`container section-margin`}
      data-dsn-title={title}
      id={id}
      style={dark ? { background: 'var(--assistant-color,#101010)', borderRadius: 12, padding: '40px 32px' } : {}}
    >
      <TitleSection description={sub} defaultSpace={false} className="mb-section">
        {title}
      </TitleSection>
      <div style={{ marginTop: 40 }}>{children}</div>
    </section>
  );
}

// ── 1. Repos swiper ───────────────────────────────────────────────────────────

const LANG_COLORS = {
  Python:'#3572A5', JavaScript:'#f1e05a', TypeScript:'#2b7489', Rust:'#dea584',
  Go:'#00ADD8', C:'#555555', 'C++':'#f34b7d', HTML:'#e34c26', CSS:'#563d7c',
  default:'#666',
};

function RepoCard({ repo }) {
  const lang  = repo.language || 'Unknown';
  const color = LANG_COLORS[lang] || LANG_COLORS.default;
  const ago   = repo.pushed_at
    ? Math.floor((Date.now() - new Date(repo.pushed_at)) / 86400000)
    : null;

  return (
    <a href={repo.html_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div style={{
        background: 'var(--assistant-color,#101010)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 10,
        padding: '28px 24px',
        height: '100%',
        transition: 'border-color 0.2s, transform 0.2s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.transform = 'translateY(-3px)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'none'; }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ width: 32, height: 3, background: color, borderRadius: 2 }} />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
            {ago != null ? `${ago}d ago` : ''}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--heading-font,Poppins)', fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
          {repo.name}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 16, lineHeight: 1.6, minHeight: 36 }}>
          {(repo.description || '').slice(0, 90) || <em>No description</em>}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          <Pill label={lang} color={color} />
          {repo.stargazers_count > 0 && <span>★ {repo.stargazers_count}</span>}
          {repo.forks_count > 0 && <span>⑂ {repo.forks_count}</span>}
        </div>
      </div>
    </a>
  );
}

function ReposSection() {
  const [repos, setRepos] = useState([]);

  useEffect(() => {
    fetch('/api/desk/repos')
      .then(r => r.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : Object.values(data);
        const sorted = arr
          .filter(r => r.html_url)
          .sort((a, b) => new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0))
          .slice(0, 20);
        setRepos(sorted);
      })
      .catch(() => {});
  }, []);

  if (!repos.length) return (
    <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 40 }}>Loading repos…</div>
  );

  return (
    <Swiper
      modules={[Pagination, Autoplay]}
      pagination={{ clickable: true, dynamicBullets: true }}
      spaceBetween={24}
      slidesPerView={1}
      autoplay={{ delay: 4000, disableOnInteraction: true }}
      breakpoints={{ 576: { slidesPerView: 2 }, 992: { slidesPerView: 3 } }}
      style={{ paddingBottom: 48 }}
    >
      {repos.map(r => (
        <SwiperSlide key={r.id || r.name} style={{ height: 'auto' }}>
          <RepoCard repo={r} />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

// ── 2. GitHub mentions ────────────────────────────────────────────────────────

const EVENT_LABELS = {
  WatchEvent:       { label: 'starred', icon: '★', color: '#fbbf24' },
  ForkEvent:        { label: 'forked',  icon: '⑂', color: '#60a5fa' },
  IssuesEvent:      { label: 'opened issue on', icon: '●', color: '#f87171' },
  PullRequestEvent: { label: 'opened PR on', icon: '↗', color: '#a78bfa' },
};

function MentionsSection() {
  const [mentions, setMentions] = useState(null);

  useEffect(() => {
    fetch('/api/desk/mentions')
      .then(r => r.json())
      .then(d => setMentions(d.mentions || []))
      .catch(() => setMentions([]));
  }, []);

  if (!mentions) return <div style={{ color: 'rgba(255,255,255,0.3)', padding: 20 }}>Loading activity…</div>;
  if (!mentions.length) return <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No recent activity found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {mentions.map((m, i) => {
        const meta  = EVENT_LABELS[m.type] || { label: m.action, icon: '·', color: TEAL };
        const parts = (m.repo || '').split('/');
        const repoName = parts[parts.length - 1] || m.repo;
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', borderRadius: 8,
            background: 'var(--assistant-color,#101010)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {m.avatar && (
              <img src={m.avatar} alt={m.actor} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>{m.actor}</span>
              {' '}
              <span style={{ color: meta.color }}>{meta.icon} {meta.label}</span>
              {' '}
              <a href={m.repoUrl} target="_blank" rel="noreferrer" style={{ color: TEAL, textDecoration: 'none' }}>
                {repoName}
              </a>
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
              {m.date ? new Date(m.date).toLocaleDateString('en-GB') : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. Timeline (jobs + documents + journals) ─────────────────────────────────

const STATUS_META = {
  // jobs
  applied:    { color: '#60a5fa', label: 'Applied' },
  interviewing: { color: '#fbbf24', label: 'Interviewing' },
  offer:      { color: '#34d399', label: 'Offer' },
  rejected:   { color: '#f87171', label: 'Rejected' },
  withdrawn:  { color: '#6b7280', label: 'Withdrawn' },
  // docs
  valid:      { color: '#34d399', label: 'Valid' },
  urgent:     { color: '#fbbf24', label: 'Urgent' },
  expired:    { color: '#ef4444', label: 'Expired' },
  overdue:    { color: '#ef4444', label: 'Overdue' },
  // journals
  pending:    { color: '#a78bfa', label: 'Pending' },
  accepted:   { color: '#34d399', label: 'Accepted' },
  submitted:  { color: '#60a5fa', label: 'Submitted' },
};

function TimelineItem({ date, title, sub, status, category }) {
  const meta = STATUS_META[status] || { color: TEAL, label: status || '—' };
  return (
    <div style={{ display: 'flex', gap: 18, paddingBottom: 24, position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: meta.color, marginTop: 4, flexShrink: 0 }} />
        <div style={{ flex: 1, width: 1, background: 'rgba(255,255,255,0.08)', marginTop: 4 }} />
      </div>
      <div style={{ flex: 1, paddingBottom: 4 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{title}</span>
          <span style={{ fontSize: 10, color: meta.color, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
            {meta.label}
          </span>
          {category && <Pill label={category} color="rgba(255,255,255,0.2)" />}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{sub}</div>}
        {date && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>{date}</div>}
      </div>
    </div>
  );
}

function TimelineSection() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/desk/jobs').then(r => r.json()).catch(() => []),
      fetch('/api/desk/documents').then(r => r.json()).catch(() => ({})),
      fetch('/api/desk/journals').then(r => r.json()).catch(() => []),
    ]).then(([jobs, docs, journals]) => {
      const all = [];

      (Array.isArray(jobs) ? jobs : []).forEach(j => all.push({
        date:     j.appliedDate || j.created || '',
        title:    `${j.role || j.title || 'Role'} @ ${j.company || '?'}`,
        sub:      j.notes || '',
        status:   j.status || 'applied',
        category: 'job',
        sort:     j.appliedDate || j.created || '',
      }));

      Object.values(typeof docs === 'object' && !Array.isArray(docs) ? docs : {}).forEach(d => all.push({
        date:     d.expiryDate || '',
        title:    d.name || d.typeId || 'Document',
        sub:      d.expiryDate ? `Expires ${d.expiryDate}` : '',
        status:   d.urgency || 'valid',
        category: 'document',
        sort:     d.expiryDate || '',
      }));

      (Array.isArray(journals) ? journals : []).forEach(j => all.push({
        date:     j.submittedDate || j.created || '',
        title:    j.title || j.paper || 'Paper',
        sub:      j.journal || '',
        status:   j.status || 'submitted',
        category: 'journal',
        sort:     j.submittedDate || j.created || '',
      }));

      all.sort((a, b) => b.sort.localeCompare(a.sort));
      setItems(all);
    });
  }, []);

  if (!items.length) return <div style={{ color: 'rgba(255,255,255,0.3)', padding: 20 }}>Loading timeline…</div>;

  return (
    <div style={{ maxHeight: 520, overflowY: 'auto', paddingRight: 8 }}>
      {items.map((it, i) => <TimelineItem key={i} {...it} />)}
    </div>
  );
}

// ── 4. Weather ─────────────────────────────────────────────────────────────────

function WeatherSection() {
  const [wx, setWx] = useState(null);

  useEffect(() => {
    fetch('/api/desk/weather').then(r => r.json()).then(setWx).catch(() => {});
  }, []);

  if (!wx) return <div style={{ color: 'rgba(255,255,255,0.3)', padding: 20 }}>Fetching weather…</div>;

  const cur = wx.current || {};
  const fc  = wx.forecast || [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'start' }}>
      {/* Current */}
      <div>
        <div style={{ fontSize: 64, fontWeight: 700, color: cur.color || TEAL, lineHeight: 1 }}>
          {Math.round(cur.temperature ?? cur.temp ?? 0)}°C
        </div>
        <div style={{ fontSize: 18, color: '#fff', fontWeight: 600, marginTop: 8 }}>{cur.label || cur.condition || '—'}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
          {wx.city || 'Munich'} · Feels {Math.round(cur.feels_like ?? cur.feelsLike ?? 0)}°C ·{' '}
          {cur.windspeed ?? cur.wind_speed ?? '?'} km/h · {cur.humidity ?? '?'}% humidity
        </div>
      </div>
      {/* Forecast strip */}
      <div style={{ display: 'flex', gap: 12 }}>
        {fc.slice(0, 5).map((day, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 14px',
            textAlign: 'center', minWidth: 64,
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>{day.day || day.name}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: day.color || TEAL }}>{Math.round(day.max ?? day.maxTemp ?? 0)}°</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{Math.round(day.min ?? day.minTemp ?? 0)}°</div>
            {(day.precipitation ?? day.precip ?? 0) > 20 && (
              <div style={{ fontSize: 9, color: '#60a5fa', marginTop: 4 }}>{Math.round(day.precipitation ?? day.precip)}%</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 5. Grocery quick-prices ───────────────────────────────────────────────────

const STORE_COLORS = { Rewe:'#ef4444', Kaufland:'#f59e0b', Penny:'#e11d48', Amazon:'#f97316' };

function GrocerySection() {
  const [items, setItems]   = useState(null);
  const [loading, setLoad]  = useState(false);
  const fetched = useRef(false);

  function load() {
    if (loading || fetched.current) return;
    setLoad(true);
    fetch('/api/desk/groceries/batch')
      .then(r => r.json())
      .then(d => { setItems(d.items || []); setLoad(false); fetched.current = true; })
      .catch(() => setLoad(false));
  }

  return (
    <div>
      {!items && !loading && (
        <div style={{ textAlign: 'center', paddingBottom: 24 }}>
          <button onClick={load} style={{
            background: TEAL, color: '#000', border: 'none', borderRadius: 8,
            padding: '10px 28px', cursor: 'pointer', fontWeight: 700, fontSize: 14,
          }}>
            Fetch live prices
          </button>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
            Queries Rewe · Kaufland · Penny in real time (cached 6h)
          </p>
        </div>
      )}
      {loading && <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: 24 }}>Querying stores…</div>}
      {items && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {items.map(item => {
            const r = item.result;
            const sc = r ? (STORE_COLORS[r.store] || TEAL) : 'rgba(255,255,255,0.2)';
            return (
              <div key={item.key} style={{
                background: 'var(--assistant-color,#101010)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8, padding: '14px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{item.label}</div>
                  {r?.name && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{r.name.slice(0, 40)}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {r ? (
                    <>
                      <div style={{ fontWeight: 700, color: TEAL, fontSize: 16 }}>€ {Number(r.price).toFixed(2)}</div>
                      <div style={{ fontSize: 10, color: sc, marginTop: 2 }}>{r.store}</div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>—</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <a href="/desk/groceries" style={{ color: TEAL, fontSize: 13, textDecoration: 'none' }}>
          Full optimizer →
        </a>
      </div>
    </div>
  );
}

// ── 6. Health & Anatomy ───────────────────────────────────────────────────────

function HealthSection() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/desk/health')
      .then(r => r.json())
      .then(d => setHealth(d.configured ? d.data : null))
      .catch(() => {});
  }, []);

  const stats = health ? [
    { label: 'Sleep',        value: health.sleep?.duration ? `${(health.sleep.duration / 3600).toFixed(1)}h` : '—', color: '#a78bfa' },
    { label: 'HRV',          value: health.hrv?.lastNight ? `${Math.round(health.hrv.lastNight)} ms` : '—',           color: TEAL },
    { label: 'Steps',        value: health.activity?.steps != null ? health.activity.steps.toLocaleString() : '—',    color: '#34d399' },
    { label: 'Stress',       value: health.activity?.stress != null ? health.activity.stress : '—',                   color: '#fbbf24' },
    { label: 'Body Battery', value: health.activity?.bodyBattery != null ? `${health.activity.bodyBattery}%` : '—',   color: '#60a5fa' },
    { label: 'SpO₂',         value: health.spo2?.value != null ? `${health.spo2.value}%` : '—',                       color: '#f87171' },
  ] : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
      {/* Anatomy iframe */}
      <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: '#fff' }}>
        <iframe
          src="/anatomy-int-ext/index.html"
          style={{ width: '100%', height: 520, border: 'none', display: 'block' }}
          title="Anatomy"
          scrolling="no"
        />
      </div>

      {/* Health stats */}
      <div>
        {health ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              {stats.map(s => (
                <div key={s.label} style={{
                  background: 'var(--assistant-color,#101010)',
                  border: `1px solid ${s.color}33`, borderRadius: 8,
                  padding: '14px 12px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 4, letterSpacing: 1, textTransform: 'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Sleep stages bar */}
            {health.sleep?.stages && (() => {
              const sl = health.sleep.stages;
              const total = (sl.deep || 0) + (sl.light || 0) + (sl.rem || 0) + (sl.awake || 0);
              if (!total) return null;
              const pct = k => Math.round((sl[k] || 0) / total * 100);
              return (
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: 1 }}>SLEEP STAGES</div>
                  <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', height: 12 }}>
                    {[['deep','#4f46e5'],['rem','#7c3aed'],['light','#60a5fa'],['awake','#f59e0b']].map(([k,c]) => (
                      pct(k) > 0 && <div key={k} style={{ width: `${pct(k)}%`, background: c }} title={`${k}: ${pct(k)}%`} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                    {[['Deep','deep','#4f46e5'],['REM','rem','#7c3aed'],['Light','light','#60a5fa'],['Awake','awake','#f59e0b']].map(([name,k,c]) => (
                      <span key={k} style={{ fontSize: 10, color: c }}>■ {name} {pct(k)}%</span>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            Set <code style={{color:TEAL}}>GARMIN_EMAIL</code> and <code style={{color:TEAL}}>GARMIN_PASSWORD</code>{' '}
            in <code>.env.local</code> to see health stats.
            <div style={{marginTop: 12}}>
              <a href="/desk" style={{color: TEAL, fontSize:13}}>← Back to Desk</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 7. Map ─────────────────────────────────────────────────────────────────────

function MapSection() {
  const lat = '48.1351';
  const lng = '11.5820';
  const src = `https://www.google.com/maps/embed/v1/view?key=${MAPS_KEY}&center=${lat},${lng}&zoom=13&maptype=roadmap`;

  return (
    <div>
      <iframe
        src={src}
        width="100%"
        height="480"
        style={{ border: 'none', borderRadius: 10, display: 'block' }}
        allowFullScreen
        loading="lazy"
        title="Munich map"
      />
      <div style={{ marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
        <a href="/desk/travel" style={{ color: TEAL, textDecoration: 'none' }}>Plan a trip →</a>
        {' · '}
        <a href="/desk/groceries" style={{ color: TEAL, textDecoration: 'none' }}>Grocery optimizer →</a>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Fullscreen Triangle</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal className="align-content-center text-center" backgroundColor="background-section">
        <p className="subtitle p-relative line-shape mb-30">
          <span className="pl-10 pr-10 background-main">FULLSCREEN TRIANGLE</span>
        </p>
        <h1 className="title text-uppercase" style={{ letterSpacing: 6 }}>Mission Control</h1>
        <p style={{ opacity: 0.3, fontSize: 12, letterSpacing: 3, marginTop: 16 }}>
          RESEARCHER · ENGINEER · MUNICH
        </p>
      </HeaderNormal>

      {/* ── Repos ── */}
      <SectionWrap title="Repos" sub="Latest pushed repositories">
        <ReposSection />
      </SectionWrap>

      {/* ── Activity / Mentions ── */}
      <section className="section-padding background-section" data-dsn-title="Mentions">
        <div className="container">
          <TitleSection description="GitHub activity" defaultSpace={false} className="mb-section">
            Mentions
          </TitleSection>
          <div style={{ marginTop: 40 }}>
            <MentionsSection />
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <SectionWrap title="Timeline" sub="Applications · Documents · Journals">
        <TimelineSection />
      </SectionWrap>

      {/* ── Weather ── */}
      <section className="section-padding background-section" data-dsn-title="Weather">
        <div className="container">
          <TitleSection description="Munich · Open-Meteo" defaultSpace={false} className="mb-section">
            Weather
          </TitleSection>
          <div style={{ marginTop: 40 }}>
            <WeatherSection />
          </div>
        </div>
      </section>

      {/* ── Grocery prices ── */}
      <SectionWrap title="Groceries" sub="Live prices · Rewe · Kaufland · Penny">
        <GrocerySection />
      </SectionWrap>

      {/* ── Health & Anatomy ── */}
      <section className="section-padding background-section" data-dsn-title="Health">
        <div className="container">
          <TitleSection description="Garmin · Anatomy" defaultSpace={false} className="mb-section">
            Health
          </TitleSection>
          <div style={{ marginTop: 40 }}>
            <HealthSection />
          </div>
        </div>
      </section>

      {/* ── Map ── */}
      <SectionWrap title="Map" sub="Munich · Stores · Trips">
        <MapSection />
      </SectionWrap>

      <NextPage className="section-padding border-top background-section" />
      <Footer className="background-section" />
    </Layout>
  );
}
