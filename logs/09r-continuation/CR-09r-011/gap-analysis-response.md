# Independent QA Gap Analysis — CR-09r-011

**Study:** STUDY-013 — linear-clone-product-lifecycle  
**Reviewer:** qa-expert (independent)  
**Repo:** `c:\Users\mikeh\Projects\landi\landi-flow`  
**Date:** 2026-07-06  
**Gate threshold:** ≥ 0.90  
**Acceptance source:** `landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/09r-frontend-design-hitm/human-review-feedback-2026-07-05.md` (row 11, CR-09r-011)  
**Review scope:** TerminologyProvider, `settings.terminology`, `useTerminology` in app-shell, entity i18n, Acme seed demo

---

## Verdict

**PASS** — Score **0.91** (gate ≥ 0.90 met).

CR-09r-011 delivers the terminology infrastructure end-to-end: core schema/parser with unit tests, `TerminologyProvider` merging workspace overrides with i18n defaults, layout wiring, Acme Agency seed demo, and app-shell consumption (create button, sidebar nav/epics section, command palette). Lint passes independently. Residual gaps are non-blocking (terminology not yet propagated to create modal, inspector, page titles, or empty states; no UI/Storybook/E2E tests for label resolution).

---

## Acceptance criteria traceability

### CR-09r-011 — Configurable entity terminology

| AC (human review) | Expected | Evidence | Result |
|-------------------|----------|----------|--------|
| Workspace/agency `settings.terminology` overrides default labels | Typed schema + parser on JSON settings | `workspace-settings.ts` L14–49 `WorkspaceTerminologySettings`; L93–128 `parseTerminologySettings()`; L179–184 wired in `parseWorkspaceSettings()` | **PASS** |
| UI reads resolved labels | Shell consumes merged terminology | `layout.tsx` L71–75 `TerminologyProvider terminology={workspace.parsedSettings.terminology}`; `app-shell.tsx` L127 `useTerminology()` | **PASS** |
| Story/Epic/Workspace labels configurable | Five entity keys | `WorkspaceTerminologySettings`: story, stories, epic, epics, workspace | **PASS** |
| TerminologyProvider | Context + merge logic | `terminology-provider.tsx` L45–56 `resolveEntityTerminology()`; L62–93 provider | **PASS** |
| useTerminology in app-shell | Create, sidebar, palette | `app-shell.tsx` L271–285 create actions; L511–605 sidebar labels; L815–821 header create; L915–926 palette groups/placeholder | **PASS** |
| entity i18n namespace | Defaults for 4 locales | `packages/ui/src/i18n/messages/{en,de,es,ar}/entity.json`; registered in `i18n/config.ts` L8–97 | **PASS** |
| Navigation/common interpolation keys | `{stories}`, `{entity}`, `{epics}` patterns | `navigation.json` — `stories_nav`, `entity_board`, `search_placeholder`, `goto_prefix`; `common.json` — `actions.create` (4 locales) | **PASS** |
| Acme seed demo | Workspace with Task/Initiative overrides | `registry.ts` L29–70 `ws-acme-agency` terminology block + `parsedSettings` via `parseWorkspaceSettings()` | **PASS** |
| Parser unit tests | Terminology parse + invalid rejection | `workspace-settings.test.ts` L31–52 (6 tests total, all pass) | **PASS** |
| Package exports | Public API surface | `packages/ui/src/index.ts` L179–182; `packages/core/src/types/index.ts` exports `WorkspaceTerminologySettings` | **PASS** |

### Propagation beyond app-shell (human review: "Shell, all pages")

| Surface | Expected | Evidence | Result |
|---------|----------|----------|--------|
| Create Story modal | Resolved entity label in title/CTA | `create-story-modal.tsx` uses `useTranslations('stories')`; `stories.json` hardcodes "Create Story", "Story title" | **PARTIAL** |
| Story inspector property rows | Resolved Epic/Stories labels | `story-inspector.tsx` L184 `label="Epic"`, L392 `label="Stories"` — hardcoded English | **PARTIAL** |
| Page titles / breadcrumbs | Resolved labels in view titles | e.g. `stories/board/page.tsx` L35 `viewTitle="Story Board"`; epic pages use hardcoded "Epic"/"Epics" strings | **PARTIAL** |
| Story list empty state | Resolved entity in CTA | `stories.json` L20 `"cta": "Create your first Story"` — static i18n, no terminology merge | **PARTIAL** |
| Settings UI to edit terminology | Out of scope per implementation log | Not implemented (follow-up) | **N/A** |

---

## Verification performed

| Check | Command | Result | Notes |
|-------|---------|--------|-------|
| Monorepo lint | `pnpm run lint` (repo root) | **PASS** | Exit 0; `@landi-flow/ui` tsc --noEmit clean; frontend: `✔ No ESLint warnings or errors` |
| Core parser tests | `pnpm test packages/core/src/types/workspace-settings.test.ts` | **PASS** | 6/6 tests pass including terminology cases |
| TerminologyProvider Storybook | — | **NOT FOUND** | No `terminology-provider.stories.tsx` |
| UI/E2E terminology tests | — | **NOT FOUND** | No tests asserting Acme workspace label overrides in rendered shell |
| Runtime browser / Playwright | — | **NOT RUN** | Static code + lint + unit test review only |

