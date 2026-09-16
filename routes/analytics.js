const express = require('express');
const router = express.Router();
const db = require('../db');

// Get analytics summary for all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await db.all(`
      SELECT
        c.id,
        c.name,
        c.total_contacts,
        c.sent_count,
        c.failed_count,
        c.status,
        c.created_at,
        COUNT(q.id) FILTER (WHERE q.status = 'pending')::int AS pending_count,
        MAX(q.sent_at) AS last_sent_at
      FROM campaigns c
      LEFT JOIN queue q ON q.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    res.json(campaigns.map(campaign => {
      const total = Number(campaign.total_contacts) || 0;
      const sent = Number(campaign.sent_count) || 0;
      const failed = Number(campaign.failed_count) || 0;
      return {
        ...campaign,
        pending_count: Number(campaign.pending_count) || 0,
        delivery_rate: total > 0 ? Math.round((sent / total) * 100) : 0,
        failure_rate: total > 0 ? Math.round((failed / total) * 100) : 0,
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
