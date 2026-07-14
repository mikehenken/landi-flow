# task-09aq-bidirectional-comment-flows — iteration 0

## Scope

MCP-IDE-002 — Unified comments with human/agent/system attribution badges.

## Implementation

| Surface | File |
|---------|------|
| UnifiedCommentsPanel | `frontend/src/components/comments/unified-comments-panel.tsx` |
| CommentAttributionBadge | `frontend/src/components/comments/comment-attribution-badge.tsx` |
| Story detail wiring | `frontend/src/components/story-detail-body.tsx` |
| Store | `frontend/src/lib/comments/unified-comments-store.ts` |

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- bidirectional-comment-flows.spec.ts
```
