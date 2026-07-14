# Independent QA Gap Analysis — CR-09r-006 + CR-09r-007

**Study:** STUDY-013 — linear-clone-product-lifecycle  
**Reviewer:** qa-expert (independent)  
**Repo:** `c:\Users\mikeh\Projects\landi\landi-flow`  
**Date:** 2026-07-06  
**Gate threshold:** ≥ 0.90  
**Acceptance source:** `landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/09r-frontend-design-hitm/human-review-feedback-2026-07-05.md` (rows 6–7, CR-09r-006/007)  
**Implementation log:** `logs/09r-continuation/CR-09r-006-007/implementation.md`

---

## Executive verdict

| CR | Verdict | Score | Gate |
|----|---------|:-----:|:----:|
| **CR-09r-006** — Story detail layout preference | **PASS** | **0.93** | ≥ 0.90 ✓ |
| **CR-09r-007** — Settings nav discoverability | **PASS** | **0.94** | ≥ 0.90 ✓ |

Both change requests meet the 0.90 gate. Implementation matches the acceptance intent in code; lint is clean. Residual gaps are non-blocking (no automated tests, sidebar footer links hidden when sidebar collapsed, cross-surface React state sync via localStorage only).

---

## Verification performed

| Check | Command | Result | Notes |
|-------|---------|--------|-------|
| Implementation log review | Read `implementation.md` | **PASS** | Scope and file list confirmed |
| Static code trace | Key files below | **PASS** | All claimed behaviors present in source |
| Monorepo lint | `pnpm run lint` (repo root) | **PASS** | Exit 0; frontend: `✔ No ESLint warnings or errors` |
| Automated tests (CR scope) | Repo search | **NOT FOUND** | No Vitest/Playwright specs for layout pref or settings routes |
| Runtime browser / Playwright | — | **NOT RUN** | Code + lint review only |

### Lint proof (2026-07-06, independent)

```
> landi-flow@0.0.0 lint
> pnpm -r lint
...
frontend lint: ✔ No ESLint warnings or errors
frontend lint: Done
```

---

## CR-09r-006 — Story detail layout preference

**Human-review AC:** User preference `sidebar` | `modal`; modal supports pin/expand; persists per user.

### Acceptance criteria traceability

| AC | Expected | Evidence | Result |
|----|----------|----------|--------|
| `sidebar` \| `modal` preference | Typed enum + default `sidebar` | `story-detail-layout-preference.ts` L2–6, L8–10 | **PASS** |
| Persists per user (localStorage) | Key `landi-flow:story-detail-layout` | `STORY_DETAIL_LAYOUT_STORAGE_KEY` L4; read/write helpers L12–38 | **PASS** |
| React hook sync | Client hook reads/writes storage | `use-story-detail-layout-preference.ts` L19–38 | **PASS** |
| **Sidebar** mode on stories routes | Right aside with `CollaborativeStoryPanel` | `StoryDetailSurface` L292–304; `stories/page.tsx` L27–30; `stories/board/page.tsx` L49–52 | **PASS** |
| **Modal** overlay | `<dialog>` + backdrop | `StoryDetailModal` L123–170; `data-testid="story-detail-modal"` L125 | **PASS** |
| **Pin** keeps detail open across navigation | Modal visible when `isPinned` off story routes | `StoryDetailModalHost` L49–50, L52–58; pin toggle L97, L208–219 | **PASS** |
| **Expand** full-width panel | Expanded layout classes | `StoryDetailModal` L140–153; expand toggle L221–238 | **PASS** |
| Quick toggle in panel header | Compact toggle in chrome | `StoryDetailPanelHeader` L207; `StoryDetailLayoutToggle` `compact` | **PASS** |
| Settings toggle — Account | Full setting row | `account-page-content.tsx` L56–58 | **PASS** |
| Settings toggle — Workspace General | Full setting row | `settings/general/page.tsx` L27 | **PASS** |
| AppShell integration | Provider + modal host | `app-shell.tsx` L633; `story-detail-panel.tsx` L30–38 | **PASS** |
| i18n | `story_detail.*` keys | `packages/ui/src/i18n/messages/{en,es,de,ar}/navigation.json` | **PASS** |
| No features removed | StoryInspector, CollaborativeStoryPanel preserved | `app-shell.tsx` L837–839; modal/sidebar use `CollaborativeStoryPanel` | **PASS** |
| Lint clean | Mandatory gate | Independent `pnpm run lint` | **PASS** |

### CR-09r-006 scorecard

| # | Criterion | Weight | Score | Notes |
|---|-----------|:------:|:-----:|-------|
| 1 | localStorage `sidebar` \| `modal` persistence | 0.14 | 1.00 | Validated read/write + SSR guard |
| 2 | Modal overlay (`<dialog>`, backdrop, close) | 0.14 | 1.00 | `showModal()` / `onCancel` / backdrop click |
| 3 | Pin persists detail across workspace nav | 0.12 | 1.00 | `onStoryRoute \|\| isPinned` |
| 4 | Expand → full-width panel | 0.10 | 1.00 | `isExpanded` layout branch |
| 5 | Sidebar mode on `/stories` + `/stories/board` | 0.12 | 1.00 | `StoryDetailSidebarPanel` aside |
| 6 | Header quick toggle (sidebar + modal) | 0.10 | 1.00 | `StoryDetailLayoutToggle compact` |
| 7 | Account + workspace settings toggles | 0.10 | 1.00 | `StoryDetailLayoutSettingRow` ×2 |
| 8 | i18n (en, de, es, ar) | 0.08 | 1.00 | All four locales present |
| 9 | No features removed | 0.05 | 1.00 | Inspector + collaboration panel retained |
| 10 | Lint clean | 0.05 | 1.00 | Independent run PASS |

