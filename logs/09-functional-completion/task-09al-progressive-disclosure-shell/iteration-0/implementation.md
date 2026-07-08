# task-09al-progressive-disclosure-shell — iteration 0

## Scope

IDEA-001 — View options drawer with progressive disclosure on Stories list/board.

## Implementation

| Surface | File |
|---------|------|
| ViewOptionsDrawer | `frontend/src/components/views/view-options-drawer.tsx` |
| Stories toolbar trigger | `frontend/src/components/stories-view-provider.tsx` |

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- progressive-disclosure-shell.spec.ts
```
