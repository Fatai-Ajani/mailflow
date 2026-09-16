import React, { useState, useEffect } from 'react';
import { getContactLists, addManualContacts, uploadCSV, deleteContactList } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px' },
  cardTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '12px' },
  label: { fontSize: '12px', color: '#666', marginBottom: '5px' },
  input: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', marginBottom: '10px', background: '#fff' },
  textarea: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', marginBottom: '10px', background: '#fff', resize: 'vertical', minHeight: '120px', lineHeight: '1.6' },
  btn: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer' },
  btnPrimary: { width: '100%', padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer', marginTop: '4px' },
  uploadZone: { border: '1.5px dashed #ccc', borderRadius: '12px', padding: '28px 16px', textAlign: 'center', cursor: 'pointer', marginBottom: '12px' },
  uploadTitle: { fontSize: '13px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  uploadSub: { fontSize: '12px', color: '#888', marginBottom: '12px' },
  listCard: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '14px 16px' },
  listRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '0.5px solid #e0e0d8', fontSize: '13px' },
  listName: { flex: 1, color: '#111' },
  listCount: { color: '#888', fontSize: '12px' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px', background: '#eaf3de', color: '#3B6D11' },
  delBtn: { fontSize: '12px', padding: '4px 10px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
};

export default function Contacts() {
  const [lists, setLists] = useState([]);
  const [listName, setListName] = useState('');
  const [emails, setEmails] = useState('');
  const [csvListName, setCsvListName] = useState('');
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    try {
      const res = await getContactLists();
      setLists(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 4000); };
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(null), 4000); };

  const handleManual = async () => {
    if (!listName || !emails) return showErr('Please fill in list name and emails');
    const emailArr = emails.split('\n').map(e => e.trim()).filter(e => e);
    if (emailArr.length === 0) return showErr('No valid emails found');
    try {
      const res = await addManualContacts({ list_name: listName, emails: emailArr });
      showMsg(`Added ${res.data.added} emails to "${listName}"${res.data.duplicates ? ` · ${res.data.duplicates} duplicates skipped` : ''}${res.data.rejected ? ` · ${res.data.rejected} invalid entries skipped` : ''}`);
      setListName(''); setEmails('');
      load();
    } catch (e) { showErr('Error adding contacts'); }
  };

  const handleUpload = async () => {
    if (!csvListName || !file) return showErr('Please enter a list name and select a file');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('list_name', csvListName);
      const res = await uploadCSV(formData);
      showMsg(`Imported ${res.data.added} emails to "${csvListName}"${res.data.duplicates ? ` · ${res.data.duplicates} duplicates skipped` : ''}${res.data.rejected ? ` · ${res.data.rejected} invalid entries skipped` : ''}`);
      setCsvListName(''); setFile(null);
      load();
    } catch (e) { showErr('Error uploading file'); }
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete list "${name}"?`)) return;
    try {
      await deleteContactList(name);
      load();
    } catch (e) { showErr('Error deleting list'); }
  };

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Contacts</div>
          <div style={s.sub}>Upload or paste your email recipient lists</div>
        </div>
      </div>

      {msg && <div style={s.success}>{msg}</div>}
      {err && <div style={s.error}>{err}</div>}

      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitle}>Upload CSV</div>
          <div style={s.label}>List name</div>
          <input style={s.input} placeholder="e.g. Black Friday list" value={csvListName} onChange={e => setCsvListName(e.target.value)} />
          <div style={s.uploadZone} onClick={() => document.getElementById('csvfile').click()}>
            <div style={s.uploadTitle}>{file ? file.name : 'Drop your file here'}</div>
            <div style={s.uploadSub}>CSV file · email column preferred, first column also accepted</div>
            <button style={s.btn}>Browse file</button>
            <input id="csvfile" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
          </div>
          <button style={s.btnPrimary} onClick={handleUpload}>Import CSV</button>
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>Paste emails manually</div>
          <div style={s.label}>List name</div>
          <input style={s.input} placeholder="e.g. Cold leads batch 1" value={listName} onChange={e => setListName(e.target.value)} />
          <div style={s.label}>Emails</div>
          <textarea style={s.textarea} placeholder={'Paste one per line, or separated by commas/spaces\njohn@example.com\nsarah@business.com'} value={emails} onChange={e => setEmails(e.target.value)} />
          <button style={s.btnPrimary} onClick={handleManual}>Import emails</button>
        </div>
      </div>

      <div style={s.listCard}>
        <div style={s.cardTitle}>Saved contact lists ({lists.length})</div>
        {lists.length === 0 && <div style={{ fontSize: '13px', color: '#888', padding: '20px 0' }}>No contact lists yet. Upload or paste emails above.</div>}
        {lists.map(list => (
          <div key={list.list_name} style={s.listRow}>
            <div style={s.listName}>{list.list_name}</div>
            <div style={s.listCount}>{list.count} contacts</div>
            <span style={s.pill}>Ready</span>
            <button style={s.delBtn} onClick={() => handleDelete(list.list_name)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
