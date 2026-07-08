# task-09as-recurring-stories-team-automation — iteration 0

## Scope

CAP-010 — Recurring story spawn rules in team settings.

## Implementation

| Surface | File |
|---------|------|
| RecurringStoriesPanel | `frontend/src/components/recurring-stories/recurring-stories-panel.tsx` |
| Settings route | `frontend/src/app/[locale]/workspace/settings/recurring-stories/page.tsx` |
| Store | `frontend/src/lib/recurring-stories/recurring-stories-store.ts` |

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- recurring-stories-team-automation.spec.ts
```
