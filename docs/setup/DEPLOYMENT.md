# landi-flow — Deployment

**Target platform:** Cloudflare Workers (API + MCP) and Cloudflare Pages (frontend).

## Components

| Component | Path | Cloudflare name | Default URL |
|-----------|------|-----------------|-------------|
| API Worker | `workers/api/` | `landi-flow-api` | `https://landi-flow-api.<subdomain>.workers.dev` |
| MCP Worker | `workers/mcp/` | `landi-flow-mcp` | `https://landi-flow-mcp.<subdomain>.workers.dev` |
| Frontend | `frontend/` | `landi-flow` (Pages, TBD) | `https://landi-flow.pages.dev` (proposed) |

Replace `<subdomain>` with your account workers.dev label (e.g. `mikehenken`).

## CI/CD

- **Test:** `.github/workflows/test.yml` — typecheck, vitest, Playwright E2E on PR/push
- **Deploy:** `.github/workflows/deploy.yml` — Workers on `develop` push or manual dispatch

### GitHub repository configuration

Set these as **repository secrets** (never commit values):

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy (Workers + Pages) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

Optional **repository variables**:

| Variable | Purpose |
|----------|---------|
| `CLOUDFLARE_WORKERS_DEV_SUBDOMAIN` | workers.dev label for deploy summary URLs |

### Worker runtime secrets

Set via `wrangler secret put <NAME>` in each worker directory. **Key names only** — never print or commit values.

**API Worker (`workers/api/`):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDFLARE_AI_GATEWAY_TOKEN`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `NEXT_PUBLIC_SITE_URL`

**MCP Worker (`workers/mcp/`):**

- Supabase trio above
- `MCP_OAUTH_ISSUER`
- `MCP_RESOURCE_URI`
- `MCP_CREDENTIAL_PEPPER`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_AI_GATEWAY_ENDPOINT`
- `CLOUDFLARE_AI_GATEWAY_TOKEN`
- `CLOUDFLARE_AI_GATEWAY_ID`
- `GEMINI_API_KEY`
- `VERTEX_API_KEY`
- `DEFAULT_GEMINI_MODEL`

List configured secret **names** (not values):

```bash
cd workers/api && npx wrangler secret list
cd workers/mcp && npx wrangler secret list
```

## Local / manual deploy

```bash
# From repo root — install once
pnpm install --frozen-lockfile

# API Worker
cd workers/api
npx wrangler deploy

# MCP Worker (requires account_id in wrangler.toml)
cd workers/mcp
npx wrangler deploy

# Health check
curl https://landi-flow-api.<subdomain>.workers.dev/api/v1/health
```

Do **not** run `wrangler secret put` with placeholder values in agent sessions. Use existing production/staging secrets only.

## Frontend (Cloudflare Pages)

The frontend uses Next.js 15 with `@cloudflare/next-on-pages` for Cloudflare Pages deployment.

### Build (local / CI)

```bash
# From repo root
pnpm install --frozen-lockfile
pnpm --filter @landi-flow/frontend typecheck
pnpm --filter @landi-flow/frontend build          # standard Next.js build (verified)
pnpm --filter @landi-flow/frontend pages:build    # next build + next-on-pages (Linux CI)
```

**Note:** `pages:build` requires Linux/macOS (Vercel CLI + next-on-pages are unreliable on Windows).

### Deploy (manual)

```bash
cd frontend
pnpm run pages:build
pnpm run pages:deploy
# or: npx wrangler pages deploy .vercel/output/static --project-name=landi-flow
```

### CI deploy

`.github/workflows/deploy.yml` → `workflow_dispatch` with **Deploy frontend** enabled runs `pages:build` and `wrangler pages deploy` to project **`landi-flow`**.

### Pages environment variables

Set in **Cloudflare Pages → landi-flow → Settings → Environment variables** (encrypted for server-only keys):

| Variable | Scope | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Build + runtime | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Build + runtime | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | Build + runtime | Canonical app URL |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Build + runtime | Root domain for auth redirects |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | Build + runtime | Liveblocks public key |
| `NEXT_PUBLIC_MOCK_AUTH` | Build + runtime | `false` on staging for 13r HITM |
| `FLOW_API_URL` | Runtime | Deployed API Worker base URL |
| `LIVEBLOCKS_SECRET_KEY` | Runtime (encrypted) | Liveblocks auth route |
| `SUPABASE_SERVICE_ROLE_KEY` | Runtime (encrypted) | Server routes / liveblocks-auth |

GitHub Actions uses **repository variables** (public only) for the build step — see deploy workflow `env:` block.

### Config files

- `frontend/wrangler.toml` — Pages project name + `pages_build_output_dir` (no `account_id` — Pages rejects it)
- `frontend/next.config.ts` — monorepo transpile (unchanged); use `pnpm pages:dev` for local Pages preview

## Staging checklist (Phase 12 → 13r)

- [ ] PR CI green (`test.yml`)
- [x] Workers deployed; `/api/v1/health` returns 200
- [x] MCP OAuth secrets configured (root + OAuth metadata return 200)
- [x] Frontend Pages adapter added (`@cloudflare/next-on-pages`)
- [ ] Frontend Pages deploy executed (CI `deploy_frontend` or manual)
- [ ] `NEXT_PUBLIC_MOCK_AUTH=false` on staging Pages
- [x] URLs recorded in `landi-labs/.../outputs/13r-live-hitm/deployment-report.md`

## Rollback

```bash
cd workers/api && npx wrangler deployments list
npx wrangler rollback [VERSION_ID]
```

Repeat for `workers/mcp`. Pages rollback via Cloudflare dashboard → Deployments → Rollback.
