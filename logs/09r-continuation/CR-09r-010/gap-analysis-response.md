# Independent QA Gap Analysis — CR-09r-010

**Study:** STUDY-013 — linear-clone-product-lifecycle  
**Reviewer:** qa-expert (independent)  
**Repo:** `c:\Users\mikeh\Projects\landi\landi-flow`  
**Date:** 2026-07-06  
**Gate threshold:** ≥ 0.90  
**Acceptance source:** `landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/09r-frontend-design-hitm/human-review-feedback-2026-07-05.md` (row 10, CR-09r-010 / CAP-038, CAP-039)

---

## Verdict

**PASS** — Score **0.92** (gate ≥ 0.90 met).

CR-09r-010 acceptance criteria are implemented: the Cmd/Ctrl+K palette searches Stories (identifier + title) and Epics (name) alongside preserved action groups; app-shell wires store data with correct navigate + select handlers; Create Story still opens `CreateStoryModal`. Lint passes independently. Residual gaps are non-blocking (no automated tests for search selection, E2E does not assert Stories/Epics groups, no runtime browser proof in this review).

---

## Acceptance criteria traceability

### CR-09r-010 — Command palette search mode (CAP-038 + CAP-039)

| AC (human review) | Expected | Evidence | Result |
|-------------------|----------|----------|--------|
| Cmd/Ctrl+K opens palette with search across stories/epics + actions | Unified search, not action-only stub | `command-palette.tsx` L118–168 Stories/Epics groups before action groups; `app-shell.tsx` L823–847 passes `stories`, `epics`, `actions` | **PASS** |
| CommandPalette accepts stories/epics | Optional props + result types | `command-palette.tsx` L17–28 types; L39–40 props; L63–64 defaults | **PASS** |
| app-shell passes store data | Maps `useStoryStore` / `useEpicStore` | `app-shell.tsx` L112–114 hooks; L202–240 `commandStories` / `commandEpics` memos | **PASS** |
| Stories searchable by identifier + title | cmdk filter on both fields | `command-palette.tsx` L123–124 `value={`${story.identifier} ${story.title}`}` + `keywords={[story.identifier, story.title]}` | **PASS** |
| Epics searchable by name | cmdk filter on name | `command-palette.tsx` L139–140 `value={epic.name}` + `keywords={[epic.name]}` | **PASS** |
| Story select → navigate + store select | Stories view + `selectStory(id)` | `app-shell.tsx` L170–178 `handleCommandStorySelect` → `storyStore.selectStory(storyId)` + `navigate('/workspace/stories')` | **PASS** |
| Epic select → navigate + store select | Epic detail + `selectEpic(id)` | `app-shell.tsx` L186–194 `handleCommandEpicSelect` → `epicStore.selectEpic(epicId)` + `navigate(`/workspace/epics/${epicId}`)` | **PASS** |
| Action groups still work (CAP-039) | Suggested + navigation actions unchanged | `app-shell.tsx` L244–334 six actions (Create Story/Epic, Inbox, Stories, Epics, Agents); `onSelect` handlers intact | **PASS** |
| Create Story opens modal | Palette action + `C` shortcut | L258 `onSelect: openCreateStory`; L162–166 `setCreateModalOpen(true)`; L821 `<CreateStoryModal …>`; L394 `onCreateStory: openCreateStory` | **PASS** |
| Palette closes on selection | UX parity | `command-palette.tsx` L83–88 `handleSelect` calls `onOpenChange(false)` after `onSelect` | **PASS** |
| i18n group headings + placeholder | Four locales | `en/de/es/ar/navigation.json` — `stories_group`, `epics_group`, `placeholder`, `no_results`; wired L835–845 | **PASS** |
| Exports + Storybook demo | Package surface + visual demo | `packages/ui/src/index.ts` L37–39 exports; `command-palette.stories.tsx` demo stories/epics | **PASS** |
| Epic terminology (never Project) | Domain language | Epic group label + `Layers` icon; no Project strings in palette | **PASS** |
| No features removed | NEVER_REMOVE_FEATURES | All pre-existing navigation/suggested actions present in `commandActions` | **PASS** |

---

## Verification performed

