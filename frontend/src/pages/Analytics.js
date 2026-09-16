import React, { useEffect, useState } from 'react';
import { getAnalytics } from '../api';

const s = {
  title: { fontSize: '22px', fontWeight: '600', color: '#17211b', marginBottom: '6px' },
  sub: { fontSize: '13px', color: '#718078', marginBottom: '22px' },
  card: { background: '#fffdf8', border: '1px solid #e1e5dd', borderRadius: '10px', padding: '18px', marginBottom: '14px' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' },
  stat: { background: '#f0f3ed', borderRadius: '8px', padding: '14px' },
  label: { fontSize: '11px', color: '#718078', textTransform: 'uppercase', letterSpacing: '0.08em' },
  number: { fontSize: '25px', fontWeight: '600', color: '#17211b', marginTop: '6px' },
  header: { display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr)', gap: '10px', padding: '9px 0', borderBottom: '1px solid #e1e5dd', color: '#718078', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.07em' },
  row: { display: 'grid', gridTemplateColumns: '2fr repeat(5, 1fr)', gap: '10px', padding: '14px 0', borderBottom: '1px solid #edf0eb', alignItems: 'center', fontSize: '13px', color: '#27352d' },
  pill: { display: 'inline-block', width: 'fit-content', padding: '3px 8px', borderRadius: '999px', background: '#e5efe2', color: '#35613d', fontSize: '11px' },
  empty: { padding: '38px 0', textAlign: 'center', color: '#718078', fontSize: '13px' },
};

export default function Analytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const response = await getAnalytics();
      setCampaigns(response.data);
      setError('');
    } catch (err) {
      setError('Delivery data is unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const totals = campaigns.reduce((result, campaign) => ({
    sent: result.sent + (Number(campaign.sent_count) || 0),
    pending: result.pending + (Number(campaign.pending_count) || 0),
    failed: result.failed + (Number(campaign.failed_count) || 0),
  }), { sent: 0, pending: 0, failed: 0 });

  return (
    <div>
      <div style={s.title}>Delivery analytics</div>
      <div style={s.sub}>Reliable sending outcomes only. MailFlow does not track opens or clicks.</div>

      {error && <div style={{ ...s.card, color: '#8b3f35' }}>{error}</div>}
      {loading ? <div style={s.empty}>Loading delivery data...</div> : (
        <>
          <div style={s.statGrid}>
            <div style={s.stat}><div style={s.label}>Sent</div><div style={s.number}>{totals.sent}</div></div>
            <div style={s.stat}><div style={s.label}>Pending</div><div style={s.number}>{totals.pending}</div></div>
            <div style={s.stat}><div style={s.label}>Failed</div><div style={s.number}>{totals.failed}</div></div>
          </div>

          <div style={s.card}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#17211b', marginBottom: '10px' }}>Campaign delivery</div>
            <div style={s.header}><div>Campaign</div><div>Status</div><div>Sent</div><div>Pending</div><div>Failed</div><div>Delivered</div></div>
            {campaigns.length === 0 && <div style={s.empty}>No campaign delivery data yet.</div>}
            {campaigns.map(campaign => (
              <div key={campaign.id} style={s.row}>
                <div><strong>{campaign.name}</strong><div style={{ color: '#718078', fontSize: '11px', marginTop: '3px' }}>{campaign.total_contacts || 0} recipients</div></div>
                <span style={s.pill}>{campaign.status}</span>
                <div>{campaign.sent_count || 0}</div>
                <div>{campaign.pending_count || 0}</div>
                <div>{campaign.failed_count || 0}</div>
                <div>{campaign.delivery_rate || 0}%</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
