const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const queue = await db.all(`
      SELECT 
        q.id,
        q.recipient_email,
        q.status,
        q.sent_at,
        q.error,
        a.email as account_email,
        c.name as campaign_name
      FROM queue q
      LEFT JOIN accounts a ON q.account_id = a.id
      LEFT JOIN campaigns c ON q.campaign_id = c.id
      ORDER BY q.id DESC
      LIMIT 100
    `);
    res.json(queue);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const total = await db.get('SELECT COUNT(*) as count FROM queue');
    const pending = await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'pending'");
    const sent = await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'sent'");
    const failed = await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'failed'");
    const campaigns = await db.get("SELECT COUNT(*) as count FROM campaigns WHERE status = 'running'");
    const accounts = await db.get("SELECT COUNT(*) as count FROM accounts WHERE status = 'active'");
    const todaySent = await db.get(`
      SELECT COUNT(*) as count FROM queue 
      WHERE status = 'sent' 
      AND DATE(sent_at) = CURRENT_DATE
    `);

    res.json({
      total: parseInt(total.count),
      pending: parseInt(pending.count),
      sent: parseInt(sent.count),
      failed: parseInt(failed.count),
      today_sent: parseInt(todaySent.count),
      active_campaigns: parseInt(campaigns.count),
      active_accounts: parseInt(accounts.count)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
