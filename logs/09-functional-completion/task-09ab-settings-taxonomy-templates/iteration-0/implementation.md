# task-09ab-settings-taxonomy-templates — iteration 0

## Scope

CAP-008,009,090-095,097,098 — workflow states, labels, templates, epic status groups, releases, emoji.

## Implementation

| CAP | Surface |
|-----|---------|
| CAP-008 | Workflow states list in settings |
| CAP-009/093 | Story templates + create modal apply |
| CAP-090/091 | Story + epic labels |
| CAP-092 | Epic status groups |
| CAP-094/095 | Epic + document templates |
| CAP-097 | Releases list |
| CAP-098 | Custom emoji picker list |

## Files

- `frontend/src/lib/taxonomy/*`
- `frontend/src/components/settings/taxonomy-settings-panel.tsx`
- `frontend/src/app/[locale]/workspace/settings/taxonomy/page.tsx`
- `frontend/src/components/create-story-modal.tsx` (template apply)

## Validation

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend test:e2e -- settings-taxonomy-templates.spec.ts
```
