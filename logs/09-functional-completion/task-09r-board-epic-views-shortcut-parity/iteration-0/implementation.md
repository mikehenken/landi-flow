# task-09r-board-epic-views-shortcut-parity — Implementation Log (Iteration 0)

**Date:** 2026-07-07  
**Agent:** frontend-developer  
**Scope:** CAP-019, CAP-031, CAP-043, CAP-048, CAP-049 — board swimlanes + epic detail Shortcut parity

## Summary

Delivered Shortcut-style board grouping (flat / epic / cycle swimlanes) with persisted preference, workflow-column Kanban layout, and epic detail overview tab with burn-up chart and activity sidebar.

## CAP mapping

| CAP | Feature | Dev route | Implementation |
|-----|---------|-----------|----------------|
| CAP-019 | Board workflow columns + DnD | `/en/workspace/stories/board` | `board-columns-grid.tsx`, `board-toolbar.tsx` |
| CAP-031 | Swimlanes by epic/cycle | `/en/workspace/stories/board` | `board-swimlanes-view.tsx`, `board-grouping.ts`, localStorage pref |
| CAP-043 | Epic overview tab | `/en/workspace/epics/[epicId]` | `epic-detail-sidebar.tsx` → `EpicOverviewPanel` |
| CAP-048 | Burn-up progress graph | Epic detail sidebar | `epic-burnup-chart.tsx`, `epic-progress.ts` |
| CAP-049 | Epic activity stream | Epic detail sidebar | `epic-activity-feed.tsx`, `epic-activity.ts` |

## Architecture decisions

1. **Swimlanes use offline DnD path** — When `groupBy !== 'none'`, board renders per-lane `BoardColumnsGrid` instead of Liveblocks storage (avoids cross-lane storage complexity; matches FHITM offline-first dev path).
2. **Grouping preference persisted** — Key `landi-flow:board-group-by` via `board-swimlane-preference.ts` (mirrors story-detail layout pref pattern).
3. **Epic activity from seed derivation** — Reuses `deriveSeedActivity()` filtered by `epic_id` for mock/dev parity without new API surface.
4. **Burn-up computed client-side** — Cumulative scope vs completed from epic stories + workflow state categories; no new backend endpoint for v1.

## Files created

| File | Role |
|------|------|
| `frontend/src/lib/board-swimlane-preference.ts` | Group-by localStorage |
| `frontend/src/lib/board-grouping.ts` | Swimlane bucket builder |
| `frontend/src/lib/epic-progress.ts` | Burn-up computation |
| `frontend/src/lib/epic-activity.ts` | Epic-scoped activity filter |
| `frontend/src/hooks/use-board-group-by-preference.ts` | React hook |
| `frontend/src/components/board-toolbar.tsx` | Board header + grouping controls |
| `frontend/src/components/board-columns-grid.tsx` | Shared Kanban columns (CAP-019) |
| `frontend/src/components/board-swimlanes-view.tsx` | Swimlane rows (CAP-031) |
| `frontend/src/components/epic-burnup-chart.tsx` | SVG burn-up (CAP-048) |
| `frontend/src/components/epic-activity-feed.tsx` | Epic audit feed (CAP-049) |
| `frontend/src/components/epic-detail-sidebar.tsx` | Overview panel + sidebar shell |
| `frontend/e2e/board-epic-views-shortcut-parity.spec.ts` | E2E proof |

## Files modified

| File | Change |
|------|--------|
| `frontend/src/components/collaboration/collaborative-board.tsx` | Swimlane props; delegates to grid/swimlanes |
| `frontend/src/app/.../stories/board/page.tsx` | Toolbar + grouping wiring |
| `frontend/src/app/.../epics/[epicId]/page.tsx` | Overview/Stories tabs + sidebar |
| `frontend/src/lib/seed-data.ts` | `DEMO_CYCLES` + cycle assignments on seed stories |

## Validation

```bash
cd frontend && pnpm run lint
cd frontend && pnpm run test:e2e -- board-epic-views-shortcut-parity
```

Screenshots: `logs/09-functional-completion/task-09r-board-epic-views-shortcut-parity/iteration-0/artifacts/`

## Residual gaps (non-blocking)

- Swimlanes do not use Liveblocks collaborative DnD when keys are configured (documented trade-off).
- Epic overview resources are summary cards, not full Shortcut “attached links” CRUD.
- Cycle grouping uses demo seed cycles only; production cycle API hydration not wired on board page.
