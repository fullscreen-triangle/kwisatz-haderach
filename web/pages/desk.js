/**
 * /desk — personal dashboard
 *
 * Standalone page — does not use the portfolio Layout/Header/Footer.
 * Reads data from the tools/ JSON files via Next.js API routes.
 *
 * Navigate to: http://localhost:3000/desk
 */

import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import s from '../styles/desk.module.css';
import DocumentPanel from '../components/desk/DocumentPanel';
import JournalPanel from '../components/desk/JournalPanel';
import JobPanel from '../components/desk/JobPanel';

// ── alert derivation ───────────────────────────────────────────────────────

function deriveAlerts(docs) {
  const alerts = [];
  if (!docs) return alerts;

  for (const doc of Object.values(docs)) {
    if (doc.urgency === 'expired') {
      alerts.push({
        level: 'danger',
        message: `${doc.name} EXPIRED (${doc.expiryDate || 'date unknown'}).`,
        action: doc.typeId === 'PASSPORT'
          ? 'Go to Zimbabwe Embassy Berlin immediately — +49 30 206 2263'
          : 'Go to Ausländerbehörde — request Fiktionsbescheinigung',
      });
    } else if (doc.urgency === 'overdue') {
      alerts.push({
        level: 'danger',
        message: `${doc.name} past renewal deadline.`,
        action: 'Apply for renewal now',
      });
    } else if (doc.urgency === 'urgent') {
      alerts.push({
        level: 'warning',
        message: `${doc.name} renewal due within 30 days.`,
        action: 'Start renewal process',
      });
    } else if (doc.urgency === 'unknown') {
      alerts.push({
        level: 'info',
        message: `${doc.name}: expiry date not set.`,
        action: 'Set expiry date in the Documents panel',
      });
    }
  }
  return alerts;
}

function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className={s.alertBanner}>
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`${s.alert} ${
            alert.level === 'danger' ? s.alertDanger :
            alert.level === 'warning' ? s.alertWarning :
            s.alertInfo
          }`}
        >
          <span>
            {alert.level === 'danger' ? '🚨' :
             alert.level === 'warning' ? '⚠️' : 'ℹ️'}
          </span>
          <span>{alert.message}</span>
          {alert.action && <span style={{ opacity: 0.7 }}>→ {alert.action}</span>}
        </div>
      ))}
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────

export default function Desk() {
  const [docs, setDocs] = useState(null);
  const [journals, setJournals] = useState(null);
  const [jobs, setJobs] = useState(null);

  const fetchDocs     = useCallback(() => fetch('/api/desk/documents').then(r => r.json()).then(setDocs), []);
  const fetchJournals = useCallback(() => fetch('/api/desk/journals').then(r => r.json()).then(setJournals), []);
  const fetchJobs     = useCallback(() => fetch('/api/desk/jobs').then(r => r.json()).then(setJobs), []);

  useEffect(() => {
    fetchDocs();
    fetchJournals();
    fetchJobs();
  }, []);

  const alerts = deriveAlerts(docs);
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <>
      <Head>
        <title>Desk</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={s.desk}>
        <div className={s.topBar}>
          <span className={s.topBarTitle}>Desk</span>
          <span className={s.topBarDate}>{today}</span>
        </div>

        <AlertBanner alerts={alerts} />

        <div className={s.grid}>
          <DocumentPanel docs={docs} onUpdate={fetchDocs} />
          <JournalPanel  entries={journals} onUpdate={fetchJournals} />
          <JobPanel      jobs={jobs}    onUpdate={fetchJobs} />
        </div>
      </div>
    </>
  );
}
