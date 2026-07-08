# Chain of Thought — task-09k (iteration 1)

## Framing
Task-09k = "agents as first-class assignees". Much of the substrate already existed:
- `agents` table (0007) with `assignable`/`mentionable`/`billable`/`mcp_enabled`.
- `stories.delegate_agent_id` (0008) — agent delegate on Stories.
- `execute_agent_mutation` Action Bus + `ensure_mcp_agent` (0021, task-09d).
- `agent.list` MCP tool + frontend agent roster (task-09g).

## Gaps identified (what "first-class assignee" actually needs)
1. **Epics could not take an agent.** They had `lead_id` (human) but no
   `delegate_agent_id`. → add column + `assign_epic` op + `epic.assign` tool.
2. **No unified member list.** Humans (workspace_members) and agents (agents) were
   separate. A first-class assignee must appear in ONE roster. → `list_assignable_members`
   RPC + `members.list` tool + frontend `WORKSPACE_MEMBERS`.
3. **No assignee UI that mixes humans + agents.** Story inspector showed a raw
   `delegate_agent_id` string. → `AssigneePicker` in `@landi-flow/ui`.
4. **Assignment wasn't demonstrably an Action Bus act.** `story.assign` used `update_story`
   (COALESCE, can't unassign) and nothing "acted". → dedicated `assign_story`/`assign_epic`
   ops with null-clear semantics + an assign→act orchestration route.

## Key decisions
- **Tri-state assignment** (`p_params ? 'key'`): present→apply (incl. null), absent→leave.
  COALESCE can't express "set to null", which first-class assign/unassign requires.
- **Additive `CREATE OR REPLACE` of `execute_agent_mutation`**: copy 0021 verbatim, add two
  inline branches. Avoids duplicating the 400-line `execute_mutation_with_outbox`.
- **Agent = Epic delegate via `assign_epic` only** (not `update_epic`): keeps clean
  assignment semantics without rewriting the giant entity-mutation function.
- **`AssignableMember` structurally = `PickerMember`**: the UI package stays decoupled from
  `@landi-flow/core` (defines its own `PickerMember`); the frontend passes core rows directly.
- **Assign → act**: on agent assignment, dispatch `comment.create` + `signal.attach` via the
  Action Bus so the agent behaves like a just-assigned developer (satisfies the AC concretely).
- **Mock fallback**: no MCP worker in dev → mock-apply, so the whole flow is demonstrable.

## Verification strategy
`pnpm -r typecheck` + `pnpm -r lint` + `pnpm build-storybook`. No live DB/worker here
(same constraint as task-09d/09g), so DB apply + E2E are Phase-11 handoffs.