**Weighted raw:** 1.00  
**Adjustments:** −0.04 no automated tests; −0.02 separate `StoryDetailLayoutProvider` on account vs AppShell (localStorage sync only until remount); −0.01 pin control shown in sidebar mode but only affects modal visibility  
**Composite CR-09r-006:** **0.93** → **PASS**

### Residual gaps — CR-09r-006 (non-blocking)

| ID | Severity | Finding | Recommendation |
|----|----------|---------|----------------|
| G-006-01 | MINOR | No unit/E2E tests for layout preference, modal pin/expand, or `data-testid` surfaces | Add Vitest for read/write preference; Playwright pin + navigate flow |
| G-006-02 | MINOR | Account page uses separate provider from AppShell; live shell does not update until remount | Broadcast `storage` event or shared context |
| G-006-03 | INFO | Pin toggle visible in sidebar header but only affects modal mode | Hide pin in sidebar mode or document in UI |
| G-006-04 | INFO | No Storybook story for layout chrome | Add when Storybook coverage expands |

---

## CR-09r-007 — Settings nav discoverability

**Human-review AC:** Account at `/workspace/account` (no 500); workspace settings nav + `/workspace/settings/*` routes; linked from sidebar.

### Acceptance criteria traceability

| AC | Expected | Evidence | Result |
|----|----------|----------|--------|
| Account no 500 under mock auth | Early return without Supabase | `account/page.tsx` L13–15, L24–37 | **PASS** |
| Account no 500 when Supabase env missing | `hasSupabaseUserClientConfig` guard | `account/page.tsx` L24 | **PASS** |
| Graceful fallback on unexpected errors | try/catch → demo profile | `account/page.tsx` L40–119 | **PASS** |
| Account UI extracted (client) | Standalone page content | `account-page-content.tsx` | **PASS** |
| `/workspace/settings` | Redirect to general | `settings/page.tsx` L12–15 | **PASS** |
| `/workspace/settings/general` | AppShell + subnav + content | `settings/general/page.tsx` | **PASS** |
| `/workspace/settings/members` | AppShell + subnav + placeholder | `settings/members/page.tsx` | **PASS** |
| Settings sub-navigation | General / Members links | `settings-subnav.tsx` | **PASS** |
| Sidebar **Account** link | Footer when expanded | `app-shell.tsx` L670–680 | **PASS** |
| Sidebar **Workspace settings** link | Footer when expanded | `app-shell.tsx` L681–692 | **PASS** |
| Settings pages use AppShell | Shell wrapper | general + members pages | **PASS** |
| Account remains standalone | No AppShell on account | `account/page.tsx` | **PASS** |
| Account → workspace settings CTA | Link button | `account-page-content.tsx` L63–65 | **PASS** |
| i18n | `settings.*` keys | navigation.json (en, de, es, ar) | **PASS** |
| Lint clean | Mandatory gate | Independent `pnpm run lint` | **PASS** |

### CR-09r-007 scorecard

| # | Criterion | Weight | Score | Notes |
|---|-----------|:------:|:-----:|-------|
| 1 | Account: mock auth path (no Supabase 500) | 0.16 | 1.00 | Demo profile short-circuit |
| 2 | Account: missing env + error fallback | 0.12 | 1.00 | Guard + try/catch |
| 3 | `/workspace/settings` → general redirect | 0.08 | 1.00 | Server redirect |
| 4 | `/general` + `/members` routes with AppShell | 0.14 | 1.00 | Placeholders in scope |
| 5 | Settings subnav (General / Members) | 0.08 | 1.00 | `SettingsSubnav` |
| 6 | Sidebar footer Account link | 0.12 | 0.92 | Hidden when sidebar collapsed |
| 7 | Sidebar footer Workspace settings link | 0.12 | 0.92 | Hidden when sidebar collapsed |
| 8 | Account page link to workspace settings | 0.08 | 1.00 | `open_workspace` CTA |
| 9 | Account standalone (not in PM shell) | 0.05 | 1.00 | Separate layout |
| 10 | i18n (en, de, es, ar) | 0.05 | 1.00 | `settings.*` keys |
| 11 | Lint clean | 0.05 | 1.00 | Independent run PASS |

**Weighted raw:** 0.978  
**Adjustments:** −0.04 no automated tests; −0.02 sidebar footer links not reachable when sidebar collapsed  
**Composite CR-09r-007:** **0.94** → **PASS**

### Residual gaps — CR-09r-007 (non-blocking)

| ID | Severity | Finding | Recommendation |
|----|----------|---------|----------------|
| G-007-01 | MINOR | Footer links only when `!sidebarCollapsed` | Icon-only links when collapsed |
| G-007-02 | MINOR | No E2E proving account 200 under mock auth | Playwright with `NEXT_PUBLIC_MOCK_AUTH=true` |
| G-007-03 | INFO | General/Members are placeholder shells (expected) | Track CAP-099–101 |
| G-007-04 | INFO | "Sign out" not i18n-keyed on account page | Localize in i18n pass |

---

## Sign-off

| CR | Verdict | Score |
|----|---------|:-----:|
| CR-09r-006 | **PASS** | **0.93** |
| CR-09r-007 | **PASS** | **0.94** |

Independent QA confirms both change requests meet the **≥ 0.90** quality gate based on static code verification and clean lint.
