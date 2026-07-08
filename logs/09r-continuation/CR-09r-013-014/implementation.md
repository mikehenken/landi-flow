# CR-09r-013 + CR-09r-014 Implementation Log

**Date:** 2026-07-06  
**Scope:** Story inspector properties panel (Shortcut owner/requester/followers + inline editing)

## CR-09r-013 — Owner / Requester / Followers

### Story type (`packages/core/src/types/index.ts`)
- Added `creator_id: string | null` (maps to DB `created_by`; UI label **Requester**)
- Added `follower_ids: string[]` (Shortcut **Followers**)
- **Owner** uses existing `assignee_id` via `storyStore.setOwner()`

### storyStore (`frontend/src/stores/story-store.ts`)
- `setOwner(storyId, ownerId)` → patches `assignee_id`
- `setFollowers(storyId, followerIds)` → patches `follower_ids`
- `createStory()` sets `creator_id` from `CURRENT_USER.id` and empty `follower_ids`

### Seed data (`frontend/src/lib/seed-data.ts`)
- All six demo stories include `creator_id` and sample `follower_ids`

### Inspector UI (`frontend/src/components/story-inspector.tsx`)
- **Owner** — `OwnerPicker` (human-only, `PICKER_MEMBERS`)
- **Requester** — read-only `MemberChip` from `creator_id`
- **Followers** — `FollowersPicker` (human multi-select, stays open for toggles)
- **Agent delegate** — separate `AgentDelegatePicker` (CAP-017; agents only)

## CR-09r-014 — Inline property editing

### New pickers (`frontend/src/components/story-property-pickers.tsx`)
- `StoryStatusPicker` — click badge → workflow states from `DEMO_WORKFLOW_STATE_ROWS`
- `StoryPriorityPicker` — click badge → all `StoryPriority` values
- `StoryEpicPicker` — click badge → Epic list from `SEED_EPICS` (+ “No Epic”)
- Popover closes on single-select; followers popover stays open (`closeOnSelect={false}`)

### storyStore mutations
- `updateStoryPriority(storyId, priority)` (new)
- `updateStoryEpic(storyId, epicId)` (new)
- `updateStoryWorkflowState` refactored to shared `patchStory()` helper

### Description
- Existing `DescriptionEditor` retained in inspector (instant markdown)

## Files changed

| File | Change |
|------|--------|
| `packages/core/src/types/index.ts` | `creator_id`, `follower_ids` on `Story` |
| `packages/collaboration/src/hydration.test.ts` | Sample story fields |
| `frontend/src/stores/story-store.ts` | New mutation methods + `patchStory` |
| `frontend/src/lib/seed-data.ts` | Seed creator/followers |
| `frontend/src/components/story-property-pickers.tsx` | **New** inline pickers |
| `frontend/src/components/story-inspector.tsx` | Wired pickers + people rows |

## Not changed

- `collaborative-story-panel.tsx` — no duplicated property display (title/description/collab only); no edit required.

## Lint / validation

```
pnpm --filter @landi-flow/frontend lint
✔ No ESLint warnings or errors
```

Frontend `tsc` reports pre-existing errors in `packages/collaboration/src/structured-field-reconcile.ts` (unrelated to this CR).

## Self-review

- [x] Owner ≠ Agent delegate (separate rows, separate pickers)
- [x] Requester read-only from `creator_id`
- [x] Followers multi-select wired to store
- [x] Status/priority/epic editable in ≤2 clicks (click badge → click option)
- [x] Epic terminology (never Project)
- [x] `PICKER_MEMBERS` used for Owner/Followers
- [x] No features removed (DescriptionEditor, agent Action Bus flow preserved)
