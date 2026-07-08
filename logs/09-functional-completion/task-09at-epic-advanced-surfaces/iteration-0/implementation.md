# task-09at-epic-advanced-surfaces — iteration 0

## Scope

CAP-045, CAP-046, CAP-047 — Epic Customers, attached views, multi-team sub-tabs.

## Implementation

| Surface | File |
|---------|------|
| EpicCustomersTab, EpicTeamSubTabs | `frontend/src/components/epics/epic-advanced-tabs.tsx` |
| EpicAttachedViewsTab | `frontend/src/components/epics/epic-attached-views-tab.tsx` |
| Epic detail tabs | `frontend/src/app/[locale]/workspace/epics/[epicId]/page.tsx` |
| Store | `frontend/src/lib/epic-surfaces/epic-surfaces-store.ts` |

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- epic-advanced-surfaces.spec.ts
```
