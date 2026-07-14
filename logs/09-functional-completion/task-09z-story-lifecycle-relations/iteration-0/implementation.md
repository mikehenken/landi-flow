# task-09z-story-lifecycle-relations — iteration 0

## Scope

CAP-005–007, 011, 014, 044 — drafts, sub-stories, relations, history, attachments, epic stories tab.

## Implementation

| CAP | Component / route |
|-----|-------------------|
| CAP-005 | `/workspace/stories/drafts`, draft banner + publish |
| CAP-006 | `SubStoryProgressChip`, `SubStoriesList`, board card chip |
| CAP-007 | `StoryRelationsPanel`, `relation-controller.ts` |
| CAP-011 | `StoryHistoryPanel`, undo from activity payload |
| CAP-014 | `StoryAttachmentsPanel` (localStorage v1) |
| CAP-044 | Epic stories tab filters non-drafts, `data-cap="CAP-044"` |

## Files

- `frontend/src/components/story-lifecycle/*`
- `frontend/src/lib/story-lifecycle/*`
- `frontend/src/controllers/relation-controller.ts`
- `frontend/src/app/.../stories/drafts/page.tsx`
- Seed: `story-draft-001`, `SEED_STORY_RELATIONS`

## Validation

```bash
pnpm run lint
pnpm test -- frontend/src/lib/story-lifecycle/sub-story-progress.test.ts
pnpm --filter @landi-flow/frontend test:e2e -- story-lifecycle-relations.spec.ts
```
