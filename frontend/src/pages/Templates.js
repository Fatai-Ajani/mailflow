import React, { useState, useEffect, useRef } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, importTemplates } from '../api';

const s = {
  title: { fontSize: '20px', fontWeight: '500', color: '#111', marginBottom: '4px' },
  sub: { fontSize: '13px', color: '#888', marginBottom: '20px' },
  topbar: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' },
  btnPrimary: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#111', color: '#fff', cursor: 'pointer' },
  btnSuccess: { padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: 'none', background: '#3B6D11', color: '#fff', cursor: 'pointer' },
  btn: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #ccc', background: '#fff', cursor: 'pointer', marginLeft: '6px' },
  btnDanger: { padding: '6px 12px', fontSize: '12px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer', marginLeft: '6px' },
  card: { background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '12px', padding: '16px', marginBottom: '12px' },
  cardTitle: { fontSize: '14px', fontWeight: '500', color: '#111', marginBottom: '14px' },
  label: { fontSize: '12px', color: '#666', marginBottom: '5px', marginTop: '10px' },
  hint: { fontSize: '11px', color: '#aaa', fontWeight: '400' },
  input: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', outline: 'none' },
  editorWrap: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '0.5px solid #ccc', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' },
  editorHeader: { padding: '7px 12px', background: '#f5f5f0', borderBottom: '0.5px solid #ccc', fontSize: '12px', fontWeight: '500', color: '#666' },
  editorTextarea: { width: '100%', fontSize: '12px', padding: '10px', border: 'none', borderRight: '0.5px solid #ccc', resize: 'none', minHeight: '220px', fontFamily: 'monospace', lineHeight: '1.6', outline: 'none', background: '#fff' },
  plainTextarea: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', resize: 'vertical', minHeight: '80px', lineHeight: '1.6', outline: 'none', fontFamily: 'inherit' },
  templateRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #e0e0d8' },
  templateName: { fontSize: '14px', fontWeight: '500', color: '#111' },
  templateSub: { fontSize: '12px', color: '#888', marginTop: '2px' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  infoBox: { background: '#e6f1fb', border: '0.5px solid #b5d4f4', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#185FA5', marginBottom: '16px' },
  divider: { border: 'none', borderTop: '0.5px solid #e0e0d8', margin: '16px 0' },
  footerBtns: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' },
  emptyBox: { textAlign: 'center', padding: '40px', color: '#888', fontSize: '13px' },
  previewBox: { background: '#f5f5f0', borderRadius: '8px', padding: '14px', fontSize: '13px', lineHeight: '1.7', marginTop: '8px', maxHeight: '200px', overflow: 'auto' },
  importBox: { background: '#f5f5f0', borderRadius: '8px', padding: '14px', marginBottom: '12px' },
  countGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' },
  countBox: { background: '#f0f3ed', borderRadius: '8px', padding: '10px', textAlign: 'center' },
  guideGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '12px' },
  codeBox: { background: '#fafaf8', border: '0.5px solid #e0e0d8', borderRadius: '6px', padding: '10px', fontFamily: 'monospace', fontSize: '11px', lineHeight: '1.6', whiteSpace: 'pre-wrap', overflowX: 'auto' },
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && text[index + 1] === '"' && quoted) { cell += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === ',' && !quoted) { row.push(cell); cell = ''; continue; }
    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell); rows.push(row); row = []; cell = ''; continue;
    }
    cell += character;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  if (rows.length < 2) return [];
  const headers = rows.shift().map(header => header.trim().toLowerCase());
  return rows.filter(row => row.some(value => value.trim())).map(row => headers.reduce((result, header, index) => ({ ...result, [header]: row[index] || '' }), {}));
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .trim();
}

