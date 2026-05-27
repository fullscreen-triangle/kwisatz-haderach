import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Layout from '../../layout/Layout';
import HeaderNormal from '../../components/header/HeaderNormal';
import Footer from '../../components/footer/Footer';
import DashboardErrorBoundary from '../../components/desk/ErrorBoundary';

// dc.js touches the DOM at chart construction time — must be client-only
const DeskDashboard = dynamic(
  () => import('../../components/desk/DeskDashboard'),
  { ssr: false, loading: () => <div style={{ color: 'var(--font-color)', opacity: 0.4, padding: '40px 0' }}>Building charts…</div> }
);

export default function ReposPage() {
  const [data,    setData]    = useState(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/desk/repos')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  return (
    <Layout activeScrollbar={false}>
      <Head>
        <title>Repos — Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <HeaderNormal>
        <p className="subtitle p-relative line-shape line-shape-after mb-30">
          <span className="pl-10 pr-10 background-section">Desk · Repos</span>
        </p>
        <h1 className="title text-uppercase">Repository Observatory</h1>
        {data && (
          <p style={{ color: 'var(--font-color)', opacity: 0.4, fontSize: 13, marginTop: 12 }}>
            {data.length} repos · crossfilter + dc.js · brush any chart to link-filter all others
          </p>
        )}
      </HeaderNormal>

      <section className="section-margin" style={{ overflowX: 'auto' }} data-dsn-title="Repos">
        {loading && (
          <div className="container" style={{ color: 'var(--font-color)', opacity: 0.4 }}>Loading index…</div>
        )}
        {error && (
          <div className="container" style={{ color: '#f87171', fontSize: 13 }}>Error: {error}</div>
        )}
        {data && (
          <DashboardErrorBoundary>
            <DeskDashboard data={data} />
          </DashboardErrorBoundary>
        )}
      </section>

      <Footer className="background-section" />
    </Layout>
  );
}
