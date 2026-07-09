# Landi Flow

Open-source, Linear-class product development system — **easier than Linear**, with instant markdown editing and native human + AI parallel collaboration.

**Brand:** Landi Flow  
**Study:** [STUDY-013](https://github.com/mikehenken/landi-labs/tree/main/studies/Orchestration/linear-clone-product-lifecycle) (Linear clone product lifecycle)  
**Repository:** https://github.com/mikehenken/landi-flow

## Staging

| Surface | URL |
|---------|-----|
| **App** | https://landi-flow-staging.mikehenken.workers.dev |
| **API** | https://landi-flow-api.mikehenken.workers.dev |
| **MCP** | https://landi-flow-mcp.mikehenken.workers.dev |

Health: API `GET /api/v1/health` → 200; MCP `GET /` → 200; frontend `GET /en/auth/login` → 200 (verified 2026-07-09).

## Nomenclature (HITM)

| Term | Meaning |
|------|---------|
| **Workspace** | Top-level tenant |
| **Team** | Scoped group within a workspace |
| **Epic** | Strategic container of work (**never** "Project") |
| **Story** | Atomic unit of work (UI term; `/issues` REST alias for Linear compat) |
| **Milestone** | First-class milestone inside an Epic |
| **Cycle** | Team-scoped sprint container |

## Architecture

Modular monolith: **Next.js 15** (frontend) + **Cloudflare Workers** (API, MCP, outbox poller) + **Supabase** (`linear_clone` schema, RLS-first).

Event-driven **controllers/models** pattern (reference: `landi-store-extension`):

- **Client tier:** singleton pub/sub domain stores (`storyStore`, `epicStore`, …) bridged via `useSyncExternalStore`
- **Server tier:** transactional outbox in Supabase Postgres + fair poller → Cloudflare Queues → consumers

See [docs/architecture/](./docs/architecture/) and the [study architecture document](https://github.com/mikehenken/landi-labs/tree/main/studies/Orchestration/linear-clone-product-lifecycle).

## Repository layout

```
landi-flow/
├── frontend/           # Next.js 15 app (OpenNext → Worker staging)
├── workers/
│   ├── api/            # REST + inbound webhooks + outbox poller
│   └── mcp/            # Streamable HTTP MCP (MCP-IDE-001/002/003)
├── packages/
│   ├── core/           # Shared event topics, types, contracts
│   └── ui/             # shadcn/ui design system + Storybook
├── supabase/migrations # linear_clone DDL
├── public/assets/      # Brand assets (logos, OG, marketing)
└── docs/               # Developer guide, deployment, MCP setup
```

## Getting started

```bash
pnpm install
cp .env.example .env.local
# Populate .env.local from your secret store (key names only in .env.example)

pnpm dev          # auto-picks :3000, then :3100, then :3200 if busy
pnpm dev:alt      # explicit :3100
pnpm storybook    # design system on :6006
pnpm mcp:dev      # MCP worker on :8787
```

**Port changes:** set `PORT` or use `dev:alt` — do **not** edit `NEXT_PUBLIC_SITE_URL` in `.env.local`. The dev launcher pins site URL to the bound port.

Full guide: [docs/README.md](./docs/README.md).

## API & MCP

- **REST:** `https://landi-flow-api.mikehenken.workers.dev/api/v1/*` — JWT or API key auth
- **MCP:** `https://landi-flow-mcp.mikehenken.workers.dev/mcp` — Streamable HTTP, 22 tools
- **Local MCP:** [docs/setup/cursor-mcp.md](./docs/setup/cursor-mcp.md)

## Deployment

Cloudflare Workers + OpenNext for frontend staging. CI deploys API/MCP on `develop` push; frontend via manual workflow dispatch.

[docs/setup/DEPLOYMENT.md](./docs/setup/DEPLOYMENT.md)

## Environment

All secrets referenced **by key name only** in `.env.example`. Never commit `.env.local`.

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production releases; protected — PR + review required |
| `develop` | Integration branch for feature work |

Feature branches: `feature/<slug>` → PR into `develop`.

## License

MIT — see LICENSE (to be added in Phase 09).
