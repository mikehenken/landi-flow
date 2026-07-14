# task-09s-list-filters-search-board-toggle — iteration 0

## Scope

Filter panel, display panel, list/board toggle (Cmd+B), search, bulk actions, display toggles (CAP-022–027, 025, 026, 032, 033, 038); customer filter dimension (CAP-068).

## Implementation

- `packages/core/src/types/view-preferences.ts` — filter/display preference types
- `packages/ui/src/components/views/*` — FilterPanel, DisplayPanel, BulkActionBar + Storybook
- `frontend/src/components/stories-view-provider.tsx` — App Router overlay wiring
- `frontend/src/lib/story-view-pipeline.ts` — filter/search/sort pipeline
- `frontend/src/hooks/use-stories-view-shortcuts.ts` — Cmd+B, F, Shift+V, X, Cmd+A
- `frontend/e2e/stories-view-filters.spec.ts` — Playwright proof

## Acceptance mapping

| Criterion | Evidence |
|-----------|----------|
| Overlays in App Router views | `StoriesViewProvider` on `/workspace/stories` + `/board` |
| Cmd+B toggle | `useStoriesViewShortcuts` + e2e `09s-cmd-b-layout-toggle.png` |
| Show sub-stories + completed ordering persist | DisplayPanel + localStorage + e2e reload test |
| Bulk actions persist all rows | `story-bulk-controller.ts` + e2e bulk priority test |
| Manual drag ordering survives refresh | `StoryListView` DnD + existing board offline DnD |

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- stories-view-filters.spec.ts
```
