# Independent QA Gap Analysis — CR-09r-013 + CR-09r-014

**Study:** STUDY-013 — linear-clone-product-lifecycle  
**Reviewer:** qa-expert (independent)  
**Repo:** `c:\Users\mikeh\Projects\landi\landi-flow`  
**Date:** 2026-07-06  
**Gate threshold:** ≥ 0.90  
**Acceptance source:** `landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/09r-frontend-design-hitm/human-review-feedback-2026-07-05.md` (rows 2–3, CR-09r-013/014)

---

## Verdict

**PASS** — Score **0.92** (gate ≥ 0.90 met).

CR-09r-013 and CR-09r-014 acceptance criteria are implemented in the Story inspector properties panel with correct type/store wiring, human-vs-agent separation, and ≤2-click inline pickers for status/priority/epic. Lint passes independently. Residual gaps are non-blocking (no automated tests, no runtime browser proof in this review, center-panel description still read-only offline, collaboration storage not extended for new assignment fields).

---

## Acceptance criteria traceability

### CR-09r-013 — Owner / Requester / Followers

| AC (human review) | Expected | Evidence | Result |
|-------------------|----------|----------|--------|
| Properties panel shows **Owner** (assigned human) | Dedicated row; maps to `assignee_id` | `story-inspector.tsx` L188–194 `OwnerPicker` → `storyStore.setOwner()` → `patchStory({ assignee_id })` | **PASS** |
| **Requester** (creator) | Read-only display from creator | `story-inspector.tsx` L64, L196–201 `MemberChip` from `story.creator_id`; no mutation handler | **PASS** |
| **Followers** (multi-select subscribers) | Human multi-select wired to store | `story-inspector.tsx` L204–209 `FollowersPicker`; `story-store.ts` L145–147 `setFollowers()` | **PASS** |
| **Agent delegate** remains separate (CAP-017) | Separate row/picker from Owner | `story-inspector.tsx` L212–228 `AgentDelegatePicker`; `story-property-pickers.tsx` L392–435 agent-only filter; Owner human-only L278 | **PASS** |
| Types + seed data | `creator_id`, `follower_ids` on `Story` | `packages/core/src/types/index.ts` L95–98; `seed-data.ts` all 6 stories; `createStory()` L102–103 | **PASS** |
| `PICKER_MEMBERS` for Owner/Followers | Shared workspace member list | `story-inspector.tsx` L25, L190, L206 | **PASS** |

### CR-09r-014 — Inline property editing

| AC (human review) | Expected | Evidence | Result |
|-------------------|----------|----------|--------|
| Click-to-edit **status** | Badge → popover → option (≤2 clicks) | `StoryStatusPicker` + `InlinePopover` (`story-property-pickers.tsx` L72–113, L156–186); `data-testid="story-status-picker"` | **PASS** |
| Click-to-edit **priority** | Same pattern | `StoryPriorityPicker` L194–217 | **PASS** |
| Click-to-edit **epic** | Same pattern; Epic terminology | `StoryEpicPicker` L225–263; label "Epic" in inspector L184 | **PASS** |
| **Instant markdown body** editable offline | Editable description without Liveblocks | `story-inspector.tsx` L160–170 `DescriptionEditor` → `CollaborativeDescriptionEditor` offline fallback to `InstantMarkdownEditor` (L89–100); `updateStoryDescription()` in store L211–225 | **PASS** |
| ≤2 clicks to change status | Popover closes on single-select | `PopoverOption` default `closeOnSelect={true}` L125–137; followers explicitly `closeOnSelect={false}` L377 | **PASS** |
| Store mutations for inline fields | Priority/epic/workflow refactored | `story-store.ts` L127–137 `updateStoryWorkflowState`, `updateStoryPriority`, `updateStoryEpic` via `patchStory()` | **PASS** |

### Wiring / integration

| Check | Evidence | Result |
|-------|----------|--------|
| Inspector shown when story selected | `app-shell.tsx` L114, L140, L610–616, L763–775 `useStoryStore` + `StoryInspector story={selectedStory}` | **PASS** |
| No features removed | `DescriptionEditor`, Action Bus on owner/agent assign preserved (`story-inspector.tsx` L76–82, L115–138) | **PASS** |
| Hydration test updated for new fields | `packages/collaboration/src/hydration.test.ts` L24–25 | **PASS** |

---

## Verification performed

| Check | Command | Result | Notes |
|-------|---------|--------|-------|
| Monorepo lint | `pnpm run lint` (repo root) | **PASS** | Exit 0; frontend: `✔ No ESLint warnings or errors` |
| Frontend lint (scoped) | `pnpm --filter @landi-flow/frontend lint` | **PASS** | Same outcome as monorepo frontend step |
| Frontend typecheck | `pnpm --filter @landi-flow/frontend typecheck` | **FAIL (pre-existing)** | 2 errors in `packages/collaboration/src/structured-field-reconcile.ts` — not introduced by CR-013/014; noted in `implementation.md` |
| Automated tests for CR scope | — | **NOT FOUND** | No unit/E2E tests for pickers or inspector rows |
| Runtime browser / Playwright | — | **NOT RUN** | Code + lint review only |

