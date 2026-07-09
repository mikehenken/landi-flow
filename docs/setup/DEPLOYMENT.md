# landi-flow — Deployment

**Target platform:** Cloudflare Workers (API + MCP + frontend staging).

## Components

| Component | Path | Cloudflare name | Default URL |
|-----------|------|-----------------|-------------|
| API Worker | `workers/api/` | `landi-flow-api` | `https://landi-flow-api.<subdomain>.workers.dev` |
| MCP Worker | `workers/mcp/` | `landi-flow-mcp` | `https://landi-flow-mcp.<subdomain>.workers.dev` |
| Frontend (staging) | `frontend/` | `landi-flow-staging` | `https://landi-flow-staging.<subdomain>.workers.dev` |

Replace `<subdomain>` with your account workers.dev label (e.g. `mikehenken`).

## CI/CD

- **Test:** `.github/workflows/test.yml` — typecheck, vitest, Playwright E2E on PR/push
- **Deploy:** `.github/workflows/deploy.yml` — Workers on `develop` push; frontend via `workflow_dispatch` + `deploy_frontend`

### GitHub repository configuration

Set these as **repository secrets** (never commit values):

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy (Workers) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

Optional **repository variables**:

| Variable | Purpose |
|----------|---------|
| `CLOUDFLARE_WORKERS_DEV_SUBDOMAIN` | workers.dev label for deploy summary URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend build (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend build (public) |
| `NEXT_PUBLIC_SITE_URL` | Canonical staging URL (defaults to `landi-flow-staging` worker) |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Auth cookie domain root |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | Liveblocks public key |
| `NEXT_PUBLIC_MOCK_AUTH` | `false` on staging for 13r HITM |
| `FLOW_API_URL` | API Worker base URL for Next.js proxy routes |

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

**Frontend Worker (`frontend/` — `landi-flow-staging`):**

- `LIVEBLOCKS_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

List configured secret **names** (not values):

```bash
cd workers/api && npx wrangler secret list
cd workers/mcp && npx wrangler secret list
cd frontend && npx wrangler secret list
```

## Local / manual deploy

```bash
# From repo root — install once
pnpm install --frozen-lockfile

# API Worker
cd workers/api
npx wrangler deploy

# MCP Worker
cd workers/mcp
npx wrangler deploy

# Frontend staging Worker (OpenNext)
cd frontend
pnpm worker:build
npx wrangler deploy

# Health check
curl https://landi-flow-api.<subdomain>.workers.dev/api/v1/health
```

Do **not** run `wrangler secret put` with placeholder values in agent sessions. Use existing production/staging secrets only.

## Frontend (Cloudflare Workers via OpenNext)

The frontend uses Next.js 15 with `@opennextjs/cloudflare` for staging deployment on Worker `landi-flow-staging`.

**Why Workers (not Pages):** Cloudflare Pages project limit reached on the staging account; Workers deploy avoids creating a new Pages project and is the [recommended OpenNext path](https://opennext.js.org/cloudflare).

### Build (local / CI)

```bash
pnpm install --frozen-lockfile
pnpm --filter @landi-flow/frontend typecheck
pnpm --filter @landi-flow/frontend build          # standard Next.js build (local dev)
pnpm --filter @landi-flow/frontend worker:build   # OpenNext → .open-next/ (Linux CI)
```

Local dev is unchanged: `pnpm --filter @landi-flow/frontend dev` (port 3000).

### Deploy (manual)

```bash
cd frontend
pnpm worker:deploy
# or: pnpm worker:build && npx wrangler deploy
```

### CI deploy

`.github/workflows/deploy.yml` → `workflow_dispatch` with **Deploy frontend** enabled runs `worker:build` and `wrangler deploy` to **`landi-flow-staging`**.

### Config files

- `frontend/wrangler.toml` — Worker `landi-flow-staging`, OpenNext output paths
- `frontend/open-next.config.ts` — OpenNext Cloudflare adapter config
- `frontend/next.config.ts` — monorepo transpile + `initOpenNextCloudflareForDev()` for bindings in dev
- `public/_headers` — static asset cache headers (synced to `frontend/public/`)

### Legacy Pages path (optional, not used in CI)

`@cloudflare/next-on-pages` scripts (`pages:build`, `pages:deploy`) remain for reference but are blocked by Pages project quota. Do not use for staging until quota is increased or a project is retired.

## Staging checklist (Phase 12 → 13r)

- [ ] PR CI green (`test.yml`)
- [x] Workers deployed; `/api/v1/health` returns 200
- [x] MCP OAuth secrets configured (root + OAuth metadata return 200)
- [x] Frontend OpenNext adapter added (`@opennextjs/cloudflare`)
- [ ] Frontend Worker deploy executed (CI `deploy_frontend` or manual)
- [ ] `NEXT_PUBLIC_MOCK_AUTH=false` on staging Worker build
- [ ] Frontend Worker runtime secrets (`LIVEBLOCKS_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [x] URLs recorded in `landi-labs/.../outputs/13r-live-hitm/deployment-report.md`

## Rollback

```bash
cd workers/api && npx wrangler deployments list
npx wrangler rollback [VERSION_ID]
```

Repeat for `workers/mcp` and `frontend` (landi-flow-staging). Pages rollback N/A for Worker path.
