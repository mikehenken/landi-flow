# landi-flow — Deployment

**Target platform:** Cloudflare Workers (API + MCP + frontend staging via OpenNext).

## Staging URLs

| Component | Worker name | Primary URL | Fallback |
|-----------|-------------|-------------|----------|
| Frontend | `landi-flow-staging` | https://flow.landi.build | https://landi-flow-staging.mikehenken.workers.dev |
| API | `landi-flow-api` | https://landi-flow-api.mikehenken.workers.dev | — |
| MCP | `landi-flow-mcp` | https://landi-flow-mcp.mikehenken.workers.dev | — |

Generic workers.dev pattern: `https://<worker>.<subdomain>.workers.dev` where `<subdomain>` is your account label (e.g. `mikehenken`).

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
| `STAGING_SITE_URL` | Canonical staging frontend URL (`https://flow.landi.build`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend build |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend build |
| `NEXT_PUBLIC_SITE_URL` | Canonical staging URL (build + runtime secret) |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Auth cookie domain root (`flow.landi.build`) |
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
- `NEXT_PUBLIC_SUPABASE_URL` (runtime — middleware + Supabase client)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (runtime)
- `NEXT_PUBLIC_SITE_URL` (runtime — use `https://flow.landi.build` on staging)
- `NEXT_PUBLIC_ROOT_DOMAIN` (runtime — `flow.landi.build`)

Set all six from repo-root `.env.local` (override site URL vars for staging):

```powershell
.\scripts\set-staging-secrets.ps1 -Target frontend
```

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
| `frontend/wrangler.toml` | Worker name, custom domain `flow.landi.build`, OpenNext output paths, `FLOW_API_URL` var |
| `frontend/open-next.config.ts` | OpenNext Cloudflare adapter |
| `frontend/next.config.ts` | Monorepo transpile + `initOpenNextCloudflareForDev()` |

**OpenNext staging flags** (in `wrangler.toml` `[vars]` and `[[services]]`):

- `NEXT_PRIVATE_MINIMAL_MODE=1` — skips middleware manifest dynamic require
- `FLOW_API_URL` — API Worker URL fallback for local dev / tests
- `FLOW_API` service binding → `landi-flow-api` — zero-hop proxy on staging (avoids worker-to-worker HTTP 530)

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

Add redirect URLs in Supabase Auth → URL configuration:

```
https://flow.landi.build/auth/callback
https://landi-flow-staging.mikehenken.workers.dev/auth/callback
```

Use the primary `flow.landi.build` URL once DNS resolves. Keep the workers.dev fallback until cutover is verified.

> **Canvas Studio** uses a separate Supabase project. Add `https://canvas.landi.build/auth/callback` there — not in the landi-flow project.

### OAuth redirect URL (localhost bug)

OAuth `redirectTo` is set in the **client bundle** at interaction time from `window.location.origin`, not from build-time `NEXT_PUBLIC_SITE_URL`. That prevents local `.env.local` values (e.g. `http://localhost:3100`) from leaking into production when a dev build is deployed.

**Still required for CI builds:**

| When | Set `NEXT_PUBLIC_SITE_URL` to |
|------|-------------------------------|
| GitHub Actions `deploy-frontend` | `https://flow.landi.build` (repo variable or default in workflow) |
| Manual `worker:build` before deploy | Export env **or** rely on browser origin at OAuth click time |

**Verify Worker runtime vars** (not secrets — in `wrangler.toml` `[vars]` or `wrangler secret list`):

```bash
cd frontend
npx wrangler secret list   # should NOT override NEXT_PUBLIC_SITE_URL with localhost
```

If a stale Worker secret sets `NEXT_PUBLIC_SITE_URL=http://localhost:3000`, remove or update it:

```bash
cd frontend
npx wrangler secret delete NEXT_PUBLIC_SITE_URL   # only if wrongly set as secret
# Prefer [vars] in wrangler.toml: NEXT_PUBLIC_SITE_URL = "https://flow.landi.build"
```

After code or env changes, redeploy:

```bash
pnpm --filter @landi-flow/frontend worker:build
cd frontend && npx wrangler deploy
```

**Do not** run `wrangler secret put NEXT_PUBLIC_SITE_URL` with placeholder localhost values in agent sessions without explicit user approval.

### Custom domain DNS

Worker deploy binds `flow.landi.build` via `[[routes]]` + `custom_domain = true` in `frontend/wrangler.toml`. If the hostname does not resolve after deploy, add a proxied DNS record in the **landi.build** zone (Cloudflare dashboard → DNS) or ensure the deploy API token has **Zone.DNS.Edit** + **Workers Routes** permissions.

## Staging checklist

- [x] API Worker deployed; `/api/v1/health` → 200
- [x] MCP Worker deployed; `/` → 200
- [x] Frontend OpenNext adapter (`@opennextjs/cloudflare`)
- [x] Frontend Worker deployed; `/en/auth/login` → 200 (workers.dev + custom domain binding)
- [x] Frontend Worker runtime secrets (6 keys — see table above)
- [x] Custom domain `flow.landi.build` bound on Worker — DNS resolving (2026-07-09)
- [ ] Supabase Auth redirect URL configured for `flow.landi.build`
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
