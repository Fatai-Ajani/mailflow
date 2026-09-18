# MailFlow deployment on Railway

## Architecture

- Frontend: static hosting or Cloudflare Pages
- API and scheduler: Railway Node app
- Database: Railway PostgreSQL
- Source: GitHub
- Email: Google Gmail API

This setup removes the Cloudflare D1 free-tier limits. The API runs as a long-lived Node process on Railway and uses PostgreSQL for campaign, queue, template, account, and contact data.

## Why this migration matters

Cloudflare D1 is not a safe long-term fit for a live email sender when the app is doing real campaign work. The free tier can hit row-read and row-write caps fast, which interrupts dashboard stats and queue processing.

Railway PostgreSQL avoids that ceiling while preserving the same app behavior.

## Local setup

From the repository root:

```bash
npm install
cp .env.example .env
```

Then fill in values in `.env`:

```env
DATABASE_URL=postgres://user:password@host:5432/dbname
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=https://your-railway-app.up.railway.app/api/accounts/callback
APP_PIN=choose_a_strong_pin_here
PUBLIC_API_URL=https://your-railway-app.up.railway.app
PORT=3000
```

Start locally:

```bash
npm start
```

Frontend local dev:

```bash
cd frontend
npm install
npm start
```

Set the frontend environment variable to the Railway API URL:

```env
REACT_APP_API_URL=https://your-railway-app.up.railway.app
```

## Railway database setup

1. Create a new Railway project.
2. Add a PostgreSQL service.
3. Copy the generated `DATABASE_URL` into the Railway service environment variables.
4. Keep this value private; do not commit it.

Once the database is available, the app will initialize tables automatically on boot using the existing PostgreSQL schema defined in `db.js`.

## Railway app setup

1. Create a new Railway service from this GitHub repository.
2. Set the root directory to the repository root.
3. Railway will use the included `railway.json` and `Dockerfile` automatically when supported.
4. Add these environment variables in Railway:

```env
DATABASE_URL=postgres://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://your-railway-app.up.railway.app/api/accounts/callback
APP_PIN=...
PUBLIC_API_URL=https://your-railway-app.up.railway.app
PORT=3000
```

5. Deploy the service.

### Callback URL for Google OAuth

Use the Railway deployment URL plus `/api/accounts/callback` in Google Cloud Console.

Example:

```text
https://your-railway-app.up.railway.app/api/accounts/callback
```

## Google OAuth setup

1. Create or select a Google Cloud project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen.
4. Create an OAuth client ID.
5. Add the Railway callback URL under authorized redirect URIs.
6. Add your Gmail address as a test user while the app is in testing.

## Frontend deployment

The frontend can remain on Cloudflare Pages or be moved to any static host.

Set:

```env
REACT_APP_API_URL=https://your-railway-app.up.railway.app
```

Build command:

```bash
npm run build
```

Publish the `frontend/build` output to the hosting provider.

## Source push

Review changes before deployment:

```bash
git status
git add .
git commit -m "Migrate MailFlow backend to Railway PostgreSQL"
git push origin main
```

Do not commit `.env` or database credentials.