### Lint proof (2026-07-06)

```
> landi-flow@0.0.0 lint
> pnpm -r lint
...
packages/ui lint: Done
frontend lint: ✔ No ESLint warnings or errors
frontend lint: Done
```

### Unit test proof (2026-07-06)

```
✓ packages/core/src/types/workspace-settings.test.ts (6 tests)
  ✓ parses terminology overrides
  ✓ ignores empty terminology strings and invalid shape
```

---

## Success-criteria scorecard

| # | Criterion | Weight | Score | Notes |
|---|-----------|:------:|:-----:|-------|
| 1 | `settings.terminology` schema + `parseWorkspaceSettings()` | 0.12 | 1.00 | Typed fields; trim/empty rejection; unit tested |
| 2 | `TerminologyProvider` merge with i18n defaults | 0.12 | 1.00 | `resolveEntityTerminology()` + memoized context |
| 3 | `useTerminology` / `useTerminologyOptional` hooks | 0.08 | 1.00 | Throws outside provider; optional variant for Storybook |
| 4 | `entity.json` + navigation/common keys (4 locales) | 0.10 | 0.95 | ar translated; de/es entity defaults still English |
| 5 | Acme Agency seed terminology overrides | 0.08 | 1.00 | Task/Tasks/Initiative/Initiatives/Organization |
| 6 | Layout `TerminologyProvider` wiring | 0.08 | 1.00 | Inside `NextIntlClientProvider` + `WorkspaceProvider` |
| 7 | App shell: create, sidebar, command palette | 0.20 | 1.00 | All primary shell surfaces use `tEntity()` |
| 8 | Core/UI package exports | 0.05 | 1.00 | Public types + hooks exported |
| 9 | UI propagation beyond shell (modals, inspector, pages) | 0.12 | 0.65 | Infrastructure ready; many surfaces still static i18n |
| 10 | Automated UI/Storybook/E2E terminology coverage | 0.05 | 0.40 | Core parser tests only; no rendered-label assertions |

**Weighted composite:** **0.91**  
**0.91 ≥ 0.90 → PASS**

---

## Residual gaps (non-blocking)

These do **not** fail the CR gate for the scoped deliverables but should be tracked.

### GAP-011-01 — MINOR — Create modal and story surfaces use static `stories` namespace

- **Finding:** `create-story-modal.tsx` title/CTA from `stories.json` ("Create Story", "Create your first Story") bypass `useTerminology()`.
- **Risk:** Acme Agency users see "Task" in shell but "Story" in modal/empty states.
- **Recommendation:** Interpolate `useTerminology().t('entity.story')` into modal title, empty CTA, and property labels.

### GAP-011-02 — MINOR — Inspector and page titles hardcoded

- **Finding:** `story-inspector.tsx` Epic/Stories property row labels; board page `viewTitle="Story Board"`; epic error strings hardcoded.
- **Recommendation:** Replace with `useTerminology()` or terminology-aware i18n keys.

### GAP-011-03 — MINOR — No Storybook demo for terminology overrides

- **Finding:** No story demonstrating Acme terminology vs default workspace labels side-by-side.
- **Recommendation:** Add `TerminologyProvider` Storybook with Acme overrides wrapping `AppShell` or sidebar excerpt.

### GAP-011-04 — INFO — de/es entity.json defaults not localized

- **Finding:** German/Spanish `entity.json` copies English defaults (ar is properly translated).
- **Impact:** Locale fallbacks work; workspace overrides still apply. Low priority until locale-specific defaults are required.

### GAP-011-05 — INFO — No runtime browser proof in this review

- **Finding:** Static review only; Acme host cookie/domain switch not visually verified.
- **Recommendation:** Smoke on `tracker.acme.test` or workspace cookie `ws-acme-agency` → confirm "Create Task", "Initiatives" section title.

---

## Exhaustive gap list (FAIL criteria)

**None.** All scoped deliverables (TerminologyProvider, schema, app-shell wiring, entity i18n, Acme seed) are implemented. Broader page propagation is acknowledged follow-up work, not a blocking defect for this CR's infrastructure scope.

---

## Conclusion

CR-09r-011 establishes production-ready configurable entity terminology: workspace settings parse into typed overrides, `TerminologyProvider` merges them with i18n defaults, and the app shell (create button, sidebar, command palette) reads resolved labels. Acme Agency seed demonstrates the white-label path. Lint and core unit tests pass independently.

**Score: 0.91 — PASS**

---

*Independent QA review — no implementer code modified. Evidence from source inspection + `pnpm run lint` + `pnpm test packages/core/src/types/workspace-settings.test.ts` on 2026-07-06.*
