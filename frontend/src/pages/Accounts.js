import React, { useState, useEffect, useRef } from 'react';
import { getAccounts, getAuthUrl, deleteAccount, resetAccount, pauseAccount, resumeAccount, updateDisplayName, batchUpdateDisplayName, exportAccounts, importAccounts } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  btnPrimary: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer' },
  btnGreen: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#3B6D11', color: '#fff', cursor: 'pointer', marginLeft: '8px' },
  btnBlue: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#185FA5', color: '#fff', cursor: 'pointer', marginLeft: '8px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px', marginBottom: '12px' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '12px' },
  acctRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #e0e0d8', flexWrap: 'wrap' },
  avatar: { width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '500', flexShrink: 0, background: '#e6f1fb', color: '#185FA5' },
  acctInfo: { flex: 1, minWidth: '160px' },
  acctEmail: { fontSize: '13px', color: '#111', fontWeight: '500' },
  acctSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  nameRow: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' },
  nameInput: { fontSize: '12px', padding: '3px 8px', borderRadius: '6px', border: '0.5px solid #ccc', background: '#fff', width: '160px', outline: 'none' },
  saveBtn: { fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px' },
  pillOk: { background: '#eaf3de', color: '#3B6D11' },
  pillWarn: { background: '#faeeda', color: '#854F0B' },
  pillPaused: { background: '#fcebeb', color: '#A32D2D' },
  actionBtn: { fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid #e0e0d8', background: '#fff', cursor: 'pointer', marginLeft: '4px' },
  actionBtnDanger: { fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer', marginLeft: '4px' },
  actionBtnPause: { fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid #fac775', background: '#fff', color: '#854F0B', cursor: 'pointer', marginLeft: '4px' },
  actionBtnResume: { fontSize: '12px', padding: '5px 10px', borderRadius: '6px', border: '0.5px solid #c0dd97', background: '#fff', color: '#3B6D11', cursor: 'pointer', marginLeft: '4px' },
  emptyBox: { textAlign: 'center', padding: '40px', color: '#888', fontSize: '13px' },
  infoBox: { background: '#e6f1fb', border: '0.5px solid #b5d4f4', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#185FA5', marginBottom: '16px', lineHeight: '1.6' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' },
  statCard: { background: '#f5f5f0', borderRadius: '8px', padding: '10px 14px', textAlign: 'center' },
  statNum: { fontSize: '22px', fontWeight: '500', color: '#111' },
  statLabel: { fontSize: '11px', color: '#888', marginTop: '2px' },
  importBox: { background: '#f5f5f0', borderRadius: '8px', padding: '14px', marginBottom: '12px' },
  textarea: { width: '100%', fontSize: '12px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', resize: 'vertical', minHeight: '100px', fontFamily: 'monospace', outline: 'none' },
};

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState({});
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [batchName, setBatchName] = useState('');
  const [savingBatch, setSavingBatch] = useState(false);
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      const res = await getAccounts();
      setAccounts(res.data);
      const names = {};
      res.data.forEach(a => { names[a.id] = a.display_name || ''; });
      setEditingName(names);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(null), 4000); };

  const handleConnect = async () => {
    try {
      setLoading(true);
      const res = await getAuthUrl();
      window.open(res.data.url, '_blank');
      setTimeout(() => { load(); setLoading(false); }, 5000);
    } catch (e) {
      showErr('Error getting auth URL');
      setLoading(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (!window.confirm(`Remove ${email}?`)) return;
    try { await deleteAccount(id); load(); } catch (e) { showErr('Error removing account'); }
  };

  const handleReset = async (id) => {
    try { await resetAccount(id); showMsg('Daily count reset!'); load(); } catch (e) { showErr('Error resetting'); }
  };

  const handlePause = async (id) => {
    try { await pauseAccount(id); showMsg('Account paused.'); load(); } catch (e) { showErr('Error pausing account'); }
  };

  const handleResume = async (id) => {
    try { await resumeAccount(id); showMsg('Account resumed!'); load(); } catch (e) { showErr('Error resuming account'); }
  };

  const handleSaveName = async (id) => {
    try {
      await updateDisplayName(id, editingName[id]);
      showMsg('Display name saved!');
      load();
    } catch (e) { showErr('Error saving name'); }
  };

  const handleBatchName = async () => {
    if (selectedAccounts.length === 0) return showErr('Select at least one account');
    if (!batchName.trim()) return showErr('Enter a sending name');
    try {
      setSavingBatch(true);
      const res = await batchUpdateDisplayName(selectedAccounts, batchName);
      showMsg(`Saved sending name on ${res.data.updated} account(s).`);
      setSelectedAccounts([]);
      setBatchName('');
      load();
    } catch (e) { showErr(e.response?.data?.error || 'Error saving sending names'); }
    finally { setSavingBatch(false); }
  };

  // Export all accounts to JSON file
  const handleExport = async () => {
    try {
      const res = await exportAccounts();
      const data = JSON.stringify(res.data, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mailflow-accounts-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMsg(`Exported ${res.data.length} accounts successfully!`);
    } catch (e) {
      showErr('Error exporting accounts');
    }
  };

  // Import accounts from JSON
  const handleImport = async () => {
    try {
      setImporting(true);
      const parsed = JSON.parse(importData);
      const res = await importAccounts(parsed);
      showMsg(`Successfully imported ${res.data.imported} accounts!`);
      setShowImport(false);
      setImportData('');
      load();
    } catch (e) {
      showErr('Error importing accounts — make sure the JSON is valid');
    } finally {
      setImporting(false);
    }
  };

  // Load JSON file
  const handleFileLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImportData(ev.target.result);
    reader.readAsText(file);
  };

  const getInitials = (email) => {
    const parts = email.split('@')[0].split('.');
    return parts.map(p => p[0]?.toUpperCase()).join('').slice(0, 2);
  };

  const activeCount = accounts.filter(a => a.status === 'active').length;
  const pausedCount = accounts.filter(a => a.status === 'paused').length;
  const totalSentToday = accounts.reduce((sum, a) => sum + (a.daily_sent || 0), 0);

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Gmail accounts</div>
          <div style={s.sub}>Connect and manage your Gmail sending accounts</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button style={s.btnPrimary} onClick={handleConnect} disabled={loading}>
            {loading ? 'Opening...' : '+ Connect account'}
          </button>
          <button style={s.btnGreen} onClick={handleExport}>⬇ Export backup</button>
          <button style={s.btnBlue} onClick={() => setShowImport(!showImport)}>⬆ Import backup</button>
        </div>
      </div>

      {msg && <div style={s.success}>{msg}</div>}
      {err && <div style={s.error}>{err}</div>}

      {showImport && (
        <div style={s.importBox}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '8px' }}>
            Import accounts from backup file
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
            Upload your backup JSON file or paste the contents below
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileLoad}
            style={{ display: 'none' }}
          />
          <button
            style={{ ...s.actionBtn, marginLeft: '0', marginBottom: '10px' }}
            onClick={() => fileInputRef.current.click()}
          >
            Browse JSON file
          </button>
          <textarea
            style={s.textarea}
            placeholder="Or paste your backup JSON here..."
            value={importData}
            onChange={e => setImportData(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button style={s.btnPrimary} onClick={handleImport} disabled={importing || !importData}>
              {importing ? 'Importing...' : 'Import accounts'}
            </button>
            <button style={{ ...s.actionBtn, marginLeft: '0' }} onClick={() => { setShowImport(false); setImportData(''); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={s.statsRow}>
        <div style={s.statCard}>
          <div style={s.statNum}>{accounts.length}</div>
          <div style={s.statLabel}>Total accounts</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{activeCount}</div>
          <div style={s.statLabel}>Active</div>
        </div>
        <div style={s.statCard}>
          <div style={s.statNum}>{totalSentToday}</div>
          <div style={s.statLabel}>Sent today</div>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Batch sending name</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            style={{ ...s.nameInput, width: '240px', padding: '8px 10px' }}
            placeholder="e.g. Fatai from MailFlow"
            value={batchName}
            onChange={e => setBatchName(e.target.value)}
          />
          <button style={s.btnPrimary} onClick={handleBatchName} disabled={savingBatch || selectedAccounts.length === 0}>
            {savingBatch ? 'Saving...' : `Save for ${selectedAccounts.length || 'selected'} account(s)`}
          </button>
        </div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>Select accounts below, then apply one consistent From name in a single save.</div>
      </div>

      <div style={s.infoBox}>
        Click <strong>Export backup</strong> regularly to save your accounts. If you ever lose your database, click <strong>Import backup</strong> and upload the file to restore everything instantly.
      </div>

      <div style={s.card}>
        <div style={s.cardTitle}>Connected accounts ({accounts.length})</div>
        {accounts.length === 0 && (
          <div style={s.emptyBox}>
            No accounts connected yet. Click "+ Connect account" to get started.
          </div>
        )}
        {accounts.map(acct => (
          <div key={acct.id} style={s.acctRow}>
            <input
              type="checkbox"
              checked={selectedAccounts.includes(acct.id)}
              onChange={e => setSelectedAccounts(current => e.target.checked ? [...current, acct.id] : current.filter(id => id !== acct.id))}
              aria-label={`Select ${acct.email}`}
            />
            <div style={{
              ...s.avatar,
              background: acct.status === 'paused' ? '#faeeda' : '#e6f1fb',
              color: acct.status === 'paused' ? '#854F0B' : '#185FA5'
            }}>
              {getInitials(acct.email)}
            </div>
            <div style={s.acctInfo}>
              <div style={s.acctEmail}>{acct.email}</div>
              <div style={s.acctSub}>
                {acct.daily_sent || 0} sent today
                {acct.last_reset ? ` · Reset: ${new Date(acct.last_reset).toLocaleDateString()}` : ''}
              </div>
              <div style={s.nameRow}>
                <input
                  style={s.nameInput}
                  placeholder="Set display name..."
                  value={editingName[acct.id] || ''}
                  onChange={e => setEditingName({ ...editingName, [acct.id]: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName(acct.id)}
                />
                <button style={s.saveBtn} onClick={() => handleSaveName(acct.id)}>Save</button>
              </div>
              {acct.display_name && (
                <div style={{ fontSize: '11px', color: '#3B6D11', marginTop: '2px' }}>
                  Sends as: {acct.display_name} &lt;{acct.email}&gt;
                </div>
              )}
            </div>
            <span style={{
              ...s.pill,
              ...(acct.status === 'active' ? s.pillOk : acct.status === 'paused' ? s.pillPaused : s.pillWarn)
            }}>
              {acct.status}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {acct.status === 'active'
                ? <button style={s.actionBtnPause} onClick={() => handlePause(acct.id)}>Pause</button>
                : <button style={s.actionBtnResume} onClick={() => handleResume(acct.id)}>Resume</button>
              }
              <button style={s.actionBtn} onClick={() => handleReset(acct.id)}>Reset count</button>
              <button style={s.actionBtnDanger} onClick={() => handleDelete(acct.id, acct.email)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