| Check | Command | Result | Notes |
|-------|---------|--------|-------|
| Monorepo lint | `pnpm run lint` (repo root) | **PASS** | Exit 0; `@landi-flow/ui` tsc --noEmit clean; frontend: `✔ No ESLint warnings or errors` |
| Automated tests for CR scope | — | **NOT FOUND** | No Vitest/Playwright specs for story/epic palette search or selection |
| Existing E2E discoverability | `frontend/e2e/discoverability.spec.ts` | **PARTIAL** | Asserts palette opens + action labels; does not assert Stories/Epics groups or filtered selection |
| Runtime browser / Playwright | — | **NOT RUN** | Static code + lint review only |

### Lint proof (2026-07-06)

```
> landi-flow@0.0.0 lint
> pnpm -r lint
...
packages/ui lint: Done
frontend lint: ✔ No ESLint warnings or errors
frontend lint: Done
```

---

## Success-criteria scorecard

| # | Criterion | Weight | Score | Notes |
|---|-----------|:------:|:-----:|-------|
| 1 | CommandPalette stories/epics props + render groups | 0.12 | 1.00 | Types, defaults, Stories/Epics groups before actions |
| 2 | app-shell store wiring (`commandStories` / `commandEpics`) | 0.12 | 1.00 | `useStoryStore` / `useEpicStore` → palette props |
| 3 | Story search by identifier + title (cmdk) | 0.12 | 1.00 | `value` + `keywords` on identifier and title |
| 4 | Epic search by name | 0.10 | 1.00 | `value` + `keywords` on `epic.name` |
| 5 | Story select → `/workspace/stories` + `selectStory` | 0.12 | 1.00 | `handleCommandStorySelect` |
| 6 | Epic select → `/workspace/epics/{id}` + `selectEpic` | 0.11 | 1.00 | `handleCommandEpicSelect` |
| 7 | CAP-039 action groups preserved (6 actions) | 0.10 | 1.00 | Navigation + suggested actions intact |
| 8 | Create Story → `CreateStoryModal` | 0.08 | 1.00 | `openCreateStory` wired to palette + keyboard |
| 9 | i18n (4 locales) + exports + Storybook | 0.05 | 1.00 | navigation.json keys; index exports; stories file |
| 10 | Automated test coverage for search scope | 0.08 | 0.00 | No unit/E2E asserting story/epic search or selection |

**Weighted composite:** **0.92**  
**0.92 ≥ 0.90 → PASS**

---

## Residual gaps (non-blocking)

These do **not** fail the CR gate but should be tracked in follow-up work.

### GAP-01 — MINOR — No automated test coverage for search selection

- **Finding:** No Vitest or Playwright specs reference `commandStories`, `commandEpics`, story/epic cmdk items, or post-select navigation + store state.
- **Risk:** Regressions in filter wiring or select handlers undetected in CI.
- **Recommendation:** Add Playwright: open palette → type seed story identifier (e.g. `LAN-2`) → select → assert URL `/workspace/stories` and inspector/list selection; repeat for epic name.

### GAP-02 — MINOR — E2E discoverability test scope unchanged

- **Finding:** `discoverability.spec.ts` L11–21 only checks palette visibility and action text (`Create Story|Epic|Inbox`); does not assert `Stories` / `Epics` group headings or filtered results.
- **Recommendation:** Extend test to fill search input with a seed identifier and assert matching story row visible.

### GAP-03 — INFO — No recents / frecency ranking when query empty

- **Finding:** All stories/epics render when search is empty (cmdk default); implementation log lists Linear-style recents as out-of-scope follow-up.
- **Impact:** Acceptable for CR gate; may feel noisy with large datasets.
- **Recommendation:** Phase 2 — recent items subgroup when input is empty.

### GAP-04 — INFO — No runtime verification in this review

- **Finding:** Review is static (source + lint); no dev-server click-through or screenshot captured.
- **Recommendation:** Optional smoke: `/en/workspace/inbox` → Cmd/Ctrl+K → search `LAN-1` → Enter → verify stories view + selected story.

---

## Exhaustive gap list (FAIL criteria)

**None.** All human-review acceptance criteria for CR-09r-010 are satisfied in code. No blocking defects identified.

---

## Conclusion

Implementation delivers Linear/Shortcut-style unified command palette search: Stories and Epics are first-class searchable groups wired from client stores with correct navigation and selection side effects; CAP-039 action launcher behavior is preserved including Create Story modal wiring. Lint verification passes independently.

**Score: 0.92 — PASS**

---

*Independent QA review — no implementer code modified. Evidence from source inspection + `pnpm run lint` on 2026-07-06.*
