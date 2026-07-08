# task-09ad-navigation-completeness — iteration 0

## Scope

CAP-036-040 — My Issues tabs, workspace switcher, command palette actions, G-key hints.

## Implementation

| CAP | Surface |
|-----|---------|
| CAP-036 | `/workspace/my-issues`, four tabs |
| CAP-037 | `WorkspaceSwitcher` + cookie reload |
| CAP-039 | Command palette goto actions |
| CAP-040 | G-key sidebar hints + `?` overlay |

## Files

- `frontend/src/lib/navigation/my-issues-queries.ts`
- `frontend/src/components/navigation/*`
- `frontend/src/app/[locale]/workspace/my-issues/page.tsx`
- `frontend/src/components/app-shell.tsx` (sidebar + palette)

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- navigation-completeness.spec.ts
```
