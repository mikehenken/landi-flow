# task-09l iteration 1 — chain of thought

## Problem

Agent Console implied Cursor/Claude were live-connected remote agents. Demo hardcoded IDs bypassed `list_assignable_members` and `ensure_mcp_agent`.

## Approach

- Treat runtime as metadata on `agents` rows, not identity.
- Seed built-in Landi Flow Agent per workspace with deterministic UUID.
- Single roster source: RPC → API → React context; mock isolated to `NEXT_PUBLIC_MOCK_AUTH=true`.
- Preserve Action Bus / Handoff Queue — triage proposes only (`p_auto_apply=false`).

## Risks accepted

- Demo workspace id (`ws-landi-flow-demo`) is not a UUID; production RPC requires real workspace UUIDs. Mock auth path covers local HITM.
- Workspace-create trigger may no-op if no member exists yet; backfill loop handles existing workspaces.
