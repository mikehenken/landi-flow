# task-09ax-artifact-system-backend — iteration 0

## Scope

ART-001 backend — `story_artifacts` schema, `/api/artifacts` route.

## Implementation

| Surface | File |
|---------|------|
| Migration | `supabase/migrations/0036_task09_batch_artifacts_initiatives.sql` |
| API route | `frontend/src/app/api/artifacts/route.ts` |
| Types | `packages/core/src/types/artifacts.ts` |

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- artifact-system-backend.spec.ts
```
