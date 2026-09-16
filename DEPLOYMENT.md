# MailFlow deployment

## Free architecture

- Frontend: Cloudflare Pages
- API and scheduler: Cloudflare Workers
- Database: Cloudflare D1
- Source: GitHub
- Email: Google Gmail API

This architecture avoids Render/Railway sleep behavior and does not require a VPS. The Worker uses a Cron Trigger every minute to process pending campaign messages. Cloudflare's free plan currently documents 100,000 Worker requests per day, five Cron Triggers per account, and D1 free databases up to 500 MB.

## Local setup

From the repository root:

```powershell
cd worker
npm install
npx wrangler login
npm run dev
```

Frontend development:

```powershell
cd frontend
npm install
npm start
```

The local frontend API setting is in `frontend/.env`.

## Create the D1 database

From `worker`:

```powershell
npx wrangler d1 create mailflow
```

Copy the returned database ID into `worker/wrangler.jsonc` in place of `REPLACE_WITH_D1_DATABASE_ID`, then apply the migration:

```powershell
npx wrangler d1 migrations apply mailflow --remote
```

## Configure Worker secrets

These are secrets and must not be committed to GitHub:

```powershell
npx wrangler secret put APP_PIN
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REDIRECT_URI
```

Use this callback URL after deployment:

```text
https://mailflow-api.<your-subdomain>.workers.dev/api/accounts/callback
```

Update `APP_ORIGIN` in `worker/wrangler.jsonc` to the real Cloudflare Pages URL, then deploy:

```powershell
npm run deploy
```

## Google OAuth setup

Google Cloud Console steps:

1. Create or select a Google Cloud project.
2. Enable **Gmail API**.
3. Configure the OAuth consent screen.
4. Choose **Create credentials** > **OAuth client ID**.
5. Choose application type **Web application**.
6. Add the Worker callback URL under **Authorized redirect URIs**.
7. Add your Gmail address as a test user while the app is in testing.

The OAuth client produces a Client ID and Client Secret. Those values are stored in Cloudflare Worker secrets, not in the repository.

## Deploy the frontend

In Cloudflare Pages, import the GitHub repository with:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `build`
- Environment variable: `REACT_APP_API_URL=https://mailflow-api.<your-subdomain>.workers.dev`

Cloudflare Pages will provide a permanent `*.pages.dev` URL. Every push to the selected GitHub branch can trigger a new deployment.

## Source push

Review the changes first, then push from the repository root:

```bash
git status
git add .
git commit -m "Migrate MailFlow to Cloudflare Workers and D1"
git push origin main
```

Do not commit `.env`, OAuth secrets, or database credentials.
