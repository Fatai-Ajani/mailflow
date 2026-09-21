const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
});
(async () => {
  try {
    await client.connect();
    await client.query("CREATE TABLE IF NOT EXISTS contact_lists (id SERIAL PRIMARY KEY, list_name TEXT NOT NULL UNIQUE, created_at TEXT DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))");
    await client.query("INSERT INTO contact_lists (list_name) VALUES ('Contact_1'), ('Contact_2'), ('Contact_3') ON CONFLICT (list_name) DO NOTHING");
    const rows = (await client.query("SELECT list_name, COALESCE((SELECT COUNT(*) FROM contacts WHERE contacts.list_name = contact_lists.list_name), 0)::int AS count FROM contact_lists ORDER BY list_name")).rows;
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
