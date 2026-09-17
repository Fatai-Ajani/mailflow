# MailFlow deployment

## Architecture

- Frontend: Cloudflare Pages
- API and scheduler: Cloudflare Workers
- Database: Cloudflare D1
- Source: GitHub
- Email: Google Gmail API

This architecture avoids Render/Railway sleep behavior and does not require a VPS. The Worker uses a Cron Trigger every minute to process pending campaign messages.

### Production billing requirement

MailFlow is not suitable for the Workers Free plan once it has real sending activity. D1 stops all queries after its daily free row-read or row-write allowance is reached. Enable the Cloudflare Workers Paid plan for the account that owns `mailflow-api`; it has a $5/month minimum and includes substantially higher monthly D1 allowances, with overage billed by usage. The change normally takes effect within minutes and does not require a database migration.

In the Cloudflare dashboard, open **Workers & Pages**, upgrade the account to **Workers Paid**, and confirm that `mailflow-api` is using the Standard usage model. For free-tier use, the dashboard endpoint is edge-cached for one hour and the frontend stores the last successful dashboard response locally. It does not poll D1 automatically; use Refresh when current numbers are needed.

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

Create a separate **Pages** project from the Cloudflare dashboard. Do not use `npx wrangler deploy` for this project; that command is only for the API Worker.

In Cloudflare Pages, import the GitHub repository with:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `build`
- Environment variable: `REACT_APP_API_URL=https://mailflow-api.<your-subdomain>.workers.dev`

If the project has a **Deploy command** field, leave it empty. Cloudflare Pages runs the build command and publishes the output directory automatically.

Cloudflare Pages must be connected to the current owner repository `Fatai-Ajani/mailflow`. Cloudflare Pages will provide a permanent `*.pages.dev` URL. Every push to the selected GitHub branch can trigger a new deployment.

## Source push

Review the changes first, then push from the repository root:

```bash
git status
git add .
git commit -m "Migrate MailFlow to Cloudflare Workers and D1"
git push origin main
```

Do not commit `.env`, OAuth secrets, or database credentials.
