# task-09af-cycles-sprint-engine — iteration 0

## Scope

CAP-061,062 — team cycles CRUD + automation settings.

## Implementation

| CAP | Surface |
|-----|---------|
| CAP-061 | `CyclesPanel`, cycle CRUD localStorage |
| CAP-062 | Automation toggles + run-now job timestamp |

## Files

- `frontend/src/lib/cycles/cycle-store.ts`
- `frontend/src/components/cycles/cycles-panel.tsx`
- `frontend/src/app/[locale]/workspace/settings/cycles/page.tsx`
- Seed: `DEMO_CYCLES`

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- cycles-sprint-engine.spec.ts
```