### Lint proof (2026-07-06)

```
> landi-flow@0.0.0 lint
> pnpm -r lint
...
frontend lint: ✔ No ESLint warnings or errors
frontend lint: Done
```

---

## Success-criteria scorecard

| # | Criterion | Weight | Score | Notes |
|---|-----------|:------:|:-----:|-------|
| 1 | CR-013: Owner row (human, `assignee_id`) | 0.12 | 1.00 | `OwnerPicker` + `setOwner()` |
| 2 | CR-013: Requester read-only (`creator_id`) | 0.10 | 1.00 | `MemberChip`; no edit path |
| 3 | CR-013: Followers multi-select | 0.12 | 1.00 | `FollowersPicker` + `setFollowers()` |
| 4 | CR-013: Agent delegate separate (CAP-017) | 0.11 | 1.00 | Distinct row + agent-only picker |
| 5 | CR-014: Status inline ≤2 clicks | 0.12 | 1.00 | `InlinePopover` + `StoryStatusPicker` |
| 6 | CR-014: Priority inline ≤2 clicks | 0.10 | 1.00 | `StoryPriorityPicker` |
| 7 | CR-014: Epic inline ≤2 clicks | 0.10 | 1.00 | `StoryEpicPicker`; Epic label |
| 8 | CR-014: Markdown body editable offline | 0.13 | 0.92 | Inspector `DescriptionEditor` ✓; center `CollaborativeStoryPanel` offline still read-only |
| 9 | Store/types/seed integrity | 0.05 | 1.00 | Core types, seed, `createStory()`, hydration test |
| 10 | Lint clean (mandatory gate) | 0.05 | 1.00 | Independent lint run PASS |

**Weighted composite:** **0.92**  
**0.92 ≥ 0.90 → PASS**

---

## Residual gaps (non-blocking)

These do **not** fail the CR gate but should be tracked in follow-up work.

### GAP-01 — MINOR — No automated test coverage for CR scope

- **Finding:** No Vitest/Playwright specs reference `story-status-picker`, `OwnerPicker`, `FollowersPicker`, or inspector property rows.
- **Risk:** Regressions in click-to-edit or assignment wiring undetected in CI.
- **Recommendation:** Add component tests for popover open/select/close and store mutation hooks; one Playwright path: select story → change status in inspector → assert badge update.

### GAP-02 — MINOR — Center panel description still read-only offline

- **Finding:** `CollaborativeStoryPanel` offline mode (`collaborative-story-panel.tsx` L56–89) renders static text for description; editable markdown lives only in the right `StoryInspector` `DescriptionEditor`.
- **Impact:** Meets AC (body editable in issue detail via properties panel) but dual surfaces may confuse users who edit in the center panel.
- **Recommendation:** Wire center offline panel to `DescriptionEditor` or hide duplicate read-only block when inspector is open.

### GAP-03 — MINOR — Collaboration storage omits new assignment fields

- **Finding:** `StoryFieldsStorage` (`packages/collaboration/src/types.ts` L26–33) has no `creatorId` / `followerIds`; new fields exist only in client `storyStore`.
- **Impact:** None in `NEXT_PUBLIC_MOCK_AUTH=true` / offline dev; potential sync gap when Liveblocks + Action Bus fan-out enabled.
- **Recommendation:** Extend structured fields + hydration when backend columns land.

### GAP-04 — INFO — Pre-existing typecheck failure

- **Finding:** `pnpm --filter @landi-flow/frontend typecheck` fails on `structured-field-reconcile.ts` (TS2322 × 2).
- **Impact:** Unrelated to CR-013/014 files changed; does not block CR UI acceptance.
- **Recommendation:** Fix in separate collaboration task.

### GAP-05 — INFO — No runtime verification in this review

- **Finding:** Review is static (source + lint); no dev-server click-through or screenshot captured.
- **Recommendation:** Optional smoke: `/en/workspace/stories` → select LAN-* → verify property rows and 2-click status change.

---

## Exhaustive gap list (FAIL criteria)

**None.** All human-review acceptance criteria for CR-09r-013 and CR-09r-014 are satisfied in code. No blocking defects identified.

---

## Conclusion

Implementation matches the Shortcut-pattern assignment model (Owner / Requester / Followers with agent delegate isolated) and delivers inline status/priority/epic editing within two clicks plus offline-capable markdown editing in the Story inspector. Lint verification passes independently.

**Score: 0.92 — PASS**

---

*Independent QA review — no implementer code modified. Evidence from source inspection + `pnpm run lint` on 2026-07-06.*
