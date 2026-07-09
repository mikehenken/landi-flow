# landi-flow — Deployment

**Target platform:** Cloudflare Workers (API + MCP + frontend staging via OpenNext).

## Staging URLs

| Component | Worker name | URL |
|-----------|-------------|-----|
| Frontend | `landi-flow-staging` | https://landi-flow-staging.mikehenken.workers.dev |
| API | `landi-flow-api` | https://landi-flow-api.mikehenken.workers.dev |
| MCP | `landi-flow-mcp` | https://landi-flow-mcp.mikehenken.workers.dev |

Generic pattern: `https://<worker>.<subdomain>.workers.dev` where `<subdomain>` is your account label (e.g. `mikehenken`).

## Components

| Component | Path | Build | Deploy command |
|-----------|------|-------|----------------|
| API Worker | `workers/api/` | TypeScript (esbuild) | `npx wrangler deploy` |
| MCP Worker | `workers/mcp/` | TypeScript (esbuild) | `npx wrangler deploy` |
| Frontend Worker | `frontend/` | OpenNext → `.open-next/` | `pnpm worker:build && npx wrangler deploy` |

## CI/CD

Workflows in `.github/workflows/`:

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `test.yml` | PR + push to `develop`/`master`/`feature/**` | typecheck, vitest, Playwright E2E |
| `deploy.yml` | Push to `develop` | Deploy API + MCP Workers |
| `deploy.yml` | `workflow_dispatch` + **Deploy frontend** | OpenNext build + deploy `landi-flow-staging` |

### GitHub repository secrets

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |

### GitHub repository variables (build-time, public)

| Variable | Purpose |
|----------|---------|
| `CLOUDFLARE_WORKERS_DEV_SUBDOMAIN` | workers.dev label for deploy summary URLs |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend build |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend build |
| `NEXT_PUBLIC_SITE_URL` | Canonical staging URL |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Auth cookie domain root |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | Liveblocks public key |
| `NEXT_PUBLIC_MOCK_AUTH` | `false` on staging |
| `FLOW_API_URL` | API Worker base URL for Next.js proxy |

## Worker runtime secrets

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

## Frontend (OpenNext → Cloudflare Worker)

Next.js 15 with `@opennextjs/cloudflare` deploys to Worker `landi-flow-staging`.

**Why Workers (not Pages):** Cloudflare Pages project limit on the staging account; OpenNext on Workers is the active path.

### Build

```bash
pnpm install --frozen-lockfile
pnpm --filter @landi-flow/frontend typecheck
pnpm --filter @landi-flow/frontend build          # standard Next.js (local dev)
pnpm --filter @landi-flow/frontend worker:build   # OpenNext → .open-next/ (CI/Linux)
```

Local dev unchanged: `pnpm --filter @landi-flow/frontend dev`.

### Deploy (manual)

```bash
cd frontend
pnpm worker:deploy
# or: pnpm worker:build && npx wrangler deploy
```

### Config files

| File | Role |
|------|------|
| `frontend/wrangler.toml` | Worker name, OpenNext output paths, `FLOW_API_URL` var |
| `frontend/open-next.config.ts` | OpenNext Cloudflare adapter |
| `frontend/next.config.ts` | Monorepo transpile + `initOpenNextCloudflareForDev()` |

**OpenNext staging flags** (in `wrangler.toml` `[vars]`):

- `NEXT_PRIVATE_MINIMAL_MODE=1` — skips middleware manifest dynamic require
- `FLOW_API_URL` — API Worker URL for server-side proxy

Locale paths must include prefix (e.g. `/en/auth/login`) while minimal mode is active.

### Legacy Pages path (not used)

`pages:build` / `pages:deploy` scripts are deprecated (exit 1). Do not use until Pages quota is available.

## Local / manual deploy (all Workers)

```bash
pnpm install --frozen-lockfile

cd workers/api && npx wrangler deploy
cd workers/mcp && npx wrangler deploy
cd frontend && pnpm worker:build && npx wrangler deploy

curl https://landi-flow-api.mikehenken.workers.dev/api/v1/health
```

Do **not** run `wrangler secret put` with placeholder values in agent sessions.

## Supabase Auth (staging)

Add redirect URL in Supabase Auth → URL configuration:

```
https://landi-flow-staging.mikehenken.workers.dev/auth/callback
```

## Staging checklist

- [x] API Worker deployed; `/api/v1/health` → 200
- [x] MCP Worker deployed; `/` → 200
- [x] Frontend OpenNext adapter (`@opennextjs/cloudflare`)
- [x] Frontend Worker deployed; `/en/auth/login` → 200
- [ ] Frontend Worker runtime secrets (`LIVEBLOCKS_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Supabase Auth redirect URL configured
- [ ] `NEXT_PUBLIC_MOCK_AUTH=false` on staging build

## Rollback

Per Worker:

```bash
cd workers/api    # or workers/mcp, frontend
npx wrangler deployments list
npx wrangler rollback [VERSION_ID]
```

Repeat for each surface. Pages rollback N/A — frontend is on Workers.

## Related

- [Developer guide](../README.md)
- [Cursor MCP setup](./cursor-mcp.md)
- Study deployment report: `outputs/13r-live-hitm/deployment-report.md`
