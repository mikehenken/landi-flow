# Architecture pointers

Authoritative design artifacts live in the STUDY-013 study repo:

- `architecture-document.md` — modular monolith, event-driven substrate, OBS-001
- `database-schema.md` — `linear_clone` DDL (Epic not Project)
- `api-design.md` — REST + MCP catalogue
- `shared-design-system.md` — shadcn/ui tokens, HITM nomenclature
- `collaboration-architecture.md` — Liveblocks room mapping

## Event-driven pattern

| Tier | Reference | Clone implementation |
|------|-----------|------------------------|
| Client stores | `landi-store-extension/packages/core/src/state/cart-state.ts` | `frontend/src/stores/*` |
| Server outbox | `landi-store-extension/packages/api/src/lib/outbox-emitter.ts` | `workers/api/src/controllers/story-controller.ts` + Supabase `linear_clone.outbox_events` |

## Modules

- `core-pm` — Stories, Epics, Milestones, Cycles, Comments
- `auth-rbac` — Workspaces, teams, RLS
- `mcp` — MCP-IDE-001/002/003, agent_action_outbox
- `webhooks`, `billing`, `marketplace` — Phase 09+
