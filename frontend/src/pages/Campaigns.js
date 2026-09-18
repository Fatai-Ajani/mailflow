import React, { useState, useEffect, useRef } from 'react';
import { getCampaigns, createCampaign, launchCampaign, pauseCampaign, resumeCampaign, deleteCampaign, getContactLists, getTemplates } from '../api';

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
  input: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', outline: 'none' },
  select: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  variationCard: { border: '0.5px solid #e0e0d8', borderRadius: '10px', padding: '14px', marginBottom: '12px', background: '#fafaf8' },
  variationHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' },
  editorWrap: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', border: '0.5px solid #ccc', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px' },
  editorHeader: { padding: '7px 12px', background: '#f5f5f0', borderBottom: '0.5px solid #ccc', fontSize: '12px', fontWeight: '500', color: '#666' },
  editorTextarea: { width: '100%', fontSize: '12px', padding: '10px', border: 'none', borderRight: '0.5px solid #ccc', resize: 'none', minHeight: '180px', fontFamily: 'monospace', lineHeight: '1.6', outline: 'none', background: '#fff' },
  plainTextarea: { width: '100%', fontSize: '13px', padding: '8px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff', resize: 'vertical', minHeight: '70px', lineHeight: '1.6', outline: 'none', fontFamily: 'inherit' },
  speedGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '12px', marginTop: '6px' },
  speedOpt: { border: '0.5px solid #ccc', borderRadius: '8px', padding: '8px 6px', cursor: 'pointer', textAlign: 'center' },
  speedOptSel: { border: '1.5px solid #185FA5', background: '#e6f1fb' },
  speedLabel: { fontSize: '12px', fontWeight: '500', color: '#111' },
  speedLabelSel: { fontSize: '12px', fontWeight: '500', color: '#185FA5' },
  speedSub: { fontSize: '10px', color: '#888', marginTop: '2px' },
  scheduleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px', marginTop: '6px' },
  schedOpt: { border: '0.5px solid #ccc', borderRadius: '8px', padding: '10px 12px', cursor: 'pointer' },
  schedOptSel: { border: '1.5px solid #185FA5', background: '#e6f1fb' },
  schedLabel: { fontSize: '13px', fontWeight: '500', color: '#111' },
  schedLabelSel: { fontSize: '13px', fontWeight: '500', color: '#185FA5' },
  schedSub: { fontSize: '11px', color: '#888', marginTop: '2px' },
  campRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '0.5px solid #e0e0d8' },
  campName: { fontSize: '14px', color: '#111', fontWeight: '500' },
  campSub: { fontSize: '12px', color: '#888', marginTop: '3px' },
  progressBar: { height: '4px', background: '#f0f0ea', borderRadius: '2px', marginTop: '6px', overflow: 'hidden', width: '140px' },
  progressFill: { height: '100%', borderRadius: '2px', background: '#185FA5' },
  pill: { fontSize: '10px', fontWeight: '500', padding: '3px 10px', borderRadius: '999px' },
  pillRunning: { background: '#eaf3de', color: '#3B6D11' },
  pillPaused: { background: '#faeeda', color: '#854F0B' },
  pillDraft: { background: '#f0f0ea', color: '#666' },
  pillCompleted: { background: '#e6f1fb', color: '#185FA5' },
  success: { background: '#eaf3de', border: '0.5px solid #c0dd97', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#3B6D11', marginBottom: '12px' },
  error: { background: '#fcebeb', border: '0.5px solid #f7c1c1', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#A32D2D', marginBottom: '12px' },
  infoBox: { background: '#e6f1fb', border: '0.5px solid #b5d4f4', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#185FA5', marginTop: '6px', marginBottom: '8px' },
  divider: { border: 'none', borderTop: '0.5px solid #e0e0d8', margin: '16px 0' },
  footerBtns: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' },
  addVariationBtn: { padding: '7px 14px', fontSize: '12px', borderRadius: '8px', border: '1.5px dashed #ccc', background: '#fff', cursor: 'pointer', width: '100%', color: '#666', marginBottom: '12px' },
  removeBtn: { fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '0.5px solid #f7c1c1', background: '#fff', color: '#A32D2D', cursor: 'pointer' },
  variantBadge: { display: 'inline-block', fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '999px', background: '#e6f1fb', color: '#185FA5', marginRight: '8px' },
  templatePickRow: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' },
  templatePickSelect: { flex: 1, fontSize: '13px', padding: '7px 10px', borderRadius: '8px', border: '0.5px solid #ccc', background: '#fff' },
  templatePickBtn: { padding: '7px 14px', fontSize: '12px', borderRadius: '8px', border: 'none', background: '#534AB7', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' },
  hintText: { fontSize: '11px', color: '#aaa', fontWeight: '400' },
};

const speedOptions = [
  { label: '60s', sub: 'Safest', value: 60 },
  { label: '30s', sub: 'Balanced', value: 30 },
  { label: '10s', sub: 'Fast', value: 10 },
  { label: '5s', sub: 'Faster', value: 5 },
  { label: '1s', sub: 'Fastest', value: 1 },
];

const emptyVariation = () => ({
  id: Date.now() + Math.random(),
  subject: '',
  body_html: '',
  body_plain: '',
});

function VariationEditor({ variation, index, onChange, onRemove, showRemove, templates }) {
  const previewRef = useRef(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.srcdoc = `<html><body style="font-family:-apple-system,sans-serif;padding:16px;margin:0;font-size:13px;line-height:1.7;color:#111;">${variation.body_html || '<p style="color:#aaa;">HTML preview will appear here...</p>'}</body></html>`;
    }
  }, [variation.body_html]);

  const applyTemplate = () => {
    if (!selectedTemplate) return;
    const t = templates.find(t => t.id === parseInt(selectedTemplate));
    if (!t) return;
    onChange({ ...variation, subject: t.subject || '', body_html: t.body_html || '', body_plain: t.body_plain || '' });
    setSelectedTemplate('');
  };

  return (
    <div style={s.variationCard}>
      <div style={s.variationHeader}>
        <div>
          <span style={s.variantBadge}>Variation {index + 1}</span>
          <span style={{ fontSize: '12px', color: '#888' }}>randomly picked per recipient</span>
        </div>
        {showRemove && <button style={s.removeBtn} onClick={onRemove}>Remove</button>}
      </div>

      {templates.length > 0 && (
        <div style={s.templatePickRow}>
          <select style={s.templatePickSelect} value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
            <option value="">Load from saved template...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}{t.subject ? ` — ${t.subject}` : ''}</option>
            ))}
          </select>
          <button style={s.templatePickBtn} onClick={applyTemplate}>Apply</button>
        </div>
      )}

      <div style={s.label}>Subject line <span style={s.hintText}>(optional)</span></div>
      <input
        style={s.input}
        placeholder="Leave empty to send without subject"
        value={variation.subject}
        onChange={e => onChange({ ...variation, subject: e.target.value })}
      />

      <div style={s.label}>HTML body <span style={s.hintText}>(optional)</span></div>
      <div style={s.editorWrap}>
        <div>
          <div style={s.editorHeader}>HTML editor</div>
          <textarea
            style={s.editorTextarea}
            placeholder="Paste your HTML here... or leave empty"
            value={variation.body_html}
            onChange={e => onChange({ ...variation, body_html: e.target.value })}
            spellCheck={false}
          />
        </div>
        <div>
          <div style={s.editorHeader}>Live preview</div>
          <iframe
            ref={previewRef}
            style={{ width: '100%', minHeight: '180px', border: 'none' }}
            title={`preview-${index}`}
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      <div style={s.label}>Plain text <span style={s.hintText}>(optional)</span></div>
      <textarea
        style={s.plainTextarea}
        placeholder="Plain text version... or leave empty"
        value={variation.body_plain}
        onChange={e => onChange({ ...variation, body_plain: e.target.value })}
      />
    </div>
  );
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [variations, setVariations] = useState([emptyVariation()]);
  const [speed, setSpeed] = useState(30);
  const [rotationMode, setRotationMode] = useState('random');
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState([]);
  const [scheduleType, setScheduleType] = useState('immediate');
  const [form, setForm] = useState({
    name: '', contact_list: '',
    start_time: '08:00', end_time: '22:00'
  });

  const load = async () => {
    try {
      const [c, l, t] = await Promise.all([getCampaigns(), getContactLists(), getTemplates()]);
      setCampaigns(c.data);
      setLists(l.data);
      setTemplates(t.data);
      setSelectedBatches(current => current.length ? current : [...new Set(t.data.map(template => template.batch_name || 'General'))]);
      setSelectedTemplateIds(current => current.length ? current : t.data.map(template => template.id));
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(null), 5000); };
  const showErr = (e) => { setErr(e); setTimeout(() => setErr(null), 5000); };

  const addVariation = () => setVariations([...variations, emptyVariation()]);

  const updateVariation = (index, updated) => {
    const newVars = [...variations];
    newVars[index] = updated;
    setVariations(newVars);
  };

  const removeVariation = (index) => {
    setVariations(variations.filter((_, i) => i !== index));
  };

  const validate = () => {
    if (!form.name) return showErr('Please enter a campaign name') || false;
    if (!form.contact_list) return showErr('Please select a contact list') || false;
    if (!Number.isFinite(speed) || speed < 1) return showErr('Custom delay must be at least 1 second') || false;
    return true;
  };

  const buildPayload = () => {
    const compressHtml = (html) => {
      if (!html) return '';
      return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
    };
    const compressedVariations = variations.map(v => ({
      ...v,
      body_html: compressHtml(v.body_html),
    }));
    return {
      name: form.name,
      subject: compressedVariations[0]?.subject || '',
      body_html: compressHtml(compressedVariations[0]?.body_html || ''),
      body_plain: compressedVariations[0]?.body_plain || '',
      contact_list: form.contact_list,
      delay_seconds: speed,
      schedule_type: scheduleType,
      start_time: scheduleType === 'immediate' ? '00:00' : form.start_time,
      end_time: scheduleType === 'immediate' ? '23:59' : form.end_time,
      content_variations: JSON.stringify(compressedVariations),
      content_mode: 'random',
      rotation_mode: rotationMode,
      template_batches: selectedBatches,
      template_ids: selectedTemplateIds,
    };
  };

  const resetForm = () => {
    setShowForm(false);
    setForm({ name: '', contact_list: '', start_time: '08:00', end_time: '22:00' });
    setVariations([emptyVariation()]);
    setSpeed(30);
    setRotationMode('random');
    setSelectedBatches([]);
    setSelectedTemplateIds([]);
    setScheduleType('immediate');
  };

  const handleSaveDraft = async () => {
    if (!validate()) return;
    try {
      await createCampaign(buildPayload());
      showMsg('Campaign saved as draft!');
      resetForm();
      load();
    } catch (e) { showErr('Error saving campaign'); }
  };

  const handleCreateAndLaunch = async () => {
    if (!validate()) return;
    const list = lists.find(item => item.list_name === form.contact_list);
    const accountHint = 'active Gmail accounts will be used';
    if (!window.confirm(`Launch this campaign to ${list?.count || 0} recipients at a ${speed}s delay?\n\n${accountHint}. You can pause it after launch.`)) return;
    try {
      const res = await createCampaign(buildPayload());
      await launchCampaign(res.data.id);
      localStorage.removeItem('mailflow-dashboard');
      showMsg('Campaign launched!');
      resetForm();
      load();
    } catch (e) { showErr(e.response?.data?.error || 'Error launching campaign'); }
  };

  const handleLaunch = async (id) => {
    const campaign = campaigns.find(item => item.id === id);
    if (!window.confirm(`Launch "${campaign?.name || 'this campaign'}" to ${campaign?.total_contacts || 0} recipients?\n\nThe scheduler will begin sending after launch.`)) return;
    try {
      await launchCampaign(id);
      localStorage.removeItem('mailflow-dashboard');
      showMsg('Campaign launched!');
      load();
    } catch (e) { showErr(e.response?.data?.error || 'Error launching'); }
  };

  const handlePause = async (id) => {
    try {
      await pauseCampaign(id);
      localStorage.removeItem('mailflow-dashboard');
      load();
    } catch (e) { showErr('Error pausing'); }
  };

  const handleResume = async (id) => {
    try {
      await resumeCampaign(id);
      localStorage.removeItem('mailflow-dashboard');
      load();
    } catch (e) { showErr('Error resuming'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this campaign?')) return;
    try {
      await deleteCampaign(id);
      localStorage.removeItem('mailflow-dashboard');
      load();
    } catch (e) { showErr('Error deleting'); }
  };

  const getPillStyle = (status) => {
    if (status === 'running') return { ...s.pill, ...s.pillRunning };
    if (status === 'paused') return { ...s.pill, ...s.pillPaused };
    if (status === 'completed') return { ...s.pill, ...s.pillCompleted };
    return { ...s.pill, ...s.pillDraft };
  };

  const getPct = (c) => c.total_contacts > 0 ? Math.round((c.sent_count / c.total_contacts) * 100) : 0;

  const getEstimate = () => {
    const list = lists.find(l => l.list_name === form.contact_list);
    if (!list) return null;
    const totalSeconds = list.count * speed;
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return hours > 0 ? `~${hours}h ${mins}m` : `~${mins} minutes`;
  };

  return (
    <div>
      <div style={s.topbar}>
        <div>
          <div style={s.title}>Campaigns</div>
          <div style={s.sub}>Create and manage your email campaigns</div>
        </div>
        <button style={s.btnPrimary} onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New campaign'}
        </button>
      </div>

      {msg && <div style={s.success}>{msg}</div>}
      {err && <div style={s.error}>{err}</div>}

      {showForm && (
        <div style={s.card}>
          <div style={s.cardTitle}>New campaign</div>

          <div style={s.row2}>
            <div>
              <div style={s.label}>Campaign name <span style={{ color: '#A32D2D' }}>*</span></div>
              <input style={s.input} placeholder="e.g. Black Friday promo" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <div style={s.label}>Contact list <span style={{ color: '#A32D2D' }}>*</span></div>
              <select style={s.select} value={form.contact_list} onChange={e => setForm({ ...form, contact_list: e.target.value })}>
                <option value="">Select a list...</option>
                {lists.map(l => <option key={l.list_name} value={l.list_name}>{l.list_name} ({l.count} contacts)</option>)}
              </select>
            </div>
          </div>

          <div style={s.infoBox}>
            Only campaign name and contact list are required. Subject, HTML and plain text are all optional.
          </div>

          <hr style={s.divider} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={s.cardTitle}>Email content variations</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{variations.length} variation{variations.length > 1 ? 's' : ''}</div>
          </div>

          {variations.map((v, i) => (
            <VariationEditor
              key={v.id}
              variation={v}
              index={i}
              onChange={(updated) => updateVariation(i, updated)}
              onRemove={() => removeVariation(i)}
              showRemove={variations.length > 1}
              templates={templates}
            />
          ))}

          <button style={s.addVariationBtn} onClick={addVariation}>+ Add another variation</button>

          <hr style={s.divider} />

          <div style={s.cardTitle}>Schedule</div>
          <div style={s.scheduleGrid}>
            {[
              { label: 'Send immediately', sub: 'Starts right after launch', value: 'immediate' },
              { label: 'Set time window', sub: 'Only send between certain hours', value: 'window' },
            ].map(opt => (
              <div key={opt.value} style={{ ...s.schedOpt, ...(scheduleType === opt.value ? s.schedOptSel : {}) }} onClick={() => setScheduleType(opt.value)}>
                <div style={scheduleType === opt.value ? s.schedLabelSel : s.schedLabel}>{opt.label}</div>
                <div style={s.schedSub}>{opt.sub}</div>
              </div>
            ))}
          </div>

          {scheduleType === 'window' && (
            <div style={{ ...s.row2, marginBottom: '12px' }}>
              <div>
                <div style={s.label}>Start sending at</div>
                <input style={s.input} type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <div style={s.label}>Stop sending at</div>
                <input style={s.input} type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
          )}

            <div style={s.cardTitle}>Template rotation</div>
            <div style={s.infoBox}>Select all saved templates at once, or choose specific templates and batches. MailFlow rotates the selected templates randomly or sequentially. Gmail accounts are assigned evenly across recipients.</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
              <button
                type="button"
                style={s.btn}
                onClick={() => setSelectedTemplateIds(selectedTemplateIds.length === templates.length ? [] : templates.map(template => template.id))}
                disabled={!templates.length}
              >
                {selectedTemplateIds.length === templates.length ? 'Clear all templates' : 'Select all templates'}
              </button>
              <span style={s.hintText}>{selectedTemplateIds.length} of {templates.length} templates selected</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '6px 14px', maxHeight: '180px', overflowY: 'auto', marginBottom: '12px' }}>
              {templates.map(template => (
                <label key={template.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={selectedTemplateIds.includes(template.id)}
                    onChange={event => setSelectedTemplateIds(current => event.target.checked ? [...current, template.id] : current.filter(id => id !== template.id))}
                  />
                  <span>{template.name}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              {[...new Set(templates.map(template => template.batch_name || 'General'))].map(batch => (
                <label key={batch} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
                  <input type="checkbox" checked={selectedBatches.includes(batch)} onChange={event => setSelectedBatches(current => event.target.checked ? [...current, batch] : current.filter(value => value !== batch))} />
                  {batch}
                </label>
              ))}
              {!templates.length && <span style={s.hintText}>Create templates and assign batches first.</span>}
            </div>
            <div style={{ ...s.row2, marginBottom: '12px' }}>
              <div>
                <div style={s.label}>Rotation mode</div>
                <select style={s.select} value={rotationMode} onChange={event => setRotationMode(event.target.value)}>
                  <option value="random">Random rotation</option>
                  <option value="sequential">Sequential rotation</option>
                </select>
              </div>
            </div>

          <div style={s.label}>Sending interval <span style={s.hintText}>(the scheduler processes continuously during each minute)</span></div>
          <div style={s.speedGrid}>
            {speedOptions.map(opt => (
              <div key={opt.value} style={{ ...s.speedOpt, ...(speed === opt.value ? s.speedOptSel : {}) }} onClick={() => setSpeed(opt.value)}>
                <div style={speed === opt.value ? s.speedLabelSel : s.speedLabel}>{opt.label}</div>
                <div style={s.speedSub}>{opt.sub}</div>
              </div>
            ))}
          </div>

          <div style={s.row2}>
            <div>
              <div style={s.label}>Custom delay (seconds)</div>
              <input style={s.input} type="number" min="1" step="1" value={speed} onChange={e => setSpeed(Number(e.target.value))} />
            </div>
            {getEstimate() && (
              <div style={{ ...s.infoBox, marginTop: '20px' }}>
                Estimated: <strong>{getEstimate()}</strong> for {lists.find(l => l.list_name === form.contact_list)?.count} contacts at {speed}s
              </div>
            )}
          </div>

          <div style={s.footerBtns}>
            <button style={s.btn} onClick={handleSaveDraft}>Save as draft</button>
            <button style={s.btnSuccess} onClick={handleCreateAndLaunch}>Launch campaign</button>
          </div>
        </div>
      )}

      <div style={s.card}>
        <div style={s.cardTitle}>All campaigns ({campaigns.length})</div>
        {campaigns.length === 0 && (
          <div style={{ fontSize: '13px', color: '#888', padding: '20px 0' }}>No campaigns yet. Create one above.</div>
        )}
        {campaigns.map(c => (
          <div key={c.id} style={s.campRow}>
            <div style={{ flex: 1 }}>
              <div style={s.campName}>{c.name}</div>
              <div style={s.campSub}>
                {c.contact_list} · {c.delay_seconds}s delay · {c.sent_count}/{c.total_contacts} sent
                {c.failed_count > 0 && <span style={{ color: '#A32D2D' }}> · {c.failed_count} failed</span>}
                {c.content_variations && (() => {
                  try { return ` · ${JSON.parse(c.content_variations).length} variations`; }
                  catch (e) { return ''; }
                })()}
              </div>
              <div style={s.progressBar}>
                <div style={{ ...s.progressFill, width: `${getPct(c)}%` }} />
              </div>
            </div>
            <span style={getPillStyle(c.status)}>{c.status}</span>
            {c.status === 'draft' && <button style={s.btn} onClick={() => handleLaunch(c.id)}>Launch</button>}
            {c.status === 'running' && <button style={s.btn} onClick={() => handlePause(c.id)}>Pause</button>}
            {c.status === 'paused' && <button style={s.btn} onClick={() => handleResume(c.id)}>Resume</button>}
            <button style={s.btnDanger} onClick={() => handleDelete(c.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
