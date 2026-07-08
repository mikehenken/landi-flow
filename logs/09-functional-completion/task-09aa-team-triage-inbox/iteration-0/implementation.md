# task-09aa-team-triage-inbox — iteration 0

## Scope

CAP-016 — team-scoped triage inbox with accept/decline persistence.

## Implementation

| CAP | Route / component |
|-----|-------------------|
| CAP-016 | `/workspace/team/[teamId]/triage`, `TriageInboxPanel`, `triage-store.ts` |

## Files

- `frontend/src/lib/triage/triage-store.ts`
- `frontend/src/components/triage/triage-inbox-panel.tsx`
- `frontend/src/app/[locale]/workspace/team/[teamId]/triage/page.tsx`
- Seed: `story-triage-001`, `story-triage-002`, `WORKFLOW_STATES.triage`

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- team-triage-inbox.spec.ts
```
