# task-09ac-views-engine-completion — iteration 0

## Scope

CAP-020,021,029,030 — column prefs, quick-add, saved views index, sharing.

## Implementation

| CAP | Component |
|-----|-----------|
| CAP-020 | `board-column-preferences.ts`, `BoardColumnControls` |
| CAP-021 | Column header quick-add + toolbar quick-add |
| CAP-029 | `/workspace/views`, `SavedViewsIndex` |
| CAP-030 | Share toggle on saved views |

## Files

- `frontend/src/lib/views/saved-views-store.ts`
- `frontend/src/lib/views/board-column-preferences.ts`
- `frontend/src/components/views/*`
- `frontend/src/app/[locale]/workspace/views/page.tsx`
- Board wiring: `stories/board/page.tsx`, `board-columns-grid.tsx`

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- views-engine-completion.spec.ts
```
