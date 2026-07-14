# Landi Flow — Developer Guide

Light reference for local dev, staging, API/MCP, and platform subsystems. Key names only — never commit secret values.

## Overview

Landi Flow is an open-source, Linear-class product development system with native human + AI collaboration. Modular monolith:

- **Frontend** — Next.js 15 (`frontend/`), shadcn/ui, domain stores
- **API Worker** — REST + webhooks + outbox poller (`workers/api/`)
- **MCP Worker** — Streamable HTTP MCP for agents (`workers/mcp/`)
- **Data** — Supabase Postgres, `linear_clone` schema, RLS-first

Study design artifacts: [STUDY-013](https://github.com/mikehenken/landi-labs/tree/main/studies/Orchestration/linear-clone-product-lifecycle).

## Staging URLs

| Surface | URL | Health check |
|---------|-----|--------------|
| Frontend | https://landi-flow-staging.mikehenken.workers.dev | `GET /en/auth/login` → 200 |
| API | https://landi-flow-api.mikehenken.workers.dev | `GET /api/v1/health` → 200 |
| MCP | https://landi-flow-mcp.mikehenken.workers.dev | `GET /` → 200 |

Production custom domains are not configured yet. Use staging workers.dev URLs.

## Setup / local dev

**Prerequisites:** Node ≥20, pnpm 9.15, Supabase project with `linear_clone` schema.

```bash
pnpm install
cp .env.example .env.local   # populate from secret store — names only in .env.example
pnpm dev                     # Next.js on :3000 (or :3100/:3200 if busy)
```

| Command | Purpose |
|---------|---------|
| `pnpm dev:alt` | Explicit port 3100 |
| `pnpm typecheck` | All packages |
| `pnpm test` | Vitest unit/integration |
| `pnpm test:e2e` | Playwright (frontend) |
| `pnpm storybook` | UI kit on :6006 (`packages/ui`) |
| `pnpm mcp:dev` | MCP worker on :8787 |
| `pnpm mcp:issue-dev-key` | Issue local `lcf_sk_*` key |
| `pnpm verify:rls-gate` | RLS CI gate |

**Port note:** The dev launcher sets `NEXT_PUBLIC_SITE_URL` to the bound port. Do not hardcode port in `.env.local`.

**MCP local setup:** See [setup/cursor-mcp.md](./setup/cursor-mcp.md).

## Deployment

Cloudflare Workers for all three surfaces. Frontend uses **@opennextjs/cloudflare** → Worker `landi-flow-staging` (not Pages — account quota).

Full deploy guide: [setup/DEPLOYMENT.md](./setup/DEPLOYMENT.md).

| Trigger | What deploys |
|---------|--------------|
| Push to `develop` | API + MCP Workers |
| `workflow_dispatch` + **Deploy frontend** | OpenNext build → `landi-flow-staging` |

**Rollback:** `npx wrangler deployments list` then `npx wrangler rollback [VERSION_ID]` in `workers/api`, `workers/mcp`, or `frontend`.

## API usage

Base path: `/api/v1` on the API Worker. Frontend proxies via `FLOW_API_URL`.

```bash
# Health (no auth)
curl https://landi-flow-api.mikehenken.workers.dev/api/v1/health

# Authenticated routes — Supabase JWT or API key
curl -H "Authorization: Bearer <jwt>" \
  https://landi-flow-api.mikehenken.workers.dev/api/v1/workspaces
```

Core resource groups: workspaces/teams, stories (`/issues` alias), epics/milestones, cycles/views, comments, agents, credentials, webhooks, billing.

Full catalogue: study `api-design.md`.

## MCP usage

Endpoint: `POST https://landi-flow-mcp.mikehenken.workers.dev/mcp` (Streamable HTTP JSON-RPC).

**Auth:** Issue a personal key via `POST /api/mcp/keys` with Supabase JWT, or use OAuth (`/.well-known/oauth-*`). Keys are `lcf_sk_*` (personal) or `lcf_at_*` (OAuth).

**Cursor config** (token in env, not committed):

```json
{
  "mcpServers": {
    "landi-flow-staging": {
      "transport": "http",
      "url": "https://landi-flow-mcp.mikehenken.workers.dev/mcp",
      "headers": { "Authorization": "Bearer ${env:LANDI_FLOW_MCP_TOKEN}" }
    }
  }
}
```

22 tools: `story.*`, `epic.*`, `comment.*`, `agent.list`, `collab.*`, `ai.draft_story`, etc. Cursor exposes dot names as underscores; the worker accepts both.

Details: [setup/cursor-mcp.md](./setup/cursor-mcp.md), [setup/mcp-oauth-linear-clone-schema.md](./setup/mcp-oauth-linear-clone-schema.md).

## Extension authoring

Extensions live under the marketplace module (Phase 09e). Pattern:

1. Register extension manifest in `linear_clone.extensions` (workspace-scoped).
2. Implement webhook handlers or UI slots consumed by the frontend shell.
3. Scope credentials via MCP/API key scopes (`extensions:read`, `extensions:write`).

Reference implementation: `landi-store-extension` (first Ecosystem Registry extension). Study spec: `research-extensions-marketplace.md`.

Local dev: mock auth (`NEXT_PUBLIC_MOCK_AUTH=true`) for UI iteration; staging requires real Supabase auth.

## Design system & Storybook

Shared UI: `packages/ui` (`@landi-flow/ui`), shadcn/ui + Tailwind tokens from study `shared-design-system.md`.

```bash
pnpm storybook              # http://localhost:6006
pnpm build-storybook        # static export
pnpm test:storybook         # Playwright visual + i18n + interaction tests
```

Stories live alongside components (`*.stories.tsx`). Addons: essentials, themes, a11y, interactions.

Page preview index (Phase 09r): study `storybook-preview-index.md`.

## Theming & white-label

Workspace themes override CSS custom properties (`--brand-primary`, `--surface`, logo URL) injected by `WorkspaceThemeProvider`. Payload shape in study `theming-whitelabel-spec.md`.

Settings → Workspace → Branding in the app. Tokens must use logical properties (`ms-*`, `me-*`) for RTL compatibility.

## i18n

`next-intl` with segment locales (`/en/`, `/es/`, …). Translation namespaces: `epics.json`, `stories.json`, `auth.json`, etc.

**OpenNext staging note:** `NEXT_PRIVATE_MINIMAL_MODE=1` disables middleware; locale paths must include the prefix (e.g. `/en/dashboard`). Spec: study `i18n-spec.md`.

## Liveblocks collaboration

Real-time presence, co-editing, and board drag-and-drop via Liveblocks. Supabase remains source of truth; Liveblocks is ephemeral projection.

| Concern | Key names |
|---------|-----------|
| Client bundle | `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` |
| Auth route / Workers | `LIVEBLOCKS_SECRET_KEY` |
| Webhooks | `LIVEBLOCKS_WEBHOOK_SECRET` |

Room mapping (Epic/Story/Board rooms): study `liveblocks-room-mapping.md`, `collaboration-architecture.md`.

Auth endpoint: frontend `/api/liveblocks-auth` (requires `LIVEBLOCKS_SECRET_KEY` on the Worker).

## Environment variables

All key names are in repo-root `.env.example`. Grouped summary:

| Group | Keys |
|-------|------|
| Site | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_ROOT_DOMAIN` |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` |
| Auth (dev) | `NEXT_PUBLIC_BYPASS_EMAIL_CONFIRMATION`, `NEXT_PUBLIC_MOCK_AUTH` |
| Cloudflare | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_GATEWAY_*` |
| AI | `GEMINI_API_KEY`, `VERTEX_API_KEY`, `DEFAULT_GEMINI_MODEL`, `FLOW_AI_FAKE` |
| Liveblocks | `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`, `LIVEBLOCKS_SECRET_KEY`, `LIVEBLOCKS_WEBHOOK_SECRET` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO_MONTHLY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| API proxy | `FLOW_API_URL`, `NEXT_PUBLIC_API_URL`, `MCP_WORKER_URL`, `MCP_WORKER_TOKEN` |
| MCP OAuth | `MCP_OAUTH_ISSUER`, `MCP_RESOURCE_URI`, `MCP_CREDENTIAL_PEPPER` |
| Observability | `OBS_ERROR_SINK_URL`, `OBS_ENABLE_CLIENT_REPORTING` |

Worker runtime secrets are set via `wrangler secret put` — see [setup/DEPLOYMENT.md](./setup/DEPLOYMENT.md).

## Architecture

Event-driven modular monolith. Client: singleton pub/sub stores (`frontend/src/stores/*`). Server: transactional outbox → Cloudflare Queues → consumers.

Pointers: [architecture/README.md](./architecture/README.md).