function parseLabeledTemplates(text) {
  const lines = String(text || '').split(/\r?\n/);
  const templates = [];
  let current = null;
  let field = null;

  const finish = () => {
    if (!current) return;
    const body = current.body.trim();
    const hasHtml = /<\/?[a-z][\s\S]*>/i.test(body);
    const subject = current.subject.trim();
    templates.push({
      name: subject || `Imported template ${templates.length + 1}`,
      batch_name: 'General',
      subject,
      body_html: hasHtml ? body : '',
      body_plain: hasHtml ? stripHtml(body) : body,
    });
    current = null;
    field = null;
  };

  lines.forEach(line => {
    const label = line.match(/^\s*(subject|body)\s*:\s*(.*)$/i);
    if (label?.[1].toLowerCase() === 'subject') {
      finish();
      current = { subject: label[2], body: '' };
      field = 'subject';
      return;
    }
    if (label?.[1].toLowerCase() === 'body') {
      if (!current) current = { subject: '', body: '' };
      field = 'body';
      current.body = label[2];
      return;
    }
    if (current && field === 'subject') current.subject += `\n${line}`;
    if (current && field === 'body') current.body += `\n${line}`;
  });
  finish();
  return templates;
}

function templateStatus(template) {
  const subject = Boolean(template.subject?.trim());
  const html = Boolean(template.body_html?.trim());
  const plain = Boolean(template.body_plain?.trim());
  if (!subject && !html && !plain) return 'Missing subject/body';
  if (subject && html && plain) return 'Complete';
  if (subject && !html && !plain) return 'Subject only';
  if (!subject && html && plain) return 'HTML + plain';
  if (html) return subject ? 'Subject + HTML' : 'HTML only';
  return subject ? 'Subject + plain' : 'Plain only';
}

