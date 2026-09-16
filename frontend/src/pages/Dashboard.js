import React, { useState, useEffect, useCallback } from 'react';
import { getDashboard } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' },
  statCard: { background: '#f0f0ea', borderRadius: '8px', padding: '12px 14px' },
  statLabel: { fontSize: '11px', color: '#888', marginBottom: '4px' },
  statNum: { fontSize: '24px', fontWeight: '500', color: '#111' },
  statSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  row: { display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '12px' },
  campItem: { padding: '8px 0', borderBottom: '0.5px solid #e0e0d8' },
  campName: { fontSize: '13px', color: '#111', marginBottom: '4px' },
  campSub: { fontSize: '11px', color: '#888' },
  progressBar: { height: '4px', background: '#f0f0ea', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '2px', background: '#185FA5' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px', background: '#e6f1fb', color: '#185FA5' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  offlineBanner: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '16px' },
  onlineBanner: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '16px' },
};

export default function Dashboard() {
  const [data, setData] = useState({ stats: {}, campaigns: [], queue: [] });
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getDashboard();
      setData(res.data);
      setOffline(false);
      setLoading(false);
    } catch (err) {
      if (!navigator.onLine) {
        setOffline(true);
      } else {
        // Retry once after 3 seconds
        setRetrying(true);
        setTimeout(async () => {
          try {
            const res = await getDashboard();
            setData(res.data);
            setOffline(false);
          } catch (e) {
            setOffline(true);
          }
          setRetrying(false);
          setLoading(false);
        }, 3000);
      }
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);

    window.addEventListener('online', () => { setOffline(false); load(); });
    window.addEventListener('offline', () => setOffline(true));

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', load);
      window.removeEventListener('offline', () => setOffline(true));
    };
  }, [load]);

  const { stats, campaigns } = data;
  const runningCampaigns = (campaigns || []).filter(c => c.status === 'running');

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Dashboard</div>
          <div style={s.sub}>Live overview of all sending activity</div>
        </div>
        <button
          onClick={load}
          style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer' }}
        >
          {retrying ? 'Retrying...' : '↻ Refresh'}
        </button>
      </div>

      {offline && (
        <div style={s.offlineBanner}>
          ⚠️ You appear to be offline or the server is unreachable. Data shown may be outdated.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#888', fontSize: '14px' }}>
          Loading dashboard...
        </div>
      ) : (
        <>
          <div style={s.statsGrid}>
            <div style={s.statCard}>
              <div style={s.statLabel}>Sent today</div>
              <div style={s.statNum}>{stats.today_sent || 0}</div>
              <div style={s.statSub}>across {stats.active_accounts || 0} accounts</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statLabel}>In queue</div>
              <div style={s.statNum}>{stats.pending || 0}</div>
              <div style={s.statSub}>pending emails</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statLabel}>Active campaigns</div>
              <div style={s.statNum}>{stats.active_campaigns || 0}</div>
              <div style={s.statSub}>running now</div>
            </div>
            <div style={s.statCard}>
              <div style={s.statLabel}>Failed</div>
              <div style={s.statNum}>{stats.failed || 0}</div>
              <div style={s.statSub}>total failed sends</div>
            </div>
          </div>

          <div style={s.row}>
            <div style={s.card}>
              <div style={s.cardTitle}>Active campaigns</div>
              {runningCampaigns.length === 0 && (
                <div style={{ fontSize: '13px', color: '#888' }}>No running campaigns</div>
              )}
              {runningCampaigns.map(c => {
                const pct = c.total_contacts > 0 ? Math.round((c.sent_count / c.total_contacts) * 100) : 0;
                return (
                  <div key={c.id} style={s.campItem}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={s.campName}>{c.name}</div>
                      <span style={s.pill}>{pct}%</span>
                    </div>
                    <div style={s.campSub}>{c.total_contacts} contacts · {c.delay_seconds}s delay</div>
                    <div style={s.progressBar}>
                      <div style={{ ...s.progressFill, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </>
      )}
    </div>
  );
}
