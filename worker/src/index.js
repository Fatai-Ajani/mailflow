const json = (data, status = 200, origin = '*') => new Response(JSON.stringify(data), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'content-type, x-app-pin',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  },
});

const text = (body, status = 200, origin = '*') => new Response(body, {
  status,
  headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': origin },
});

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailExtractPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function originFor(request, env) {
  const origin = request.headers.get('origin');
  return origin && origin === env.APP_ORIGIN ? origin : env.APP_ORIGIN || '*';
}

function chunkArray(items, size = 500) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

function normalizeEmails(value) {
  return [...new Set(String(value || '').match(emailExtractPattern)?.map(email => email.toLowerCase()) || [])];
}

function extractTextEmails(value) {
  const text = String(value || '');
  if (!text.trim()) return [];
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const hasHeader = lines.some(line => /(^|,|\t|\|)email($|,|\t|\|)/i.test(line));
  const entries = hasHeader ? lines.slice(1) : lines;
  const results = [];
  for (const line of entries) {
    if (line.includes('|')) {
      results.push(...line.split('|').map(part => part.trim()).filter(Boolean));
      continue;
    }
    if (line.includes('\t')) {
      results.push(...line.split('\t').map(part => part.trim()).filter(Boolean));
      continue;
    }
    if (line.includes(',')) {
      results.push(...line.split(',').map(part => part.trim()).filter(Boolean));
      continue;
    }
    results.push(line);
  }
  return [...new Set(results.flatMap(value => normalizeEmails(value)).filter(email => emailPattern.test(email)))];
}

function csvEmails(value) {
  const lines = String(value || '').split(/\r?\n/).filter(Boolean);
  const hasHeader = lines[0]?.split(',').some(column => column.trim().toLowerCase() === 'email');
  return lines.slice(hasHeader ? 1 : 0).map(line => line.split(',')[0]).join('\n');
}

function templateStatus(template) {
  const hasSubject = Boolean(String(template.subject || '').trim());
  const hasHtml = Boolean(String(template.body_html || '').trim());
  const hasPlain = Boolean(String(template.body_plain || '').trim());
  if (!hasSubject && !hasHtml && !hasPlain) return 'Missing subject and body';
  if (hasSubject && hasHtml && hasPlain) return 'Complete';
  if (hasSubject && !hasHtml && !hasPlain) return 'Subject only';
  if (!hasSubject && hasHtml && hasPlain) return 'HTML + plain';
  if (hasHtml) return hasSubject ? 'Subject + HTML' : 'HTML only';
  return hasSubject ? 'Subject + plain' : 'Plain only';
}

function normalizeTemplate(value, index) {
  const get = (...keys) => keys.map(key => value?.[key]).find(item => item !== undefined && item !== null) || '';
  return {
    name: String(get('name', 'template_name', 'title') || `Imported template ${index + 1}`).trim(),
    batch_name: String(get('batch_name', 'batch', 'group') || 'General').trim(),
    subject: String(get('subject', 'subject_line')).trim(),
    body_html: String(get('body_html', 'html', 'html_body')).trim(),
    body_plain: String(get('body_plain', 'plain_text', 'text', 'body_text')).trim(),
  };
}

function shuffle(values) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const swapIndex = random[0] % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function timeInZone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timeZone || 'Africa/Lagos',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find(part => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find(part => part.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

function isWithinWindow(startTime, endTime, date = new Date(), timeZone = 'Africa/Lagos') {
  const current = timeInZone(date, timeZone);
  const [startHour, startMinute] = String(startTime || '00:00').split(':').map(Number);
  const [endHour, endMinute] = String(endTime || '23:59').split(':').map(Number);
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  if (startMinutes <= endMinutes) return current >= startMinutes && current <= endMinutes;
  return current >= startMinutes || current <= endMinutes;
}

function localDate(value, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || 'Africa/Lagos' }).format(value);
}

const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function requirePin(request, env) {
  const configured = env.APP_PIN;
  return Boolean(configured && request.headers.get('x-app-pin') === configured);
}

function requireAuth(request, env, origin) {
  return requirePin(request, env) ? null : json({ error: 'Invalid PIN' }, 401, origin);
}

async function bodyJson(request) {
  try { return await request.json(); } catch { return {}; }
}

