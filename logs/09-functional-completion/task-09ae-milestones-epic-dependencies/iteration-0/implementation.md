# task-09ae-milestones-epic-dependencies — iteration 0

## Scope

CAP-050-055,054 — milestones CRUD, story assign, reorder, % complete, convert, epic dependencies.

## Implementation

| CAP | Component |
|-----|-----------|
| CAP-050–053 | `EpicMilestonesPanel`, `milestone-store.ts` |
| CAP-051 | `StoryMilestonePicker` |
| CAP-054 | Milestone → epic convert |
| CAP-055 | `EpicDependenciesPanel` |

## Files

- `frontend/src/lib/milestones/*`
- `frontend/src/components/milestones/*`
- `frontend/src/components/epic-detail-sidebar.tsx`
- `frontend/src/app/[locale]/workspace/epics/[epicId]/page.tsx`
- Seed: `SEED_MILESTONES`

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- milestones-epic-dependencies.spec.ts
```
