# Execution Log — task-09k (iteration 1)

Repo: `landi-flow` @ `feature/task-09g-dev-ai-agent-ui`. Implementer: ai-engineer.

## Investigation
- Read prior reports: task-09d (MCP/Action Bus), task-09g (agent UI), task-09a (frontend).
- Read schema: 0007 agents, 0008 stories, 0004 epics, 0010 agent_sessions,
  0017 transactional mutations, 0021 agent MCP mutations, 0002 identity, 0011 outbox,
  0012 rls helpers.
- Read code: MCP `tools.ts` / `mutations.ts` / `scopes.ts`; core `types` / `topics`;
  frontend `agent-roster`, `seed-data`, `story-inspector`, `story-store`, `epic-store`,
  UI `index.ts` / `avatar.tsx` / `command-palette.tsx`; agent-chat `apply.ts` / `mcp-catalogue.ts`.

## Changes
1. **DB** `supabase/migrations/0025_agents_first_class_assignees.sql` (new):
   `epics.delegate_agent_id` + index; `assign_story`/`assign_epic` ops added to
   `execute_agent_mutation`; `list_assignable_members` RPC (+ SECURITY DEFINER wrapper).
2. **Core** `packages/core/src/types/index.ts`: `Epic.delegate_agent_id`, `Agent`,
   `AssignableMember`, `MemberKind`, `MemberPresence`. `events/topics.ts`:
   `STORY_ASSIGNED`, `EPIC_ASSIGNED`.
3. **MCP worker** `workers/mcp/src/mcp/mutations.ts`: `assignStory`, `assignEpic`,
   `listMembers`, enriched `listAgents`. `tools.ts`: rewired `story.assign`, new
   `epic.assign`, new `members.list`.
4. **UI** `packages/ui/src/components/members/{assignee-picker.tsx,index.ts,assignee-picker.stories.tsx}`;
   exported from `packages/ui/src/index.ts`.
5. **Frontend** `lib/workspace-members.ts` (new); `stores/story-store.ts` + `epic-store.ts`
   (`assignStory`/`assignEpic`); `components/story-inspector.tsx` (AssigneePicker in Story +
   Epic inspectors); `lib/agents/{mcp-dispatch,assign-agent,assign-client}.ts` (new);
   `app/api/agents/assign/route.ts` (new); `seed-data.ts` (epic delegate); agent-chat
   `mcp-catalogue.ts` (assign/members tools).
6. **Fix (additive)** `frontend/src/hooks/use-localized-date-time.ts`: bridge DOM Intl
   option types to next-intl parameter types (pre-existing untracked error).

## Verification runs
- `pnpm -r typecheck` → initial fail (2 strict-index errors in my picker + 2 in stories) →
  fixed → then 1 pre-existing frontend error in untracked date hook → fixed → **exit 0** (7/7).
- `pnpm -r lint` → **exit 0** (`next lint`: no ESLint warnings or errors).
- `pnpm build-storybook` → **exit 0** (~18s; `Members/AssigneePicker` stories compiled).
- `pnpm run verify:rls-gate` → fails (pre-existing: TS annotations in a `.mjs`). Not in scope;
  migration adds no tables and preserves RLS/GRANT posture.

## Not run (no live infra; Phase-11)
- `supabase` migration apply; assign→act E2E against a live MCP worker; full `next build`.
