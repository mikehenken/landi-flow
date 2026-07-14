# task-09w-dedupe-view-copy — iteration 0

## Scope

Remove duplicate metadata blocks across list/detail/epic views (HITM point 15).

## Implementation

- `frontend/src/lib/route-matchers.ts` — `isEpicDetailRoute()` helper
- `frontend/src/components/app-shell.tsx` — hide `EpicInspector` sidebar on epic detail routes (page owns sidebar)
- `frontend/src/components/epic-detail-sidebar.tsx` — `EpicOverviewPanel` shows status chip only (no duplicate epic name `h2`; AppShell `viewTitle` is canonical)
- `frontend/e2e/dedupe-view-copy.spec.ts` — asserts zero `h2` in overview panel

## Acceptance mapping

| Criterion | Evidence |
|-----------|----------|
| No duplicate title/status/epic rows on same viewport | Epic detail: shell title + overview status chip only |
| Story detail dedupe preserved | Existing task-09p inspector/detail split unchanged |

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- dedupe-view-copy.spec.ts
```

## Iteration notes (2026-07-07)

- E2E spec hardened: `domcontentloaded` + `html[data-app-hydrated="true"]` (avoids `load` hang on collab WebSocket); uses `./fixtures` and 120s timeout.
