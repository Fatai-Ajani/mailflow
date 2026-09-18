const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined
});

const INITIALIZATION_RETRY_MS = 5000;
const INITIALIZATION_MAX_RETRIES = 30;

async function initDB(attempt = 1) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Set the Railway PostgreSQL connection string before starting the app.');
    return;
  }

  let client;
  try {
    client = await pool.connect();
    await client.query(`
      DROP TABLE IF EXISTS followup_queue, followups, exclusions CASCADE;

      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        display_name TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry BIGINT,
        daily_sent INTEGER DEFAULT 0,
        last_reset TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        list_name TEXT NOT NULL,
        email TEXT NOT NULL,
        created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      );

      UPDATE contacts SET email = lower(trim(email));
      DELETE FROM contacts older
      USING contacts newer
      WHERE older.ctid < newer.ctid
        AND lower(older.email) = lower(newer.email)
        AND older.list_name = newer.list_name;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_list_email ON contacts (list_name, email);

      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_html TEXT,
        body_plain TEXT,
        contact_list TEXT NOT NULL,
        delay_seconds INTEGER DEFAULT 30,
        start_time TEXT DEFAULT '00:00',
        end_time TEXT DEFAULT '23:59',
        schedule_type TEXT DEFAULT 'immediate',
        content_variations TEXT,
        content_mode TEXT DEFAULT 'random',
        status TEXT DEFAULT 'draft',
        total_contacts INTEGER DEFAULT 0,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      );

      ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS template_batch TEXT;

      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body_html TEXT,
        body_plain TEXT,
        created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      );

      ALTER TABLE templates ADD COLUMN IF NOT EXISTS batch_name TEXT DEFAULT 'General';

      CREATE TABLE IF NOT EXISTS queue (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        recipient_email TEXT NOT NULL,
        account_id INTEGER,
        status TEXT DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        last_error TEXT,
        scheduled_at TEXT,
        sent_at TEXT,
        error TEXT
      );

      ALTER TABLE queue DROP COLUMN IF EXISTS message_id;
      ALTER TABLE queue DROP COLUMN IF EXISTS thread_id;

      CREATE INDEX IF NOT EXISTS idx_queue_campaign_status ON queue (campaign_id, status);
    `);
    console.log('Database initialized successfully');
  } catch (error) {
    if (attempt <= INITIALIZATION_MAX_RETRIES) {
      console.warn(`Database unavailable (${attempt}/${INITIALIZATION_MAX_RETRIES}): ${error.message}. Retrying in ${INITIALIZATION_RETRY_MS / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, INITIALIZATION_RETRY_MS));
      return initDB(attempt + 1);
    }

    console.error('Database is still unavailable after retries. The app will keep running, but API/database features will not work until PostgreSQL is reachable.');
    console.error(error.message);
    return;
  } finally {
    if (client) client.release();
  }
}

const initialization = initDB();

const db = {
  query: async (text, params) => {
    await initialization;
    return pool.query(text, params);
  },

  async get(text, params) {
    await initialization;
    const res = await pool.query(text, params);
    return res.rows[0] || null;
  },

  async all(text, params) {
    await initialization;
    const res = await pool.query(text, params);
    return res.rows;
  },

  async run(text, params) {
    await initialization;
    const res = await pool.query(text, params);
    return res;
  },

  prepare(text) {
    return {
      get: async (...params) => {
        await initialization;
        const flatParams = params.flat();
        const res = await pool.query(text, flatParams);
        return res.rows[0] || null;
      },
      all: async (...params) => {
        await initialization;
        const flatParams = params.flat();
        const res = await pool.query(text, flatParams);
        return res.rows;
      },
      run: async (...params) => {
        await initialization;
        const flatParams = params.flat();
        const res = await pool.query(text, flatParams);
        return res;
      }
    };
  }
};

module.exports = db;
