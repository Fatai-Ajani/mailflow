const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const campaigns = await db.all('SELECT * FROM campaigns ORDER BY created_at DESC');
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const campaign = await db.get('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name, subject, body_html, body_plain,
      contact_list, delay_seconds, start_time, end_time,
      schedule_type, content_variations, content_mode, template_ids
    } = req.body;

    // Only campaign name and contact list are required
    if (!name) return res.status(400).json({ error: 'Campaign name is required' });
    if (!contact_list) return res.status(400).json({ error: 'Contact list is required' });

    let parsedVariations = [];
    try {
      parsedVariations = JSON.parse(content_variations || '[]');
    } catch (e) {
      parsedVariations = [];
    }

    const selectedTemplateIds = Array.isArray(template_ids)
      ? [...new Set(template_ids.map(Number).filter(Number.isInteger))]
      : [];
    if (selectedTemplateIds.length > 0) {
      const selectedTemplates = await db.all(
        'SELECT id, name, subject, body_html, body_plain FROM templates WHERE id = ANY($1::int[]) ORDER BY id',
        [selectedTemplateIds]
      );
      if (selectedTemplates.length !== selectedTemplateIds.length) {
        return res.status(400).json({ error: 'One or more selected templates no longer exist. Refresh Templates and try again.' });
      }

      const incomplete = selectedTemplates.filter(template => !template.subject?.trim() && !(template.body_html?.trim() || template.body_plain?.trim()));
      if (incomplete.length > 0) {
        const examples = incomplete.slice(0, 3).map(template => template.name).join(', ');
        return res.status(400).json({
          error: `${incomplete.length} selected template(s) need a subject or a message body before this campaign can be saved. Examples: ${examples}`
        });
      }

      parsedVariations = selectedTemplates.map(template => ({
        subject: template.subject,
        body_html: template.body_html || '',
        body_plain: template.body_plain || ''
      }));
    }

    const hasContent = Boolean(
      subject?.trim() || body_html?.trim() || body_plain?.trim() ||
      parsedVariations.some(variation => variation && (variation.subject?.trim() || variation.body_html?.trim() || variation.body_plain?.trim()))
    );
    if (!hasContent) return res.status(400).json({ error: 'Add a subject or message body before saving the campaign' });

    const delay = Number(delay_seconds || 30);
    if (!Number.isFinite(delay) || delay < 1) return res.status(400).json({ error: 'Sending delay must be at least 1 second' });
    if (schedule_type === 'window' && (!/^\d{2}:\d{2}$/.test(start_time || '') || !/^\d{2}:\d{2}$/.test(end_time || ''))) {
      return res.status(400).json({ error: 'A valid sending window is required' });
    }

    console.log(`Creating campaign with ${parsedVariations.length} variations`);
    parsedVariations.forEach((v, i) => {
      console.log(`Variation ${i + 1}: ${v.subject || '(no subject)'}`);
    });

    const contacts = await db.get(
      'SELECT COUNT(*) as count FROM contacts WHERE list_name = $1',
      [contact_list]
    );

    const result = await db.run(`
      INSERT INTO campaigns 
        (name, subject, body_html, body_plain, contact_list, delay_seconds, 
         start_time, end_time, total_contacts, schedule_type, content_variations, content_mode)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      name,
      subject || (parsedVariations[0]?.subject || ''),
      body_html || (parsedVariations[0]?.body_html || ''),
      body_plain || (parsedVariations[0]?.body_plain || ''),
      contact_list,
      delay,
      start_time || '00:00',
      end_time || '23:59',
      contacts.count,
      schedule_type || 'immediate',
      JSON.stringify(parsedVariations),
      content_mode || 'random'
    ]);

    res.json({ id: result.rows[0].id, success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/launch', async (req, res) => {
  try {
    const campaign = await db.get('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    try {
      const vars = JSON.parse(campaign.content_variations || '[]');
      console.log(`Launching campaign "${campaign.name}" with ${vars.length} variations:`);
      vars.forEach((v, i) => console.log(`  Variation ${i + 1}: ${v.subject || '(no subject)'}`));
    } catch (e) {}

    const contacts = await db.all(
      'SELECT email FROM contacts WHERE list_name = $1',
      [campaign.contact_list]
    );

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts found in this list' });
    }

    const accounts = await db.all(
      "SELECT id FROM accounts WHERE status = 'active'"
    );

    if (accounts.length === 0) {
      return res.status(400).json({ error: 'No active Gmail accounts connected' });
    }

    const hasContent = campaign.subject?.trim() || campaign.body_html?.trim() || campaign.body_plain?.trim() ||
      (() => { try { return JSON.parse(campaign.content_variations || '[]').some(v => v.subject?.trim() || v.body_html?.trim() || v.body_plain?.trim()); } catch (e) { return false; } })();
    if (!hasContent) return res.status(400).json({ error: 'Campaign has no subject or message body' });
    if (!Number.isFinite(Number(campaign.delay_seconds)) || Number(campaign.delay_seconds) < 1) {
      return res.status(400).json({ error: 'Campaign sending delay is invalid' });
    }

    await db.run(
      "DELETE FROM queue WHERE campaign_id = $1 AND status = 'pending'",
      [campaign.id]
    );

    for (let i = 0; i < contacts.length; i++) {
      const account = accounts[i % accounts.length];
      await db.run(
        "INSERT INTO queue (campaign_id, recipient_email, account_id, status) VALUES ($1, $2, $3, 'pending')",
        [campaign.id, contacts[i].email, account.id]
      );
    }

    await db.run(
      "UPDATE campaigns SET status = 'running', sent_count = 0, failed_count = 0 WHERE id = $1",
      [campaign.id]
    );

    res.json({ success: true, queued: contacts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    await db.run("UPDATE campaigns SET status = 'paused' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/resume', async (req, res) => {
  try {
    await db.run("UPDATE campaigns SET status = 'running' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM queue WHERE campaign_id = $1', [req.params.id]);
    await db.run('DELETE FROM campaigns WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
