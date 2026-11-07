# Deployment on Vercel

This project is a static frontend with serverless API endpoints under /api.

**Important**: This project uses Redis (Upstash) to persist quiz state across serverless function invocations. Without a database configured, the API falls back to per-instance in-memory storage: the site loads without errors, but state can be lost between requests and deployments.

## What you need
- A Vercel account
- Vercel CLI (optional) or the Vercel web UI
- ADMIN_PASSWORD environment variable set in Vercel
- **Upstash Redis database (required for state persistence)**

## Step 1: Set up Redis Storage

### Option A: Using Vercel Dashboard (Recommended)
1. Go to your Vercel project dashboard
2. Navigate to the **Storage** tab
3. Click **Create Database** (or **Marketplace** → **Upstash Redis**)
4. Create a Redis database and connect it to this project
5. Vercel injects the REST credentials automatically. Depending on which integration you pick they are named either:
   - `KV_REST_API_URL` / `KV_REST_API_TOKEN`, or
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`

Either pair works — the API reads both.

### Option B: Using Vercel CLI
```bash
vercel link           # Link to your project
vercel env pull       # Sync env vars locally (optional)
```

## Step 2: Required Environment Variables
- **ADMIN_PASSWORD**: admin password used by /api/quiz-state for admin actions
- **KV_REST_API_URL** / **KV_REST_API_TOKEN**, or **UPSTASH_REDIS_REST_URL** / **UPSTASH_REDIS_REST_TOKEN**: automatically set when you connect a Redis store

> **Note**: The storage environment variables are automatically configured when you connect a database through Vercel. You only need to manually set ADMIN_PASSWORD.
>
> Check `/api/debug` after deploying: `kvStorage.configured` should be `true`. If it is `false`, the database is not connected to the project yet.

## Step 3: Deploy with Vercel Web UI
1) Push the repo to GitHub (or GitLab/Bitbucket).
2) Import the repo in Vercel.
3) **Create a KV store** (see Step 1 above).
4) Set the environment variable **ADMIN_PASSWORD**.
5) Deploy.

## Step 3: Deploy with Vercel CLI
## Step 3: Deploy with Vercel CLI
1) Install the CLI: `npm i -g vercel`
2) Login: `vercel login`
3) Link to your project: `vercel link`
4) **Create KV store**: `vercel storage create kv`
5) Set env var: `vercel env add ADMIN_PASSWORD`
6) Deploy to production: `vercel --prod`

## Verify After Deploy
- Open the root site URL and check the quiz loads.
- Open /admin.html and log in with ADMIN_PASSWORD.
- Start the quiz from the admin panel and verify that users can submit.
- Check that the leaderboard persists across page refreshes.

## Troubleshooting

### "Quiz has ended" error when submitting
This usually means:
1. **Redis store not configured**: Make sure you've connected a Redis database in Vercel. Visit `/api/debug` and confirm `kvStorage.configured` is `true`.
2. **State not syncing**: Each serverless function must be able to read/write to the same Redis store. If `configured` is `false`, requests fall back to in-memory storage and state is not shared.

### API returns 500 with a JSON error
The response body now includes a `detail` field with the underlying storage error. Common causes are invalid/expired Redis credentials or a database that was deleted while still connected to the project.

### Vercel KV deprecated warning
Vercel KV has been moved to Upstash Redis. This project no longer depends on the deprecated `@vercel/kv` package; it talks to the Upstash REST API directly and supports both the old `KV_*` and new `UPSTASH_*` variable names.

## Notes
- **State is now persistent**: Quiz state, leaderboard, and winner count are stored in Redis (Vercel KV / Upstash) and persist across cold starts and redeploys.
- The API routes are deployed as serverless functions (Vercel does this automatically for /api/*.js with the provided vercel.json).
- Local development still uses in-memory state via `dev-server.js`, which is fine for testing.

## File map (local vs production)
### Local-only
- `dev-server.js` (Express dev server for local testing)
- `.env` (local secrets; not committed)
- `.env.example` (reference for local env vars)

### Production (Vercel)
- `vercel.json` (Vercel routing for serverless functions)
- `api/*.js` (serverless functions)
- `index.html`, `admin.html`, `styles.css`, `data/questions.json` (static assets)

### Shared
- `package.json` (scripts and dependencies)
- `.gitignore` (keeps local/private files out of git)
