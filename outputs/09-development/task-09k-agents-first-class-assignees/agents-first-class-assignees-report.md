# Agents as First-Class Assignees — Implementation Report (task-09k, iteration 1)

**Study:** STUDY-013 · Linear-clone product lifecycle · **Phase:** 09 (Development)
**Task:** task-09k `dev-agents-first-class-assignees`
**Implementer:** ai-engineer · **Repo:** `landi-flow` @ `feature/task-09g-dev-ai-agent-ui`
**Date:** 2026-07-04 · **Review:** self-review only (no independent review per brief)

---

## 1. Objective

Make AI agents **first-class assignees**: a connected agent (via the task-09d MCP
credential system) is an assignable/mentionable workspace **member**, listed alongside
humans, and can be **assigned to Stories AND Epics** exactly like a human developer.
Acceptance: assign an agent to a Story and have it **act via the MCP Agent Action Bus**.
HITM nomenclature — **Epic**, never Project.

This is real, compiling, lint-clean code. `pnpm -r typecheck` ✅, `pnpm -r lint` ✅,
`pnpm build-storybook` ✅ (new `Members/AssigneePicker` stories render).

## 2. Requirement → deliverable traceability

| # | Requirement | Delivered | Evidence |
|---|-------------|-----------|----------|
| 1 | Agents assignable to Stories **and Epics** like humans | Stories already had `delegate_agent_id`; Epics now do too. New `assign_story` / `assign_epic` Action Bus ops set/clear human owner + agent delegate | `supabase/migrations/0025_agents_first_class_assignees.sql` |
| 2 | Agents connected via the **MCP credential system** (task-09d) | Assignment routes through the same `execute_agent_mutation` Action Bus; `members.list` / `list_assignable_members` surface agents provisioned by `ensure_mcp_agent` | `workers/mcp/src/mcp/{tools,mutations}.ts`, migration `0025` |
| 3 | Agents appear as **members/assignees alongside humans** | One unified roster (`list_assignable_members` RPC → `members.list` tool → frontend `WORKSPACE_MEMBERS`) with `kind: 'human' \| 'agent'`; `AssigneePicker` lists both in one dropdown | `packages/ui/.../members/assignee-picker.tsx`, `frontend/src/lib/workspace-members.ts` |
| 4 | **Acceptance:** assign agent to a Story and have it act via the Action Bus | `/api/agents/assign` → `story.assign`/`epic.assign` (governed write) → assigned agent posts a pick-up comment + "started" signal, all through the Action Bus | `frontend/src/lib/agents/{assign-agent,mcp-dispatch}.ts`, `frontend/src/app/api/agents/assign/route.ts` |
| 5 | **Epic** not Project | Every schema/tool/label uses Epic/Story; "Project" appears nowhere | tools, UI copy, migration comments |

## 3. What was built

### 3.1 Database — `supabase/migrations/0025_agents_first_class_assignees.sql`

- **`epics.delegate_agent_id`** (FK → `agents`, partial index) — an agent can be assigned
  to an Epic like a human `lead_id`. Stories already had `delegate_agent_id` (0008).
- **`assign_story` / `assign_epic` Action Bus ops** — added additively to
  `execute_agent_mutation` (every prior op preserved). Tri-state semantics: a key present
  in the params applies (including an explicit `null` to **unassign**), absent leaves the
  field unchanged. COALESCE-based update paths cannot unassign; first-class assignment
  must be able to clear a slot, so these ops use `p_params ? 'key'` presence checks.
- **`list_assignable_members(workspace_id)`** — one roster of active human members
  (`workspace_members` + `profiles`) **UNION** assignable agents, in one shape
  (`kind`, `id`, `name`, `avatar_url`, `assignable`, `mentionable`, `presence`,
  `subtitle`). SECURITY DEFINER wrapper enforces workspace membership; internal reader
  granted to `service_role`.

### 3.2 Core types — `packages/core/src/types/index.ts`

- `Epic.delegate_agent_id: string | null`
- New `Agent`, `AssignableMember`, `MemberKind`, `MemberPresence` types.
- New topics `entity.story.assigned` / `entity.epic.assigned` (`events/topics.ts`).

### 3.3 MCP worker — `workers/mcp/src/mcp/`

- `tools.ts`: rewired **`story.assign`** to the new op (adds `unassign_assignee` /
  `unassign_agent`); added **`epic.assign`** (`lead_id` / `delegate_agent_id` /
  `unassign_lead` / `unassign_agent`); added **`members.list`** (unified roster).
- `mutations.ts`: `assignStory` / `assignEpic` (tri-state, Action Bus) and `listMembers`
  (via `list_assignable_members` RPC); `listAgents` enriched with `icon_url` / `billable`.
- Scopes reused: `stories:write` / `epics:write` + `app:assignable`.

### 3.4 Design system — `packages/ui/src/components/members/`

- **`AssigneePicker`** — the differentiator UI: one searchable dropdown (`cmdk`) listing
  **People** and **Agents** groups together. Selecting a human fills the assignee/lead
  slot; selecting an agent fills the delegate slot; both can be set (human owns, agent
  acts). `humanLabel` prop reuses it for Stories ("Assignee") and Epics ("Lead").
- **`MemberAvatar` / `MemberChip`** — honor the brand language (human = circle, agent =
  squircle with an active pulse; a `Bot` marker on agents). Exported from `@landi-flow/ui`.
