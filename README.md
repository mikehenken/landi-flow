# Landi Flow

Open-source, Linear-class product development system — **easier than Linear**, with instant markdown editing and native human + AI parallel collaboration.

**Brand:** Landi Flow  
**Study:** [STUDY-013](https://github.com/mikehenken/landi-labs) (Linear clone product lifecycle)  
**Repository:** https://github.com/mikehenken/landi-flow

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

Modular monolith: **Next.js 16** (frontend) + **Cloudflare Workers** (API, MCP, outbox poller) + **Supabase** (`linear_clone` schema, RLS-first).

Event-driven **controllers/models** pattern (reference: `landi-store-extension`):

- **Client tier:** singleton pub/sub domain stores (`storyStore`, `epicStore`, …) bridged via `useSyncExternalStore`
- **Server tier:** transactional outbox in Supabase Postgres + fair poller → Cloudflare Queues → consumers

See `docs/architecture/` and the [architecture document](https://github.com/mikehenken/landi-labs/tree/main/studies/Orchestration/linear-clone-product-lifecycle) in the study repo.

## Repository layout

```
landi-flow/
├── frontend/           # Next.js 16 app (shadcn/ui, domain stores)
├── workers/
│   ├── api/            # REST + inbound webhooks + outbox poller
│   └── mcp/            # Streamable HTTP MCP (MCP-IDE-001/002/003)
├── packages/core/      # Shared event topics, types, contracts
├── supabase/migrations # linear_clone DDL
├── public/assets/      # Brand assets (logos, OG, marketing)
└── docs/
```

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production releases; protected — PR + review required |
| `develop` | Integration branch for feature work |

Feature branches: `feature/<slug>` → PR into `develop`. Release branches: `release/<version>` → PR into `main` and back-merge to `develop`.

**Branch protection (recommended):** enable on `main` and `develop` — require PR reviews, status checks (lint, typecheck, RLS CI gate), no force-push, signed commits optional.

## Getting started

```bash
pnpm install
cp .env.example .env.local
# Populate .env.local with values from your secret store (key names only in .env.example)

pnpm dev
```

## Environment

All secrets are referenced **by key name only** in `.env.example`. Never commit `.env.local` or paste secret values into issues, logs, or docs.

## License

MIT — see LICENSE (to be added in Phase 09).
