# task-09au-initiatives-pulse-roadmap — iteration 0

## Scope

CAP-056, CAP-058–065 — Initiatives, Pulse feed, roadmap timeline.

## Implementation

| Surface | File |
|---------|------|
| Initiatives routes | `frontend/src/app/[locale]/workspace/initiatives/` |
| Pulse route | `frontend/src/app/[locale]/workspace/pulse/page.tsx` |
| Roadmap route | `frontend/src/app/[locale]/workspace/roadmap/page.tsx` |
| Panels + stores | `frontend/src/components/initiatives/`, `pulse/`, `roadmap/` |
| Sidebar nav | `frontend/src/components/app-shell.tsx` |

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- initiatives-pulse-roadmap.spec.ts
```
