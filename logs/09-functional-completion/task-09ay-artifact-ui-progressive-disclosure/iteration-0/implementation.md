# task-09ay-artifact-ui-progressive-disclosure — iteration 0

## Scope

ART-001 UI — ArtifactPanel on story detail with progressive disclosure.

## Implementation

| Surface | File |
|---------|------|
| ArtifactPanel | `frontend/src/components/artifacts/artifact-panel.tsx` |
| Story detail wiring | `frontend/src/components/story-detail-body.tsx` |
| Epic artifacts tab | `frontend/src/app/[locale]/workspace/epics/[epicId]/page.tsx` |
| Store | `frontend/src/lib/artifacts/artifact-store.ts` |

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- artifact-ui-progressive-disclosure.spec.ts
```