- Storybook: `Members/AssigneePicker` (Unassigned, HumanAssignee, AgentDelegate,
  HumanOwnsAgentActs, EpicLead, Chips).

### 3.5 Frontend — `frontend/src/`

- `lib/workspace-members.ts` — unified `WORKSPACE_MEMBERS: AssignableMember[]` (humans +
  agents merged), plus `getMemberById` / `getHumanName` / `getAgentName`. In production
  this is replaced by `list_assignable_members`, which returns the identical shape.
- `components/story-inspector.tsx` — both the **Story** and **Epic** inspectors now render
  `AssigneePicker`. Selecting a member updates the store optimistically **and** calls
  `/api/agents/assign`; when an agent is chosen an inline status shows it acting via the
  Action Bus.
- `stores/story-store.ts` + `stores/epic-store.ts` — `assignStory` / `assignEpic`
  (tri-state optimistic updates mirroring the DB ops).
- `lib/agents/{mcp-dispatch,assign-agent,assign-client}.ts` + `app/api/agents/assign/route.ts`
  — the acceptance flow: assignment is a governed Action Bus write; the assigned agent then
  **acts** (pick-up comment + started signal), all `tools/call` → MCP worker Action Bus.
  Mock-applies without a worker so the flow is demonstrable in dev.
- `seed-data.ts` — Epics carry `delegate_agent_id`; `epic-002` seeded with `agent-triage`
  as a first-class agent delegate.
- `lib/agent-chat/server/mcp-catalogue.ts` — added `story.assign` / `epic.assign` /
  `members.list` so the AI chat surface (task-09g) can assign members through the Handoff
  Queue too.

## 4. The acceptance flow (assign → act via Action Bus)

```
User picks "Cursor Agent" in the Story inspector AssigneePicker
        │  optimistic store update (agent shown as assignee)
        ▼
POST /api/agents/assign { entity:'story', entityId, delegateAgentId }
        │
        ▼  dispatchMcpTool('story.assign', …)           ← Action Bus governed write
   MCP worker  ─ execute_agent_mutation('assign_story') ─ proposal → apply (audited)
        │
        ▼  agent ACTS as a freshly-assigned member:
   dispatchMcpTool('comment.create', "👋 Picking up LAN-2…")   ← Action Bus
   dispatchMcpTool('signal.attach',  { status:'started' })     ← Action Bus
```

Every write is recorded in `agent_action_outbox` (proposed) before any entity DML, then
applied atomically — the single-writer, fully-audited path from task-09d.

## 5. Verification

| Gate | Command | Result |
|------|---------|--------|
| Types (all 7 buildable projects) | `pnpm -r typecheck` | ✅ exit 0 |
| Lint | `pnpm -r lint` (`next lint` + `tsc`) | ✅ no warnings/errors |
| Storybook build (renders AssigneePicker stories) | `pnpm build-storybook` | ✅ built in ~18s |

**Additive fix (no feature removed):** an untracked, concurrently-added file
`frontend/src/hooks/use-localized-date-time.ts` had a pre-existing type error (DOM
`Intl.*Options` vs next-intl's narrower option types) that failed the frontend
typecheck. Bridged with localized casts to the formatter's parameter types — additive,
unblocks the gate; the hook keeps its full behavior and ergonomic DOM-typed API.

## 6. Security & governance invariants (honored)

1. **All assignment writes flow through the Action Bus** — `assign_story`/`assign_epic`
   record a proposal in `agent_action_outbox` before DML; auto-applied non-destructive
   writes are audited; the Handoff-Queue seam (`p_auto_apply=false`) is preserved.
2. **Least privilege** — assign tools require `…:write` + `app:assignable`; read-only
   credentials can never invoke them (tool-layer gate from task-09d).
3. **Roster RPC is workspace-scoped** — `list_assignable_members` REVOKEd from PUBLIC,
   GRANTed to `authenticated` (membership-checked) and `service_role`.
4. **Secrets by name only** — the frontend calls MCP by `MCP_WORKER_URL` /
   `MCP_WORKER_TOKEN` (names); no value is printed or committed.
5. **HITM nomenclature** — Epic/Story only; "Project" never appears.

## 7. Residual risks / Phase-11 handoffs

- **Live DB apply + E2E not run** (no Postgres/worker in this environment): apply `0025`
  against Supabase local and exercise assign→act end-to-end (assign agent → Action Bus →
  comment + signal rows) plus the unassign (null-clear) paths. Same posture as task-09d.
- **`scripts/verify-rls-gate.mjs` is broken** (pre-existing: TypeScript annotations in a
  `.mjs`, same class of bug as task-09a's sync script). Not touched here; my migration
  adds no tables and preserves RLS/GRANT posture. Recommend fixing the script separately.
- **Presence is coarse** — `list_assignable_members` derives agent presence from
  `mcp_enabled`; live presence (working/idle) is a task-04d runtime concern.
- **`update_epic` does not set `delegate_agent_id`** — Epic delegate is managed via the
  dedicated `epic.assign` op (clean assignment semantics); creating-then-assigning is the
  path for setting an agent at Epic birth.
- **Concurrent development** on this branch (editor/collaboration packages); re-run the
  full typecheck/lint after all Phase-09 branches merge.

---

*End of report — task-09k-agents-first-class-assignees iteration 1.*