function TemplateEditor({ template, onSave, onCancel, isEditing }) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [bodyHtml, setBodyHtml] = useState(template?.body_html || '');
  const [bodyPlain, setBodyPlain] = useState(template?.body_plain || '');
  const [batchName, setBatchName] = useState(template?.batch_name || 'General');
  const [err, setErr] = useState('');
  const previewRef = useRef(null);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.srcdoc = `<html><body style="font-family:-apple-system,sans-serif;padding:16px;margin:0;font-size:13px;line-height:1.7;color:#111;">${bodyHtml || '<p style="color:#aaa;">HTML preview will appear here...</p>'}</body></html>`;
    }
  }, [bodyHtml]);

  const handleSave = () => {
    if (!name.trim()) return setErr('Template name is required');
    setErr('');
    onSave({ name, batch_name: batchName, subject, body_html: bodyHtml, body_plain: bodyPlain });
  };

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={s.cardTitle}>{isEditing ? 'Edit template' : 'New template'}</div>
        <button style={s.btn} onClick={onCancel}>Back to templates</button>
      </div>

      <div style={s.infoBox}>
        Only the template name is required. Subject, HTML body and plain text are all optional.
      </div>

      {err && <div style={s.error}>{err}</div>}

      <div style={s.infoBox}>
        <strong>How template batches work:</strong> assign each template to one batch, such as “Launch” or “Newsletter”. Campaigns can select multiple batches and rotate through their combined templates randomly or sequentially. A template needs a subject, HTML body, or plain-text body to be usable.
      </div>

      <div style={s.label}>Template name <span style={{ color: '#A32D2D' }}>*</span></div>
      <input style={s.input} placeholder="e.g. Black Friday offer" value={name} onChange={e => setName(e.target.value)} />

      <div style={s.label}>Template batch <span style={s.hint}>(one batch per template)</span></div>
      <input style={s.input} placeholder="e.g. Product launch" value={batchName} onChange={e => setBatchName(e.target.value)} />

      <div style={s.label}>Subject line <span style={s.hint}>(optional)</span></div>
      <input style={s.input} placeholder="Leave empty if not needed" value={subject} onChange={e => setSubject(e.target.value)} />

      <div style={s.label}>HTML body <span style={s.hint}>(optional)</span></div>
      <div style={s.editorWrap}>
        <div>
          <div style={s.editorHeader}>HTML editor</div>
          <textarea
            style={s.editorTextarea}
            placeholder="Paste your HTML here... or leave empty"
            value={bodyHtml}
            onChange={e => setBodyHtml(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div>
          <div style={s.editorHeader}>Live preview</div>
          <iframe
            ref={previewRef}
            style={{ width: '100%', minHeight: '220px', border: 'none' }}
            title="preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      <div style={s.label}>Plain text <span style={s.hint}>(optional)</span></div>
      <textarea
        style={s.plainTextarea}
        placeholder="Plain text version... or leave empty"
        value={bodyPlain}
        onChange={e => setBodyPlain(e.target.value)}
      />

      <div style={s.footerBtns}>
        <button style={s.btn} onClick={onCancel}>Cancel</button>
        <button style={s.btnSuccess} onClick={handleSave}>
          {isEditing ? 'Save changes' : 'Save template'}
        </button>
      </div>
    </div>
  );
}

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [showImport, setShowImport] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const fileInputRef = useRef(null);

  const load = async () => {
    try {
      const res = await getTemplates();
      setTemplates(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setErr(null); setMsg(m); setTimeout(() => setMsg(null), 8000); };
  const showErr = (e) => { setMsg(null); setErr(e); setTimeout(() => setErr(null), 10000); };

  const handleCreate = async (data) => {
    try {
      await createTemplate(data);
      showMsg('Template saved!');
      setShowForm(false);
      load();
    } catch (e) { showErr('Error saving template'); }
  };

  const handleUpdate = async (data) => {
    try {
      await updateTemplate(editingTemplate.id, data);
      showMsg('Template updated!');
      setEditingTemplate(null);
      load();
    } catch (e) { showErr('Error updating template'); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      await deleteTemplate(id);
      showMsg('Template deleted');
      load();
    } catch (e) { showErr('Error deleting template'); }
  };

  const toggleSelected = (id) => {
    setSelectedIds(current => current.includes(id) ? current.filter(selectedId => selectedId !== id) : [...current, id]);
  };

  const toggleAll = () => {
    setSelectedIds(selectedIds.length === templates.length ? [] : templates.map(template => template.id));
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return showErr('Select at least one template first');
    if (!window.confirm(`Delete ${selectedIds.length} selected template(s)? This cannot be undone.`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteTemplate(id)));
      setSelectedIds([]);
      showMsg('Selected templates deleted');
      load();
    } catch (e) { showErr('Error deleting selected templates'); }
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      setErr(null);
      setMsg(`Reading ${file.name}...`);
      const text = await file.text();
      let imported;
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith('.json')) {
        const parsed = JSON.parse(text);
        imported = Array.isArray(parsed) ? parsed : parsed.templates || parsed.data || parsed.items;
      } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.csv')) {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const parsed = JSON.parse(trimmed);
          imported = Array.isArray(parsed) ? parsed : parsed.templates || parsed.data || parsed.items;
        } else if (lowerName.endsWith('.txt') && /^\s*(subject|body)\s*:/im.test(text)) {
          imported = parseLabeledTemplates(text);
        } else {
          imported = parseCsv(text);
        }
      } else {
        imported = parseCsv(text);
      }
      if (!Array.isArray(imported) || imported.length === 0) throw new Error('No templates found');
      setMsg(`Uploading ${imported.length.toLocaleString()} template(s)...`);
      const response = await importTemplates(imported);
      const rejected = response.data.rejected?.length || 0;
      showMsg(`Imported ${response.data.count} template(s)${rejected ? ` · ${rejected} empty row(s) skipped` : ''}.`);
      setShowImport(false);
      await load();
    } catch (error) {
      const serverMessage = error.response?.data?.error;
      showErr(serverMessage || error.message || 'Import failed. Use JSON or CSV with name, subject, body_html, and body_plain columns.');
    } finally {
      setImporting(false);
      if (event.target) event.target.value = '';
    }
  };

  const counts = templates.reduce((result, template) => {
    const status = templateStatus(template);
    return {
      total: result.total + 1,
      complete: result.complete + (status === 'Complete' ? 1 : 0),
      subjectOnly: result.subjectOnly + (status === 'Subject only' ? 1 : 0),
      bodyOnly: result.bodyOnly + (['HTML only', 'Plain only'].includes(status) ? 1 : 0),
      bothFormats: result.bothFormats + (Boolean(template.body_html?.trim()) && Boolean(template.body_plain?.trim()) ? 1 : 0),
    };
  }, { total: 0, complete: 0, subjectOnly: 0, bodyOnly: 0, bothFormats: 0 });

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Templates</div>
          <div style={s.sub}>Create and manage reusable email templates</div>
        </div>
        {!showForm && !editingTemplate && (
          <div>
            <button style={s.btnPrimary} onClick={() => setShowForm(true)}>+ New template</button>
            <button style={s.btn} onClick={() => setShowImport(!showImport)}>{showImport ? 'Hide import guide' : 'Show import guide'}</button>
          </div>
        )}
      </div>

      {msg && <div style={s.success}>{msg}</div>}
      {err && <div style={s.error}>{err}</div>}

      {showImport && (
        <div style={s.importBox}>
          <div style={s.cardTitle}>Import templates</div>

          <div style={{ fontSize: '12px', color: '#718078', lineHeight: '1.7', marginBottom: '12px' }}>
            <strong>What is required:</strong> each template needs a name, and at least one usable content field: subject, HTML body, or plain text body. Empty rows are skipped.
            <br />
            <strong>Best format:</strong> JSON is best because it preserves HTML and plain text exactly. CSV/TXT also works for simple imports.
            <br />
            <strong>Multiple templates:</strong> import a list of template objects or a CSV with one row per template. Each template can belong to a batch such as “Launch”, “Promo”, or “Welcome”.
          </div>

          <div style={s.guideGrid}>
            <div style={{ background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#333', lineHeight: '1.7' }}>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>Example JSON command</div>
              <div style={s.codeBox}>{`[
  {
    "name": "Launch offer",
    "batch_name": "Launch",
    "subject": "Big launch is here",
    "body_html": "<h2>Hi!</h2><p>Welcome...</p>",
    "body_plain": "Hi! Welcome..."
  },
  {
    "name": "Reminder follow-up",
    "batch_name": "Follow-up",
    "subject": "Quick reminder",
    "body_plain": "Just checking in..."
  }
]`}</div>
            </div>

            <div style={{ background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#333', lineHeight: '1.7' }}>
              <div style={{ fontWeight: '600', marginBottom: '6px' }}>Example CSV command</div>
              <div style={s.codeBox}>{`name,batch_name,subject,body_html,body_plain
Welcome email,Welcome,Welcome aboard,"<h2>Hello</h2><p>Thanks for joining.</p>",Thanks for joining.
Promo note,Sales,Limited time offer,,This is a plain text promo note`}</div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '8px', padding: '12px', marginBottom: '12px', fontSize: '12px', color: '#333', lineHeight: '1.7' }}>
            <div style={{ fontWeight: '600', marginBottom: '6px' }}>Example TXT format</div>
            <div style={s.codeBox}>{`subject: Welcome to our community
body:
Hello,

Thanks for joining our community. We are glad to have you with us.

subject: Discover what is new
body:
<h2>Welcome</h2>
<p>Here are the latest updates from our team.</p>
<p><strong>Learn more today.</strong></p>

subject:
body: This template has a body but no subject.`}</div>
            <div style={{ marginTop: '8px', color: '#718078' }}>
              Save the file with a <strong>.txt</strong> extension. Start each template with <strong>subject:</strong>, then put its content after <strong>body:</strong>. A new <strong>subject:</strong> starts the next template. Body lines can continue across multiple lines. HTML is detected automatically; plain text is preserved as plain text.
            </div>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #e0e0d8', borderRadius: '8px', padding: '12px', marginBottom: '12px', fontSize: '12px', color: '#333', lineHeight: '1.7' }}>
            <div style={{ fontWeight: '600', marginBottom: '6px' }}>Formatting tips</div>
            <ul style={{ margin: '0 0 0 18px', padding: 0 }}>
              <li>For JSON or CSV, use <strong>name</strong>, <strong>batch_name</strong>, <strong>subject</strong>, <strong>body_html</strong>, and <strong>body_plain</strong>.</li>
              <li>Each row/object is one template. Every template needs a name plus a subject, HTML body, or plain-text body.</li>
              <li>Keep HTML inside one quoted CSV cell. JSON is best when the body contains commas, quotes, or multiple paragraphs.</li>
              <li>For TXT, repeat <strong>subject:</strong> and <strong>body:</strong> for each template. The subject may be empty, and the body may be plain text or HTML.</li>
              <li>One template belongs to one batch. Campaigns can combine batches and rotate randomly or sequentially.</li>
            </ul>
          </div>

          <input ref={fileInputRef} type="file" accept=".json,.csv,.txt,application/json,text/csv,text/plain" onChange={handleImportFile} style={{ display: 'none' }} />
          <button style={s.btnPrimary} onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing...' : 'Choose JSON, CSV or TXT'}
          </button>
          <button style={s.btn} onClick={() => setShowImport(false)}>Hide guide</button>
        </div>
      )}

      {showForm && (
        <TemplateEditor
          onSave={handleCreate}
          onCancel={() => { setShowForm(false); setShowImport(true); }}
          isEditing={false}
        />
      )}

      {editingTemplate && (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleUpdate}
          onCancel={() => { setEditingTemplate(null); setShowImport(true); }}
          isEditing={true}
        />
      )}

      <div style={s.card}>
        <div style={s.cardTitle}>Template overview</div>
        <div style={s.countGrid}>
          <div style={s.countBox}><strong>{counts.total}</strong><div style={s.hint}>Total</div></div>
          <div style={s.countBox}><strong>{counts.complete}</strong><div style={s.hint}>Complete</div></div>
          <div style={s.countBox}><strong>{counts.subjectOnly}</strong><div style={s.hint}>Subject only</div></div>
          <div style={s.countBox}><strong>{counts.bodyOnly}</strong><div style={s.hint}>Body only</div></div>
          <div style={s.countBox}><strong>{counts.bothFormats}</strong><div style={s.hint}>HTML + plain</div></div>
        </div>
        <div style={s.cardTitle}>Saved templates ({templates.length})</div>
        {templates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <button style={s.btn} onClick={toggleAll}>
              {selectedIds.length === templates.length ? 'Clear selection' : 'Select all'}
            </button>
            <button style={s.btnDanger} onClick={handleDeleteSelected} disabled={!selectedIds.length}>
              Delete selected{selectedIds.length ? ` (${selectedIds.length})` : ''}
            </button>
          </div>
        )}
        {templates.length === 0 && (
          <div style={s.emptyBox}>No templates yet. Create one above.</div>
        )}
        {templates.map(t => (
          <div key={t.id}>
            <div style={s.templateRow}>
              <input
                type="checkbox"
                checked={selectedIds.includes(t.id)}
                onChange={() => toggleSelected(t.id)}
                aria-label={`Select ${t.name}`}
              />
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}>
                <div style={s.templateName}>{t.name}</div>
                <div style={s.templateSub}>
                  {t.batch_name || 'General'} · {templateStatus(t)}
                  {' · '}
                  {t.body_html ? 'Has HTML' : t.body_plain ? 'Plain text only' : 'No body'}
                  {' · '}
                  {new Date(t.created_at).toLocaleDateString()}
                </div>
              </div>
              <button style={s.btn} onClick={() => { setEditingTemplate(t); setShowForm(false); }}>Edit</button>
              <button style={s.btnDanger} onClick={() => handleDelete(t.id, t.name)}>Delete</button>
            </div>
            {expandedId === t.id && t.body_html && (
              <div style={s.previewBox} dangerouslySetInnerHTML={{ __html: t.body_html }} />
            )}
            {expandedId === t.id && !t.body_html && t.body_plain && (
              <div style={s.previewBox}>{t.body_plain}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
