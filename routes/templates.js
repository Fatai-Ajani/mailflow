const express = require('express');
const router = express.Router();
const db = require('../db');

const normalizeBatchName = (value) => {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.toLowerCase() === 'general') return '';
  return normalized;
};
const cleanupLegacyGeneralTemplates = async () => {
  await db.run(`DELETE FROM templates WHERE batch_name IS NULL OR lower(trim(COALESCE(batch_name, ''))) IN ('', 'general')`);
};

const deleteTemplatesByIds = async (ids) => {
  const uniqueIds = [...new Set(ids.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  if (!uniqueIds.length) return { deleted: 0 };

  const result = await db.run('DELETE FROM templates WHERE id = ANY($1::int[])', [uniqueIds]);

  return { deleted: result.rowCount ?? uniqueIds.length };
};

const deleteAllTemplates = async () => {
  await db.run('DELETE FROM templates');
  return { deleted: true };
};

const deleteTemplatesByBatchName = async (batchName) => {
  const normalizedBatchName = normalizeBatchName(batchName);
  if (!normalizedBatchName) return { deleted: 0 };

  const result = await db.run(
    'DELETE FROM templates WHERE lower(trim(batch_name)) = lower(trim($1))',
    [normalizedBatchName]
  );

  return { deleted: result.rowCount ?? 0 };
};

router.get('/', async (req, res) => {
  try {
    await cleanupLegacyGeneralTemplates();
    const templates = await db.all(`
      SELECT * FROM templates
      WHERE lower(trim(COALESCE(batch_name, ''))) <> 'general'
      ORDER BY created_at DESC
    `);
    res.json(templates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const templates = Array.isArray(req.body.templates) ? req.body.templates : [];
    const batchName = normalizeBatchName(req.body.batch_name || req.body.batch || '');

    if (!batchName) {
      return res.status(400).json({ error: 'Please enter a batch name before importing the file.' });
    }
    if (templates.length === 0) {
      return res.status(400).json({ error: 'No templates found in the import file' });
    }

    await cleanupLegacyGeneralTemplates();

    res.set('Cache-Control', 'no-store');
    let count = 0;
    const rejected = [];

    for (let index = 0; index < templates.length; index += 1) {
      const template = templates[index] || {};
      const name = String(template.name || template.template_name || template.title || `Imported template ${index + 1}`).trim();
      const subject = String(template.subject || template.email_subject || '').trim();
      const bodyHtml = String(template.body_html || template.html || template.body || '').trim();
      const bodyPlain = String(template.body_plain || template.plain_text || '').trim();

      if (!subject && !bodyHtml && !bodyPlain) {
        rejected.push(index + 1);
        continue;
      }

      await db.run(`
        INSERT INTO templates (name, batch_name, subject, body_html, body_plain)
        VALUES ($1, $2, $3, $4, $5)
      `, [name || `Imported template ${index + 1}`, batchName, subject, bodyHtml, bodyPlain]);
      count += 1;
    }

    res.json({ success: true, count, rejected });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/bulk-delete', async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ error: 'No templates selected' });

    const result = await deleteTemplatesByIds(ids);
    res.json({ success: true, deleted: result.deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/bulk-delete', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : (Array.isArray(req.query?.ids) ? req.query.ids : []);
    if (!ids.length) return res.status(400).json({ error: 'No templates selected' });

    const result = await deleteTemplatesByIds(ids);
    res.json({ success: true, deleted: result.deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/delete-bulk', async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ error: 'No templates selected' });

    const result = await deleteTemplatesByIds(ids);
    res.json({ success: true, deleted: result.deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete-bulk', async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : (Array.isArray(req.query?.ids) ? req.query.ids : []);
    if (!ids.length) return res.status(400).json({ error: 'No templates selected' });

    const result = await deleteTemplatesByIds(ids);
    res.json({ success: true, deleted: result.deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/batch-delete', async (req, res) => {
  try {
    const batchName = req.body?.batch_name || req.body?.batch || '';
    if (!normalizeBatchName(batchName)) return res.status(400).json({ error: 'A valid batch name is required' });

    const result = await deleteTemplatesByBatchName(batchName);
    res.json({ success: true, batch_name: normalizeBatchName(batchName), deleted: result.deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/batch-delete/:batchName', async (req, res) => {
  try {
    const batchName = decodeURIComponent(req.params.batchName || '');
    if (!normalizeBatchName(batchName)) return res.status(400).json({ error: 'A valid batch name is required' });

    const result = await deleteTemplatesByBatchName(batchName);
    res.json({ success: true, batch_name: normalizeBatchName(batchName), deleted: result.deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/delete-all', async (req, res) => {
  try {
    const result = await deleteAllTemplates();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/delete-all', async (req, res) => {
  try {
    const result = await deleteAllTemplates();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id || ''))) {
      return res.status(404).json({ error: 'Template not found' });
    }
    const template = await db.get('SELECT * FROM templates WHERE id = $1', [req.params.id]);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, batch_name, subject, body_html, body_plain } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    const batchName = normalizeBatchName(batch_name);
    if (!batchName) {
      return res.status(400).json({ error: 'Template batch is required' });
    }
    const result = await db.run(`
      INSERT INTO templates (name, batch_name, subject, body_html, body_plain)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [name.trim(), batchName, subject || '', body_html || '', body_plain || '']);
    res.json({ id: result.rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, batch_name, subject, body_html, body_plain } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Template name is required' });
    }
    const batchName = normalizeBatchName(batch_name);
    if (!batchName) {
      return res.status(400).json({ error: 'Template batch is required' });
    }
    await db.run(`
      UPDATE templates SET name = $1, batch_name = $2, subject = $3, body_html = $4, body_plain = $5 WHERE id = $6
    `, [name.trim(), batchName, subject || '', body_html || '', body_plain || '', req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(String(req.params.id || ''))) {
      return res.status(404).json({ error: 'Template not found' });
    }
    await db.run('DELETE FROM templates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
