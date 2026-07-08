# Self-Review — task-09k (iteration 1)

No independent review per task brief. Scored against the 5 stated requirements.

## Requirement checklist

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Agents assignable to Stories **and Epics** like humans | ✅ | Stories had it; added `epics.delegate_agent_id` + `assign_story`/`assign_epic` ops with set **and** unassign (null-clear). |
| 2 | User's OWN agents via MCP credential system (task-09d) | ✅ | Assignment uses the same `execute_agent_mutation` Action Bus; roster surfaces agents from `ensure_mcp_agent`. No new credential plane invented. |
| 3 | Agents appear as members/assignees alongside humans | ✅ | Unified `list_assignable_members` RPC + `members.list` tool + `AssigneePicker` (People + Agents in one dropdown). |
| 4 | Assign agent to Story → it acts via MCP Action Bus | ✅ | `/api/agents/assign` → `story.assign` (Action Bus) → agent posts pick-up comment + started signal (Action Bus). Mock fallback in dev. |
| 5 | Epic not Project | ✅ | Epic/Story everywhere; grepped my new code — no "Project" noun. |

## Quality gates
- `pnpm -r typecheck` ✅ (7/7) · `pnpm -r lint` ✅ · `pnpm build-storybook` ✅.
- Production TS: explicit types, no `any` in new code; tri-state uses `in`/`?` presence
  checks rather than truthiness (so `null` is honored). Null-safety on member lookups.
- No feature removed: the old inline `delegate_agent_id` text row was replaced with a
  richer picker that still shows the delegate (and more); the date-hook fix is additive.

## Strengths
- Reuses the existing Action Bus / credential substrate rather than duplicating it — the
  assignment and the agent's subsequent actions share one audited write path.
- One roster shape end-to-end (DB RPC ⇄ MCP tool ⇄ UI), so "agents alongside humans" is
  structural, not cosmetic.
- Reusable `AssigneePicker` (Story assignee + Epic lead) with brand-correct human/agent avatars.

## Weaknesses / gaps (see gap-status.txt)
- No live DB apply or E2E in this environment (Phase-11).
- `verify:rls-gate` script is pre-existing-broken; couldn't execute the automated gate
  (manual reasoning: no new tables, proper REVOKE/GRANT).
- Agent presence in the roster is coarse (derived from `mcp_enabled`).

## Verdict
Meets all five acceptance requirements with compiling, lint-clean, gated code. Confidence
**0.90**; residual risk is entirely "unverified against live infra", consistent with the
no-live-infra constraint documented for task-09d/09g.
