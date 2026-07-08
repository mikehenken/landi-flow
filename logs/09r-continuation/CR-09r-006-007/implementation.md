# CR-09r-006 + CR-09r-007 Implementation Log

**Date:** 2026-07-06  
**Scope:** Story detail layout preference (sidebar/modal) + settings discoverability

## CR-09r-006 — Story detail layout preference

### Preference storage
- Key: `landi-flow:story-detail-layout`
- Values: `sidebar` | `modal` (default: `sidebar`)
- Module: `frontend/src/lib/story-detail-layout-preference.ts`
- Hook: `frontend/src/hooks/use-story-detail-layout-preference.ts`

### Layout behavior
| Mode | Behavior |
|------|----------|
| **Sidebar** | `CollaborativeStoryPanel` in right aside on `/workspace/stories` and `/workspace/stories/board` (existing pattern) |
| **Modal** | Overlay `<dialog>` with `CollaborativeStoryPanel`; pin keeps modal open while navigating workspace routes; expand toggles full-width panel |

### UI controls
- **Quick toggle** — panel header (`StoryDetailPanelHeader`) on sidebar + modal chrome
- **Settings row** — Account page + Workspace settings → General (`StoryDetailLayoutSettingRow`)

### Components
| File | Role |
|------|------|
| `story-detail-layout-context.tsx` | Provider + `useStoryDetailLayout()` (layout, pin, expand state) |
| `story-detail-panel.tsx` | `StoryDetailLayoutRoot`, modal host, sidebar surface, panel header |
| `story-detail-layout-toggle.tsx` | Compact toggle + full settings row |

### Integration
- `AppShell` wraps shell in `StoryDetailLayoutRoot`
- `stories/page.tsx` and `stories/board/page.tsx` use `StoryDetailSurface` instead of inline `<aside>`

## CR-09r-007 — Settings nav discoverability

### Account page 500 fix
- `account/page.tsx` detects `NEXT_PUBLIC_MOCK_AUTH=true` or missing Supabase env via `hasSupabaseUserClientConfig`
- Renders demo profile from `CURRENT_USER` + `DEMO_WORKSPACE_ID` without Supabase calls
- Real auth path wrapped in try/catch with graceful demo fallback on unexpected errors
- Client UI extracted to `account-page-content.tsx` (includes story layout preference + link to workspace settings)

### Workspace settings routes
| Route | Page |
|-------|------|
| `/workspace/settings` | Redirect → `/workspace/settings/general` |
| `/workspace/settings/general` | AppShell + subnav + story layout preference + placeholder copy |
| `/workspace/settings/members` | AppShell + subnav + placeholder copy |

### Sidebar discoverability
- AppShell sidebar footer links (when expanded):
  - **Account** → `/workspace/account`
  - **Workspace settings** → `/workspace/settings/general`

### i18n
- Added `settings.*` and `story_detail.*` keys to `navigation.json` (en, es, de, ar)

## Files changed

| File | Change |
|------|--------|
| `frontend/src/lib/story-detail-layout-preference.ts` | **New** — localStorage read/write |
| `frontend/src/hooks/use-story-detail-layout-preference.ts` | **New** — React hook |
| `frontend/src/components/story-detail-layout-context.tsx` | **New** — context provider |
| `frontend/src/components/story-detail-panel.tsx` | **New** — modal/sidebar surfaces |
| `frontend/src/components/story-detail-layout-toggle.tsx` | **New** — toggle + settings row |
| `frontend/src/components/account-page-content.tsx` | **New** — account UI (client) |
| `frontend/src/components/settings-subnav.tsx` | **New** — settings sub-navigation |
| `frontend/src/components/app-shell.tsx` | Layout root + footer settings links |
| `frontend/src/app/.../stories/page.tsx` | `StoryDetailSurface` |
| `frontend/src/app/.../stories/board/page.tsx` | `StoryDetailSurface` |
| `frontend/src/app/.../account/page.tsx` | Mock auth + error handling |
| `frontend/src/app/.../settings/page.tsx` | **New** — redirect |
| `frontend/src/app/.../settings/general/page.tsx` | **New** — general settings shell |
| `frontend/src/app/.../settings/members/page.tsx` | **New** — members placeholder |
| `packages/ui/src/i18n/messages/*/navigation.json` | Settings + story_detail strings |

## Lint / validation

```
pnpm run lint
frontend lint: ✔ No ESLint warnings or errors
```

## Self-review

- [x] CR-09r-006: `sidebar` \| `modal` preference persisted in `landi-flow:story-detail-layout`
- [x] CR-09r-006: Modal overlay with pin (persist across navigation) and expand (full width)
- [x] CR-09r-006: Sidebar mode preserves prior aside behavior
- [x] CR-09r-006: Toggle in panel header + account + workspace settings general
- [x] CR-09r-007: Account page no longer 500s under mock auth / missing Supabase env
- [x] CR-09r-007: `/workspace/settings`, `/general`, `/members` routes exist
- [x] CR-09r-007: Account + Workspace settings linked from sidebar footer
- [x] CR-09r-007: Settings pages use AppShell; account remains standalone
- [x] No features removed (StoryInspector, CollaborativeStoryPanel, existing nav preserved)
- [x] Lint clean

### Residual notes (non-blocking)
- Pin in **sidebar** mode stores state but only affects modal visibility when user switches to modal layout
- Workspace settings General/Members are placeholder shells per CR scope
- Separate `StoryDetailLayoutProvider` instances on account vs AppShell share localStorage but not live React state until remount
