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

## Frontend (Cloudflare Pages) — pending adapter

The frontend is Next.js 15 with App Router, `next-intl`, and monorepo workspace packages. Vanilla `next build` output is **not** directly uploadable to Pages.

Before enabling the `deploy_frontend` workflow input:

1. Add `@cloudflare/next-on-pages` (or OpenNext for Cloudflare) to `frontend/`
2. Create a Cloudflare Pages project (e.g. `landi-flow`)
3. Configure Pages environment variables (public only in client):

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | Canonical app URL |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Root domain for auth redirects |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | Liveblocks public key |
| `FLOW_API_URL` | Deployed API Worker base URL |
| `NEXT_PUBLIC_MOCK_AUTH` | `false` on staging for 13r HITM |

## Staging checklist (Phase 12 → 13r)

- [ ] PR CI green (`test.yml`)
- [ ] Workers deployed; `/api/v1/health` returns 200
- [ ] MCP OAuth secrets configured (MCP may 500 until secrets set)
- [ ] Frontend Pages deploy enabled (after adapter)
- [ ] `NEXT_PUBLIC_MOCK_AUTH=false` on staging
- [ ] URLs recorded in `landi-labs/.../outputs/13r-live-hitm/deployment-report.md`

## Rollback

```bash
cd workers/api && npx wrangler deployments list
npx wrangler rollback [VERSION_ID]
```

Repeat for `workers/mcp`. Pages rollback via Cloudflare dashboard → Deployments → Rollback.