async function rows(statement) {
  const result = await statement.all();
  return result.results || [];
}

async function one(statement) {
  return (await rows(statement))[0] || null;
}

function routeParts(url) {
  return url.pathname.split('/').filter(Boolean);
}

function base64Url(bytes) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeMime(value) {
  return base64Url(new TextEncoder().encode(value));
}

function htmlFromPlain(value) {
  return `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;color:#333;">${String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>`;
}

function makeEmail(to, fromName, fromEmail, subject, html, plain) {
  const boundary = `mailflow_${crypto.randomUUID()}`;
  const finalHtml = html?.trim() || (plain?.trim() ? htmlFromPlain(plain) : '');
  const headers = [
    `To: ${to}`,
    `From: ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}`,
    `Subject: ${subject?.trim() || '(no subject)'}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];
  const message = [...headers, '', `--${boundary}`, 'Content-Type: text/plain; charset=UTF-8', '', plain || '', '', `--${boundary}`, 'Content-Type: text/html; charset=UTF-8', '', finalHtml, '', `--${boundary}--`].join('\r\n');
  return encodeMime(message);
}

async function googleToken(env, account) {
  if (account.token_expiry && Date.now() < Number(account.token_expiry) - 60000) return account.access_token;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, refresh_token: account.refresh_token, grant_type: 'refresh_token' }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || 'Google token refresh failed');
  await env.DB.prepare('UPDATE accounts SET access_token = ?, token_expiry = ? WHERE id = ?').bind(data.access_token, Date.now() + (data.expires_in * 1000), account.id).run();
  return data.access_token;
}

async function sendCampaignItem(env, item) {
  const token = await googleToken(env, item);
  const content = (() => {
    try {
      const variations = JSON.parse(item.content_variations || '[]');
      const usable = variations.filter(value => value && (value.subject || value.body_html || value.body_plain));
      if (!usable.length) return item;
      return item.rotation_mode === 'sequential'
        ? usable[(Number(item.id) - 1) % usable.length]
        : usable[Math.floor(Math.random() * usable.length)];
    } catch { return item; }
  })();
  const raw = makeEmail(item.recipient_email, item.display_name, item.account_email, content.subject, content.body_html, content.body_plain);
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!response.ok) throw new Error(await response.text());
  await env.DB.batch([
    env.DB.prepare("UPDATE queue SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?").bind(item.id),
    env.DB.prepare('UPDATE campaigns SET sent_count = sent_count + 1 WHERE id = ?').bind(item.campaign_id),
    env.DB.prepare('UPDATE campaigns SET last_sent_at = ? WHERE id = ?').bind(new Date().toISOString(), item.campaign_id),
    env.DB.prepare('UPDATE accounts SET daily_sent = daily_sent + 1 WHERE id = ?').bind(item.account_id),
  ]);
}

async function processCampaignOnce(env, campaign) {
  const delaySeconds = Math.max(1, Number(campaign.delay_seconds) || 1);
  if (campaign.last_sent_at && Date.now() - Date.parse(campaign.last_sent_at) < delaySeconds * 1000) return false;
  if (campaign.schedule_type === 'window' && !isWithinWindow(campaign.start_time, campaign.end_time, new Date(), env.BUSINESS_TIME_ZONE || 'Africa/Lagos')) return false;

  const item = await one(env.DB.prepare(`
      SELECT q.*, c.content_variations, c.rotation_mode, a.email AS account_email, a.display_name, a.access_token, a.refresh_token, a.token_expiry
      FROM queue q JOIN campaigns c ON c.id = q.campaign_id JOIN accounts a ON a.id = q.account_id
      WHERE q.campaign_id = ? AND q.status = 'pending' AND a.status = 'active'
      ORDER BY q.id LIMIT 1
    `).bind(campaign.id));
  if (!item) {
    const pending = await one(env.DB.prepare("SELECT COUNT(*) AS count FROM queue WHERE campaign_id = ? AND status = 'pending'").bind(campaign.id));
    if (!Number(pending?.count)) await env.DB.prepare("UPDATE campaigns SET status = 'completed' WHERE id = ?").bind(campaign.id).run();
    return false;
  }

  try {
    await sendCampaignItem(env, item);
  } catch (error) {
    const retries = Number(item.retry_count || 0) + 1;
    if (retries < 3) {
      const fallbackAccounts = await rows(env.DB.prepare("SELECT id FROM accounts WHERE status = 'active' AND id != ? ORDER BY RANDOM() LIMIT 1").bind(item.account_id));
      const nextAccount = fallbackAccounts[0]?.id || item.account_id;
      await env.DB.prepare("UPDATE queue SET retry_count = ?, last_error = ?, account_id = ? WHERE id = ?").bind(retries, String(error.message), nextAccount, item.id).run();
    } else {
      await env.DB.batch([
        env.DB.prepare("UPDATE queue SET status = 'failed', retry_count = ?, error = ? WHERE id = ?").bind(retries, String(error.message), item.id),
        env.DB.prepare('UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?').bind(item.campaign_id),
      ]);
    }
  }

  return true;
}

async function processCampaigns(env) {
  const deadline = Date.now() + 18000;
  let processed = 0;
  const maxItems = 18;
  while (Date.now() < deadline && processed < maxItems) {
    const campaigns = await rows(env.DB.prepare("SELECT * FROM campaigns WHERE status = 'running'"));
    if (!campaigns.length) return;
    for (const campaign of campaigns) {
      if (Date.now() >= deadline) return;
      await processCampaignOnce(env, campaign);
      processed += 1;
    }
    await wait(250);
  }
}

async function enqueuePendingMessages(env, campaignId) {
  if (!env.SEND_QUEUE) return 0;
  const campaign = await one(env.DB.prepare('SELECT id, delay_seconds FROM campaigns WHERE id = ?').bind(campaignId));
  if (!campaign) return 0;
  const pending = await rows(env.DB.prepare("SELECT id FROM queue WHERE campaign_id = ? AND status = 'pending' AND scheduled_at IS NULL ORDER BY id").bind(campaignId));
  const delaySeconds = Math.max(1, Number(campaign.delay_seconds) || 1);
  let scheduled = 0;
  for (const chunk of chunkArray(pending, 100)) {
    const messages = chunk.map((item, index) => ({
      body: { queueId: item.id },
      delaySeconds: Math.min(86400, (scheduled + index) * delaySeconds),
    }));
    await env.SEND_QUEUE.sendBatch(messages);
    await env.DB.batch(chunk.map(item => env.DB.prepare("UPDATE queue SET scheduled_at = CURRENT_TIMESTAMP WHERE id = ? AND scheduled_at IS NULL").bind(item.id)));
    scheduled += chunk.length;
  }
  return scheduled;
}

async function seedCampaignQueues(env) {
  if (!env.SEND_QUEUE) return;
  const campaigns = await rows(env.DB.prepare("SELECT id FROM campaigns WHERE status = 'running'"));
  for (const campaign of campaigns) await enqueuePendingMessages(env, campaign.id);
}

async function processQueueMessage(message, env) {
  const queueId = Number(message.body?.queueId);
  if (!Number.isInteger(queueId)) return message.ack();
  const item = await one(env.DB.prepare(`
    SELECT q.*, c.content_variations, c.rotation_mode, c.delay_seconds, c.status AS campaign_status,
      a.email AS account_email, a.display_name, a.access_token, a.refresh_token, a.token_expiry
    FROM queue q
    JOIN campaigns c ON c.id = q.campaign_id
    JOIN accounts a ON a.id = q.account_id
    WHERE q.id = ?
  `).bind(queueId));
  if (!item || item.status !== 'pending') return message.ack();
  if (item.campaign_status !== 'running') return message.retry({ delaySeconds: 10 });
  try {
    await sendCampaignItem(env, item);
    message.ack();
    const pending = await one(env.DB.prepare("SELECT COUNT(*) AS count FROM queue WHERE campaign_id = ? AND status = 'pending'").bind(item.campaign_id));
    if (!Number(pending?.count)) await env.DB.prepare("UPDATE campaigns SET status = 'completed' WHERE id = ? AND status = 'running'").bind(item.campaign_id).run();
  } catch (error) {
    const retries = Number(item.retry_count || 0) + 1;
    if (retries < 3) {
      const fallbackAccounts = await rows(env.DB.prepare("SELECT id FROM accounts WHERE status = 'active' AND id != ? ORDER BY RANDOM() LIMIT 1").bind(item.account_id));
      const nextAccount = fallbackAccounts[0]?.id || item.account_id;
      await env.DB.prepare("UPDATE queue SET retry_count = ?, last_error = ?, account_id = ? WHERE id = ?").bind(retries, String(error.message), nextAccount, item.id).run();
      message.retry({ delaySeconds: Math.max(5, Math.min(60, Number(item.delay_seconds) || 5)) });
    } else {
      await env.DB.batch([
        env.DB.prepare("UPDATE queue SET status = 'failed', retry_count = ?, error = ? WHERE id = ?").bind(retries, String(error.message), item.id),
        env.DB.prepare('UPDATE campaigns SET failed_count = failed_count + 1 WHERE id = ?').bind(item.campaign_id),
      ]);
      message.ack();
    }
  }
}

async function resetDailyCounts(env) {
  await env.DB.prepare("UPDATE accounts SET daily_sent = 0, last_reset = CURRENT_TIMESTAMP").run();
}

async function ensureDailyReset(env) {
  const currentDate = localDate(new Date(), env.BUSINESS_TIME_ZONE);
  const accounts = await rows(env.DB.prepare('SELECT last_reset FROM accounts'));
  const stale = accounts.some(account => !account.last_reset || localDate(new Date(`${account.last_reset.replace(' ', 'T')}Z`), env.BUSINESS_TIME_ZONE) !== currentDate);
  if (stale) await resetDailyCounts(env);
}

async function handle(request, env) {
  const url = new URL(request.url);
  const origin = originFor(request, env);
  const parts = routeParts(url);
  if (request.method === 'OPTIONS') return new Response(null, { headers: { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type, x-app-pin', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS' } });
  if (url.pathname === '/health') return json({ status: 'ok', service: 'mailflow-api' }, 200, origin);
  if (url.pathname === '/api/verify-pin' && request.method === 'POST') {
    const body = await bodyJson(request);
    return body.pin && body.pin === env.APP_PIN ? json({ success: true }, 200, origin) : json({ success: false, error: 'Wrong PIN' }, 401, origin);
  }

  if (parts[0] !== 'api') return json({ error: 'Not found' }, 404, origin);
  const publicRoute = parts[1] === 'dashboard' || (parts[1] === 'accounts' && (parts[2] === 'auth' || parts[2] === 'callback'));
  if (!publicRoute) {
    const denied = requireAuth(request, env, origin);
    if (denied) return denied;
  }

  if (parts[1] === 'accounts') return accounts(request, env, parts.slice(2), origin);
  if (parts[1] === 'campaigns') return campaigns(request, env, parts.slice(2), origin);
  if (parts[1] === 'contacts') return contacts(request, env, parts.slice(2), origin);
  if (parts[1] === 'templates') return templates(request, env, parts.slice(2), origin);
  if (parts[1] === 'analytics') return analytics(request, env, origin);
  if (parts[1] === 'queue') return queue(request, env, parts.slice(2), origin);
  if (parts[1] === 'dashboard') return dashboard(env, origin);
  return json({ error: 'Not found' }, 404, origin);
}

async function accounts(request, env, parts, origin) {
  if (parts[0] === 'auth') {
    const params = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: env.GOOGLE_REDIRECT_URI, response_type: 'code', access_type: 'offline', prompt: 'consent', scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email' });
    return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }, 200, origin);
  }
  if (parts[0] === 'callback') {
    const code = new URL(request.url).searchParams.get('code');
    if (!code) return text('<h2>Missing authorization code</h2>', 400, origin);
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: env.GOOGLE_REDIRECT_URI, grant_type: 'authorization_code' }) });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) return text(`<h2>Google connection failed</h2><p>${tokens.error_description || 'Token exchange failed'}</p>`, 500, origin);
    const profile = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { authorization: `Bearer ${tokens.access_token}` } });
    const user = await profile.json();
    await env.DB.prepare(`INSERT INTO accounts (email, access_token, refresh_token, token_expiry) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET access_token = excluded.access_token, refresh_token = COALESCE(excluded.refresh_token, accounts.refresh_token), token_expiry = excluded.token_expiry, status = 'active'`).bind(user.email, tokens.access_token, tokens.refresh_token || null, Date.now() + (tokens.expires_in * 1000)).run();
    return text('<h2>Account connected successfully</h2><p>You can close this tab.</p>', 200, origin);
  }
  if (request.method === 'GET' && parts.length === 0) {
    await ensureDailyReset(env);
    return json(await rows(env.DB.prepare('SELECT id, email, display_name, status, daily_sent, last_reset, created_at FROM accounts ORDER BY created_at DESC')), 200, origin);
  }
  if (request.method === 'POST' && parts[0] === 'display-name' && parts[1] === 'batch') {
    const body = await bodyJson(request); const ids = (body.account_ids || []).map(Number).filter(Number.isInteger);
    if (!ids.length || !String(body.display_name || '').trim()) return json({ error: 'Accounts and display name are required' }, 400, origin);
    await env.DB.batch(ids.map(id => env.DB.prepare('UPDATE accounts SET display_name = ? WHERE id = ?').bind(body.display_name.trim(), id)));
    return json({ success: true, updated: ids.length }, 200, origin);
  }
  if (parts[0] === 'export' && request.method === 'GET') return json(await rows(env.DB.prepare('SELECT * FROM accounts ORDER BY created_at DESC')), 200, origin);
  if (parts[0] === 'import' && request.method === 'POST') {
    const body = await bodyJson(request); const accounts = Array.isArray(body.accounts) ? body.accounts : [];
    await env.DB.batch(accounts.filter(account => account.email).map(account => env.DB.prepare(`INSERT INTO accounts (email, display_name, access_token, refresh_token, token_expiry, status, daily_sent) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name, access_token = excluded.access_token, refresh_token = COALESCE(excluded.refresh_token, accounts.refresh_token), token_expiry = excluded.token_expiry, status = excluded.status, daily_sent = excluded.daily_sent`).bind(account.email, account.display_name || null, account.access_token || null, account.refresh_token || null, account.token_expiry || null, account.status || 'active', account.daily_sent || 0)));
    return json({ success: true, imported: accounts.length }, 200, origin);
  }
  const id = Number(parts[0]);
  if (request.method === 'DELETE') { await env.DB.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run(); return json({ success: true }, 200, origin); }
  if (request.method === 'POST' && parts[1] === 'pause') { await env.DB.prepare("UPDATE accounts SET status = 'paused' WHERE id = ?").bind(id).run(); return json({ success: true }, 200, origin); }
  if (request.method === 'POST' && parts[1] === 'resume') { await env.DB.prepare("UPDATE accounts SET status = 'active' WHERE id = ?").bind(id).run(); return json({ success: true }, 200, origin); }
  if (request.method === 'POST' && parts[1] === 'reset') { await env.DB.prepare("UPDATE accounts SET daily_sent = 0, last_reset = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run(); return json({ success: true }, 200, origin); }
  if (request.method === 'PUT' && parts[1] === 'display-name') { const body = await bodyJson(request); await env.DB.prepare('UPDATE accounts SET display_name = ? WHERE id = ?').bind(body.display_name || null, id).run(); return json({ success: true }, 200, origin); }
  return json({ error: 'Not found' }, 404, origin);
}

async function campaigns(request, env, parts, origin) {
  if (request.method === 'GET' && parts.length === 0) return json(await rows(env.DB.prepare('SELECT * FROM campaigns ORDER BY created_at DESC')), 200, origin);
  if (request.method === 'GET' && parts.length === 1) { const campaign = await one(env.DB.prepare('SELECT * FROM campaigns WHERE id = ?').bind(Number(parts[0]))); return campaign ? json(campaign, 200, origin) : json({ error: 'Campaign not found' }, 404, origin); }
  if (request.method === 'POST' && parts.length === 0) {
    const body = await bodyJson(request); let variations = [];
    try { variations = JSON.parse(body.content_variations || '[]'); } catch {}
    if (!body.name?.trim() || !body.contact_list?.trim()) return json({ error: 'Campaign name and contact list are required' }, 400, origin);
    const count = await one(env.DB.prepare('SELECT COUNT(*) AS count FROM contacts WHERE list_name = ?').bind(body.contact_list));
    const delaySeconds = Number(body.delay_seconds);
    if (!Number.isFinite(delaySeconds) || delaySeconds < 1) return json({ error: 'Custom delay must be at least 1 second' }, 400, origin);
    const selectedTemplateIds = Array.isArray(body.template_ids) ? body.template_ids.map(Number).filter(Number.isInteger) : [];
    const selectedBatches = Array.isArray(body.template_batches) ? body.template_batches.filter(Boolean) : [];
    if (selectedTemplateIds.length) {
      const placeholders = selectedTemplateIds.map(() => '?').join(',');
      const selectedTemplates = await rows(env.DB.prepare(`SELECT subject, body_html, body_plain, batch_name FROM templates WHERE id IN (${placeholders}) ORDER BY id`).bind(...selectedTemplateIds));
      if (selectedTemplates.length) variations = selectedTemplates;
    } else if (selectedBatches.length) {
      const placeholders = selectedBatches.map(() => '?').join(',');
      const batchTemplates = await rows(env.DB.prepare(`SELECT subject, body_html, body_plain, batch_name FROM templates WHERE batch_name IN (${placeholders}) ORDER BY id`).bind(...selectedBatches));
      if (batchTemplates.length) variations = batchTemplates;
    }
    const hasContent = body.subject?.trim() || body.body_html?.trim() || body.body_plain?.trim() || variations.some(value => value && (value.subject?.trim() || value.body_html?.trim() || value.body_plain?.trim()));
    if (!hasContent) return json({ error: 'Select a template batch or add a subject/body' }, 400, origin);
    const result = await env.DB.prepare('INSERT INTO campaigns (name, subject, body_html, body_plain, contact_list, delay_seconds, start_time, end_time, schedule_type, content_variations, content_mode, total_contacts, rotation_mode, template_batches) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id').bind(body.name.trim(), body.subject || variations[0]?.subject || '', body.body_html || variations[0]?.body_html || '', body.body_plain || variations[0]?.body_plain || '', body.contact_list.trim(), delaySeconds, body.start_time || '00:00', body.end_time || '23:59', body.schedule_type || 'immediate', JSON.stringify(variations), body.content_mode || 'random', Number(count?.count) || 0, body.rotation_mode === 'sequential' ? 'sequential' : 'random', JSON.stringify(body.template_batches || [])).first();
    return json({ id: result.id, success: true }, 200, origin);
  }
  const id = Number(parts[0]);
  if (request.method === 'POST' && parts[1] === 'launch') {
    const campaign = await one(env.DB.prepare('SELECT * FROM campaigns WHERE id = ?').bind(id));
    if (!campaign) return json({ error: 'Campaign not found' }, 404, origin);
    const accounts = shuffle(await rows(env.DB.prepare("SELECT id FROM accounts WHERE status = 'active'")));
    const contacts = await rows(env.DB.prepare('SELECT email FROM contacts WHERE list_name = ?').bind(campaign.contact_list));
    if (!accounts.length || !contacts.length) return json({ error: !accounts.length ? 'No active Gmail accounts connected' : 'No contacts found in this list' }, 400, origin);
    await env.DB.prepare("DELETE FROM queue WHERE campaign_id = ? AND status = 'pending'").bind(id).run();
    await env.DB.batch(contacts.map((contact, index) => env.DB.prepare('INSERT INTO queue (campaign_id, recipient_email, account_id) VALUES (?, ?, ?)').bind(id, contact.email, accounts[index % accounts.length].id)));
    await enqueuePendingMessages(env, id);
    await env.DB.prepare("UPDATE campaigns SET status = 'running', sent_count = 0, failed_count = 0 WHERE id = ?").bind(id).run();
    return json({ success: true, queued: contacts.length }, 200, origin);
  }
  if (request.method === 'POST' && (parts[1] === 'pause' || parts[1] === 'resume')) { await env.DB.prepare('UPDATE campaigns SET status = ? WHERE id = ?').bind(parts[1] === 'pause' ? 'paused' : 'running', id).run(); return json({ success: true }, 200, origin); }
  if (request.method === 'DELETE') { await env.DB.batch([env.DB.prepare('DELETE FROM queue WHERE campaign_id = ?').bind(id), env.DB.prepare('DELETE FROM campaigns WHERE id = ?').bind(id)]); return json({ success: true }, 200, origin); }
  return json({ error: 'Not found' }, 404, origin);
}

async function contacts(request, env, parts, origin) {
  if (request.method === 'GET' && parts[0] === 'lists') return json(await rows(env.DB.prepare('SELECT list_name, COUNT(*) AS count, MAX(created_at) AS created_at FROM contacts GROUP BY list_name ORDER BY MAX(created_at) DESC')), 200, origin);
  if (request.method === 'POST' && parts[0] === 'manual') {
    const body = await bodyJson(request); const raw = Array.isArray(body.emails) ? body.emails.join('\n') : String(body.emails || ''); const all = normalizeEmails(raw); const valid = all.filter(email => emailPattern.test(email));
    if (!body.list_name?.trim() || !valid.length) return json({ error: 'List name and valid emails are required' }, 400, origin);
    let added = 0;
    for (const batch of chunkArray(valid, 500)) {
      const batchResults = await env.DB.batch(batch.map(email => env.DB.prepare('INSERT OR IGNORE INTO contacts (list_name, email) VALUES (?, ?)').bind(body.list_name.trim(), email)));
      added += batchResults.reduce((sum, result) => sum + (result.meta?.changes || 0), 0);
    }
    const stored = await one(env.DB.prepare('SELECT COUNT(*) AS count FROM contacts WHERE list_name = ?').bind(body.list_name.trim()));
    return json({ success: true, added, rejected: 0, duplicates: valid.length - added, total: valid.length, stored: Number(stored?.count || 0) }, 200, origin);
  }
  if (request.method === 'POST' && parts[0] === 'upload') {
    const form = await request.formData(); const listName = String(form.get('list_name') || '').trim(); const file = form.get('file'); const raw = file ? await file.text() : '';
    if (!listName) return json({ error: 'List name is required' }, 400, origin);
    const all = normalizeEmails(raw);
    const valid = [...new Set(all.filter(email => emailPattern.test(email)))];
    if (!valid.length) return json({ error: 'No valid emails were found in the uploaded file' }, 400, origin);
    let added = 0;
    for (const batch of chunkArray(valid, 500)) {
      const batchResults = await env.DB.batch(batch.map(email => env.DB.prepare('INSERT OR IGNORE INTO contacts (list_name, email) VALUES (?, ?)').bind(listName, email)));
      added += batchResults.reduce((sum, result) => sum + (result.meta?.changes || 0), 0);
    }
    const stored = await one(env.DB.prepare('SELECT COUNT(*) AS count FROM contacts WHERE list_name = ?').bind(listName));
    return json({ success: true, added, rejected: 0, duplicates: valid.length - added, total: valid.length, stored: Number(stored?.count || 0) }, 200, origin);
  }
  if (request.method === 'DELETE' && parts[0] === 'lists') { await env.DB.prepare('DELETE FROM contacts WHERE list_name = ?').bind(decodeURIComponent(parts[1])).run(); return json({ success: true }, 200, origin); }
  return json({ error: 'Not found' }, 404, origin);
}

async function templates(request, env, parts, origin) {
  if (request.method === 'GET' && !parts.length) return json(await rows(env.DB.prepare('SELECT * FROM templates ORDER BY created_at DESC')), 200, origin);
  if (request.method === 'POST' && parts[0] === 'import') {
    const body = await bodyJson(request);
    const input = Array.isArray(body.templates) ? body.templates : [];
    const imported = [];
    const rejected = [];
    for (let index = 0; index < input.length; index += 1) {
      const template = normalizeTemplate(input[index], index);
      const status = templateStatus(template);
      if (status === 'Missing subject and body') {
        rejected.push({ row: index + 1, name: template.name, reason: status });
        continue;
      }
      const currentChunk = imported.length;
      const result = await env.DB.prepare('INSERT INTO templates (name, batch_name, subject, body_html, body_plain) VALUES (?, ?, ?, ?, ?) RETURNING id').bind(template.name, template.batch_name || 'General', template.subject, template.body_html, template.body_plain).first();
      imported.push({ ...template, id: result.id, status, row: index + 1, chunkIndex: currentChunk });
    }
    return json({ success: true, imported, rejected, count: imported.length, total: input.length }, 200, origin);
  }
  if (request.method === 'POST' && !parts.length) { const body = await bodyJson(request); if (!body.name?.trim()) return json({ error: 'Template name is required' }, 400, origin); const result = await env.DB.prepare('INSERT INTO templates (name, batch_name, subject, body_html, body_plain) VALUES (?, ?, ?, ?, ?) RETURNING id').bind(body.name.trim(), body.batch_name?.trim() || 'General', body.subject || '', body.body_html || '', body.body_plain || '').first(); return json({ id: result.id, success: true }, 200, origin); }
  const id = Number(parts[0]);
  if (request.method === 'GET') { const item = await one(env.DB.prepare('SELECT * FROM templates WHERE id = ?').bind(id)); return item ? json(item, 200, origin) : json({ error: 'Template not found' }, 404, origin); }
  if (request.method === 'PUT') { const body = await bodyJson(request); await env.DB.prepare('UPDATE templates SET name = ?, batch_name = ?, subject = ?, body_html = ?, body_plain = ? WHERE id = ?').bind(body.name?.trim(), body.batch_name?.trim() || 'General', body.subject || '', body.body_html || '', body.body_plain || '', id).run(); return json({ success: true }, 200, origin); }
  if (request.method === 'DELETE') { await env.DB.prepare('DELETE FROM templates WHERE id = ?').bind(id).run(); return json({ success: true }, 200, origin); }
  return json({ error: 'Not found' }, 404, origin);
}

async function analytics(request, env, origin) {
  const campaigns = await rows(env.DB.prepare("SELECT c.*, COUNT(q.id) FILTER (WHERE q.status = 'pending') AS pending_count FROM campaigns c LEFT JOIN queue q ON q.campaign_id = c.id GROUP BY c.id ORDER BY c.created_at DESC"));
  return json(campaigns.map(campaign => ({ ...campaign, delivery_rate: campaign.total_contacts ? Math.round((campaign.sent_count / campaign.total_contacts) * 100) : 0, failure_rate: campaign.total_contacts ? Math.round((campaign.failed_count / campaign.total_contacts) * 100) : 0 })), 200, origin);
}

async function queue(request, env, parts, origin) {
  if (parts[0] === 'stats') {
    await ensureDailyReset(env);
    const values = await Promise.all([
      one(env.DB.prepare('SELECT COUNT(*) AS count FROM queue')),
      one(env.DB.prepare("SELECT COUNT(*) AS count FROM queue WHERE status = 'pending'")),
      one(env.DB.prepare("SELECT COUNT(*) AS count FROM queue WHERE status = 'sent'")),
      one(env.DB.prepare("SELECT COUNT(*) AS count FROM queue WHERE status = 'failed'")),
      one(env.DB.prepare('SELECT COALESCE(SUM(daily_sent), 0) AS count FROM accounts')),
      one(env.DB.prepare("SELECT COUNT(*) AS count FROM campaigns WHERE status = 'running'")),
      one(env.DB.prepare("SELECT COUNT(*) AS count FROM accounts WHERE status = 'active'")),
    ]);
    return json({
      total: Number(values[0]?.count || 0),
      pending: Number(values[1]?.count || 0),
      sent: Number(values[2]?.count || 0),
      failed: Number(values[3]?.count || 0),
      today_sent: Number(values[4]?.count || 0),
      active_campaigns: Number(values[5]?.count || 0),
      active_accounts: Number(values[6]?.count || 0),
    }, 200, origin);
  }
  if (request.method === 'GET') return json(await rows(env.DB.prepare('SELECT q.*, a.email AS account_email, c.name AS campaign_name FROM queue q LEFT JOIN accounts a ON a.id = q.account_id LEFT JOIN campaigns c ON c.id = q.campaign_id ORDER BY q.id DESC LIMIT 100')), 200, origin);
  return json({ error: 'Not found' }, 404, origin);
}

async function dashboard(env, origin) {
  await ensureDailyReset(env);
  const stats = await queue(new Request('https://internal/api/queue/stats'), env, ['stats'], origin);
  const campaigns = await rows(env.DB.prepare('SELECT c.*, COUNT(q.id) FILTER (WHERE q.status = \'pending\') AS pending_count FROM campaigns c LEFT JOIN queue q ON q.campaign_id = c.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 10'));
  return json({ stats: await stats.json(), campaigns }, 200, origin);
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); } catch (error) { return json({ error: error.message || 'Internal server error' }, 500, originFor(request, env)); }
  },
  async scheduled(controller, env, ctx) {
    const work = Promise.all([ensureDailyReset(env), seedCampaignQueues(env)]);
    ctx.waitUntil(work);
  },
  async queue(batch, env) {
    for (const message of batch.messages) await processQueueMessage(message, env);
  },
};
