const express = require('express');
const router = express.Router();
const db = require('../db');

const normalizeBatchName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

router.get('/', async (req, res) => {
  try {
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

    await db.run(`DELETE FROM templates WHERE lower(trim(COALESCE(batch_name, ''))) = 'general'`);

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

router.get('/:id', async (req, res) => {
  try {
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

router.post('/delete-bulk', async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids)
      ? [...new Set(req.body.ids.map(Number).filter(Number.isInteger))]
      : [];
    if (ids.length === 0) return res.status(400).json({ error: 'No templates selected' });

    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const result = await db.run(`DELETE FROM templates WHERE id IN (${placeholders})`, ids);
    res.json({ success: true, deleted: result.rowCount ?? ids.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM templates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
