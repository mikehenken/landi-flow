# P0-1 fix iteration 5 — native dialog + URL persist + epic_id

| Field | Value |
|-------|-------|
| **Study** | STUDY-016 `landi-flow-qa-remediation` |
| **Task** | `task-03-p0-1-fix-iteration-5` |
| **Repo** | `landi-flow` · `feature/task-09g-dev-ai-agent-ui` |
| **Tip SHA** | _(filled after push)_ |
| **Date** | 2026-07-14 |
| **Gate** | Recovery for GATE 2 P0-1 (visible dialog + `?story=` persist + UX-05 epic_id) — **not** claiming live PASS until re-matrix |

---

## Live failure (authoritative — d5f029a matrix)

```text
WIRED PASS: showPortal=true, hostStoreAligned=true, resolved=GEN-5
DOM FAIL:   modalPresent=false, sidebarVisible=false, anySurface=false
PERSIST FAIL: storyParam=null after list/board click; reload clears selection
UX-05 FAIL: epicPickerText="No Epic", created.epic_id=null
P0-2 FAIL:  [data-testid="board-column"] missing (columns=[])
```

Artifacts: `logs/03-p0-core-story-ux/task-03c-p0-functional-matrix-d5f029a/`

Live Playwright repro (pre-fix): after GEN-5 click, `dataset.storyDetailDebug.showPortal=true` + `resolved=GEN-5`, but `document.querySelector('[data-testid="story-detail-modal"]')` was null and `htmlHasStoryDetailModal=false`. `createPortal(...)` never committed a DOM node under OpenNext.

---

## Root cause

1. **Portal dark** — `StoryDetailModalHost` returned `createPortal(<div role="dialog">…, document.body)`. Host re-rendered and wrote correct debug, but the portal child never appeared in `document.body` (no React pageerror). GATE 2 needs a findable surface.
2. **URL soft-nav drop** — `useStoryModalSelect` only called `router.replace(?story=)`. Under OpenNext the address bar stayed without `?story=`, so hard reload could not restore selection (unlike deeplink which already has the param).
3. **UX-05** — Create from epic often hit header Create / empty CTA without inheriting epic from the route; picker showed "No Epic" and `epic_id` stayed null.
4. **P0-2** — Board column `<section>` lacked `data-testid="board-column"`.

---

## Fix

| File | Change |
|------|--------|
| `story-detail-panel.tsx` | Native `<dialog data-testid="story-detail-modal">` in-tree (no `createPortal`); `showModal()` when `showPortal && !isSidebar`; mount shell even while story resolves |
| `use-story-deep-link.ts` | `replaceStoryQueryInHistory` writes `?story=` via `history.replaceState` before `router.replace` |
| `app-shell.tsx` | `openCreateStory` inherits epic UUID from `/workspace/epics/{id}` when options omit `epicId` |
| `epics/[epicId]/page.tsx` | Always-visible `data-testid="epic-create-story"` CTA with `{ epicId: epic.id }` |
| `board-columns-grid.tsx` / `collaborative-board.tsx` | `data-testid="board-column"` + `board-column-title` |
| `empty-state.tsx` / `story-list-view.tsx` | Optional `ctaTestId` / `createStoryTestId` for empty CTAs |

---

## Self-review

| Check | Result |
|-------|--------|
| Native dialog + showModal when showPortal | Pass |
| modalPresent expected true when selection set (modal layout) | Pass (code) |
| `?story=` written on list/board select | Pass (`replaceStoryQueryInHistory`) |
| Create-from-epic sets epicId | Pass (CTA + pathname inherit) |
| board-column testid | Pass |
| Live GATE 2 re-matrix | **Pending** |
| HITM | **Not opened** |

---

## Tests run

```text
pnpm exec vitest run \
  frontend/src/lib/story/use-story-deep-link.test.ts \
  frontend/src/lib/story/story-detail-host-visibility.test.ts \
  frontend/src/hooks/use-global-landi-flow-story-store.test.ts \
  frontend/src/lib/story/create-story-epic-association.test.ts \
  frontend/src/lib/story/open-story-modal.test.ts
```

| Suite | Result |
|-------|--------|
| All 5 files / 18 tests | Pass |

---

## Deploy

_(filled after workflow completes)_

## Next

1. Re-run GATE 2 matrix against new SHA
2. Expect: `modalPresent=true` or `dialog.open`, `storyParam=GEN-*` after list click, persist after reload, UX-05 `epic_id` set
3. Do **not** claim GATE 2 PASS / HITM here
