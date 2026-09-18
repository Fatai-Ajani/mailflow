const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmails(value) {
  return [...new Set(String(value || '').split(/[\s,;]+/).map(email => email.trim().toLowerCase()).filter(Boolean))];
}

router.get('/lists', async (req, res) => {
  try {
    const lists = await db.all(`
      SELECT list_name, COUNT(*) as count, MAX(created_at) as created_at
      FROM contacts
      GROUP BY list_name
      ORDER BY MAX(created_at) DESC
    `);
    res.json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/lists/:name', async (req, res) => {
  try {
    const contacts = await db.all(
      'SELECT * FROM contacts WHERE list_name = $1 ORDER BY created_at DESC',
      [req.params.name]
    );
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/manual', async (req, res) => {
  try {
    const { list_name, emails } = req.body;
    if (!list_name || !emails || emails.length === 0) {
      return res.status(400).json({ error: 'List name and emails are required' });
    }

    const normalized = normalizeEmails(emails.join('\n'));
    const validEmails = normalized.filter(email => EMAIL_PATTERN.test(email));
    if (validEmails.length === 0) return res.status(400).json({ error: 'No valid email addresses found' });

    const listName = list_name.trim();
    const conflicts = await db.all(
      'SELECT email, list_name FROM contacts WHERE email = ANY($1::text[]) AND list_name <> $2',
      [validEmails, listName]
    );
    const blocked = new Set(conflicts.map(contact => contact.email));
    const allowedEmails = validEmails.filter(email => !blocked.has(email));

    let added = 0;
    for (const email of allowedEmails) {
      const result = await db.run(
        'INSERT INTO contacts (list_name, email) VALUES ($1, $2) ON CONFLICT (list_name, email) DO NOTHING RETURNING id',
        [listName, email]
      );
      if (result.rowCount > 0) added++;
    }

    res.json({ success: true, added, rejected: normalized.length - validEmails.length, duplicates: validEmails.length - added, cross_batch_duplicates: blocked.size, conflicts: conflicts.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { list_name } = req.body;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const emails = [];
    const filePath = req.file.path;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const email = row.email || row.Email || row.EMAIL || Object.values(row)[0];
        if (email && email.trim()) {
          emails.push(email.trim().toLowerCase());
        }
      })
      .on('end', async () => {
        const normalized = normalizeEmails(emails.join('\n'));
        const validEmails = normalized.filter(email => EMAIL_PATTERN.test(email));
        const listName = String(list_name || '').trim();
        const conflicts = await db.all(
          'SELECT email, list_name FROM contacts WHERE email = ANY($1::text[]) AND list_name <> $2',
          [validEmails, listName]
        );
        const blocked = new Set(conflicts.map(contact => contact.email));
        const allowedEmails = validEmails.filter(email => !blocked.has(email));
        let added = 0;
        for (const email of allowedEmails) {
          const result = await db.run(
            'INSERT INTO contacts (list_name, email) VALUES ($1, $2) ON CONFLICT (list_name, email) DO NOTHING RETURNING id',
            [listName, email]
          );
          if (result.rowCount > 0) added++;
        }
        fs.unlinkSync(filePath);
        res.json({ success: true, added, rejected: normalized.length - validEmails.length, duplicates: validEmails.length - added, cross_batch_duplicates: blocked.size, conflicts: conflicts.slice(0, 20) });
      })
      .on('error', (err) => {
        res.status(500).json({ error: err.message });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/lists/:name', async (req, res) => {
  try {
    await db.run('DELETE FROM contacts WHERE list_name = $1', [req.params.name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
