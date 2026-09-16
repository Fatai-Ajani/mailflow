require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const requirePin = require('./routes/middleware/auth');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'mailflow' });
});

// PIN verification endpoint
app.post('/api/verify-pin', (req, res) => {
  const { pin } = req.body;
  const correctPin = process.env.APP_PIN || '1234';
  if (pin === correctPin) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Wrong PIN' });
  }
});

// Routes
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/campaigns', requirePin, require('./routes/campaigns'));
app.use('/api/contacts', requirePin, require('./routes/contacts'));
app.use('/api/queue', requirePin, require('./routes/queue'));
app.use('/api/templates', requirePin, require('./routes/templates'));
app.use('/api/analytics', requirePin, require('./routes/analytics'));

// Single aggregated dashboard endpoint
app.get('/api/dashboard', async (req, res) => {
  try {
    const db = require('./db');

    const stats = {
      total: parseInt((await db.get('SELECT COUNT(*) as count FROM queue')).count),
      pending: parseInt((await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'pending'")).count),
      sent: parseInt((await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'sent'")).count),
      failed: parseInt((await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'failed'")).count),
      today_sent: parseInt((await db.get("SELECT COUNT(*) as count FROM queue WHERE status = 'sent' AND DATE(sent_at) = CURRENT_DATE")).count),
      active_campaigns: parseInt((await db.get("SELECT COUNT(*) as count FROM campaigns WHERE status = 'running'")).count),
      active_accounts: parseInt((await db.get("SELECT COUNT(*) as count FROM accounts WHERE status = 'active'")).count),
    };

    const campaigns = await db.all(`
      SELECT c.*, COUNT(q.id) FILTER (WHERE q.status = 'pending')::int AS pending_count
      FROM campaigns c
      LEFT JOIN queue q ON q.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC LIMIT 10
    `);

    res.json({ stats, campaigns });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start scheduler
require('./scheduler');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MailFlow server running on port ${PORT}`);
});

module.exports = app;

// Exported for local smoke tests and tooling.

