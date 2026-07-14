# P0-1 fix iteration 4 — global-only host + window force setState

| Field | Value |
|-------|-------|
| **Study** | STUDY-016 `landi-flow-qa-remediation` |
| **Task** | `task-03-p0-1-fix-iteration-4` |
| **Repo** | `landi-flow` · `feature/task-09g-dev-ai-agent-ui` |
| **Tip SHA** | **`d5f029acc63067bb89244a0335b8a01c96f998c0`** |
| **Short** | `d5f029a` |
| **Date** | 2026-07-14 |
| **Gate** | Recovery for GATE 2 P0-1 (showPortal) — **not** claiming live PASS |

---

## Live failure (authoritative — f2c8972 probe)

```text
store.selectedStoryId = GEN-5
debug.globalSelectedStoryId = null
debug.selectedStoryId = null
debug.effectiveSelectedId = null
debug.showPortal = false
```

Regression vs fbe3091 (where `globalSelectedStoryId` at least matched the store). Host debug lagged / did not re-bind to `window.__landiFlowStoryStore` after list select.

Artifacts cited by coordinator: `logs/03-p0-core-story-ux/task-03c-p0-functional-matrix-f2c8972/probes/01-list-wired.json`

---

## Root cause

1. Host still mixed bridge `snap` + `readGlobalStorySnapshot()` and wrote debug in `useEffect` (probe could see store GEN-* while dataset stayed null).
2. Remount-key bridge did not guarantee OpenNext fibers re-read the pinned global every render.
3. `showPortal` required resolved story object; visibility flag must follow `selectedStoryId` on the **pinned global** alone.

---

## Fix (`d5f029a`)

| Change | Why |
|--------|-----|
| `useGlobalLandiFlowStoryStore` | `useSyncExternalStore` + `getServerSnapshot` from `globalThis.__landiFlowStoryStore` **only** |
| Window force `setState` | Subscribe to `landi-flow-story-store-changed` (+ 100ms poll) and re-read pinned global |
| `deriveStoryDetailHostVisibility` | `selectedStoryId != null` → `showPortal: true` |
| `StoryDetailModalHost` | No snap prop / no bridge; live re-read every render; sync `dataset.storyDetailDebug` during render |
| Mount path | Unchanged: `AppShellFrame` → `StoryDetailLayoutRoot` → host (stories list + board via workspace shell) |
| Unit tests | Selecting on `__landiFlowStoryStore` asserts host `showPortal: true` |

---

## Self-review

| Check | Result |
|-------|--------|
| Host mounts on `/workspace/stories` (+ board) | Pass (`WorkspaceShellProvider` → `AppShellFrame` → `StoryDetailLayoutRoot`) |
| Debug + showPortal from pinned global only | Pass |
| Window force setState path | Pass |
| Unit proof selection → showPortal | Pass |
| Live GATE 2 re-matrix | **Pending** — do **not** claim PASS |
| HITM | **Not opened** |

---

## Tests run

```text
pnpm exec vitest run \
  frontend/src/lib/story/story-detail-host-visibility.test.ts \
  frontend/src/hooks/use-global-landi-flow-story-store.test.ts \
  frontend/src/hooks/use-canonical-story-store.test.ts \
  frontend/src/hooks/use-selected-story-id.test.ts \
  frontend/src/stores/story-store.singleton.test.ts
pnpm exec tsc -p frontend --noEmit
```

| Suite | Result |
|-------|--------|
| story-detail-host-visibility | 3/3 pass |
| use-global-landi-flow-story-store | 2/2 pass |
| use-canonical-story-store | 1/1 pass |
| use-selected-story-id | 4/4 pass |
| story-store.singleton | 6/6 pass |
| `tsc -p frontend` | pass |

---

## Deploy

- Branch: `feature/task-09g-dev-ai-agent-ui`
- Push: `f2c8972..d5f029a`
- Workflow: `deploy.yml` with `deploy_workers=true` + `deploy_frontend=true`
- **Successful run:** [29305725802](https://github.com/mikehenken/landi-flow/actions/runs/29305725802) (`head_sha=d5f029a`, workers ✓ frontend ✓)

## Next (coordinator / matrix)

1. Confirm Cloudflare frontend Worker serves `d5f029a`
2. Re-run list-click probe — expect `showPortal: true` and `globalSelectedStoryId` matching store GEN-*
3. Only then consider GATE 2 / HITM — **not claimed here**
