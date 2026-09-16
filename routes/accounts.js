const express = require('express');
const router = express.Router();
const db = require('../db');
const { google } = require('googleapis');
const requirePin = require('./middleware/auth');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

router.get('/auth', (req, res) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: false,
    scope: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });
  res.json({ url });
});

router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send('<h2>Error: No authorization code received</h2>');
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get email using userinfo instead of gmail profile
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!email) {
      return res.status(400).send('<h2>Error: Could not get email address</h2>');
    }

    const existing = await db.get('SELECT id FROM accounts WHERE email = $1', [email]);
    if (existing) {
      await db.run(
        `UPDATE accounts SET access_token = $1, refresh_token = $2, token_expiry = $3, status = 'active' WHERE email = $4`,
        [tokens.access_token, tokens.refresh_token, tokens.expiry_date, email]
      );
    } else {
      await db.run(
        `INSERT INTO accounts (email, access_token, refresh_token, token_expiry) VALUES ($1, $2, $3, $4)`,
        [email, tokens.access_token, tokens.refresh_token, tokens.expiry_date]
      );
    }

    console.log(`Account connected successfully: ${email}`);
    res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h2 style="color:#3B6D11;">Account connected successfully!</h2>
          <p>${email} has been added to MailFlow.</p>
          <p>You can close this tab and go back to your dashboard.</p>
          <script>setTimeout(() => window.close(), 3000);</script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:60px;">
          <h2 style="color:#A32D2D;">Connection failed</h2>
          <p>Error: ${err.message}</p>
          <p>Please close this tab and try again.</p>
        </body>
      </html>
    `);
  }
});

router.use(requirePin);

router.get('/', async (req, res) => {
  try {
    const accounts = await db.all('SELECT id, email, display_name, status, daily_sent, last_reset, created_at FROM accounts ORDER BY created_at DESC');
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/display-name', async (req, res) => {
  try {
    const { display_name } = req.body;
    await db.run('UPDATE accounts SET display_name = $1 WHERE id = $2', [display_name, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/display-name/batch', async (req, res) => {
  try {
    const { account_ids, display_name } = req.body;
    if (!Array.isArray(account_ids) || account_ids.length === 0) {
      return res.status(400).json({ error: 'Select at least one account' });
    }
    if (typeof display_name !== 'string' || !display_name.trim()) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const ids = account_ids.map(Number).filter(Number.isInteger);
    const result = await db.run(
      'UPDATE accounts SET display_name = $1 WHERE id = ANY($2::int[])',
      [display_name.trim(), ids]
    );
    res.json({ success: true, updated: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/pause', async (req, res) => {
  try {
    await db.run("UPDATE accounts SET status = 'paused' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/resume', async (req, res) => {
  try {
    await db.run("UPDATE accounts SET status = 'active' WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.run('DELETE FROM accounts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reset', async (req, res) => {
  try {
    await db.run(
      `UPDATE accounts SET daily_sent = 0, last_reset = to_char(now(), 'YYYY-MM-DD HH24:MI:SS') WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export all accounts to JSON
router.get('/export', async (req, res) => {
  try {
    const accounts = await db.all('SELECT * FROM accounts ORDER BY created_at DESC');
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import accounts from JSON backup
router.post('/import', async (req, res) => {
  try {
    const { accounts } = req.body;
    if (!accounts || !Array.isArray(accounts)) {
      return res.status(400).json({ error: 'Invalid data — expected an array of accounts' });
    }

    let imported = 0;
    for (const account of accounts) {
      try {
        const existing = await db.get('SELECT id FROM accounts WHERE email = $1', [account.email]);
        if (existing) {
          await db.run(`
            UPDATE accounts SET
              display_name = $1,
              access_token = $2,
              refresh_token = $3,
              token_expiry = $4,
              status = $5,
              daily_sent = $6
            WHERE email = $7
          `, [
            account.display_name,
            account.access_token,
            account.refresh_token,
            account.token_expiry,
            account.status || 'active',
            account.daily_sent || 0,
            account.email
          ]);
        } else {
          await db.run(`
            INSERT INTO accounts (email, display_name, access_token, refresh_token, token_expiry, status, daily_sent)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            account.email,
            account.display_name,
            account.access_token,
            account.refresh_token,
            account.token_expiry,
            account.status || 'active',
            account.daily_sent || 0
          ]);
        }
        imported++;
      } catch (e) {
        console.error(`Failed to import account ${account.email}:`, e.message);
      }
    }

    res.json({ success: true, imported });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
