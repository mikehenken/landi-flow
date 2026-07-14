# Independent Architecture Review — task-09a-dev-frontend (iteration 2)

**Study:** STUDY-013 — linear-clone-product-lifecycle
**Phase:** 09 Development
**Task:** task-09a-dev-frontend
**Reviewer:** architect-reviewer (independent re-review)
**Implementer:** nextjs-developer
**Repo:** `c:\Users\mikeh\Projects\landi\landi-flow`
**Frontend commit reviewed:** `2156682` (`fix(frontend): repair prebuild asset sync and G-key nav (task-09a iter 2)`)
**Tree state at review:** HEAD `285f7a0` (backend iter 2); `git diff 2156682..HEAD -- frontend` is **empty**, so the reviewed frontend is byte-identical to `2156682`.
**Date:** 2026-07-04
**Environment:** Node v24.3.0, pnpm 9.15.0

---

## Verdict

**PASS** — Score **0.96** (gate ≥ 0.90 met).

All four gaps from the iteration-1 independent review (GAP-01 BLOCKER, GAP-02 MAJOR, GAP-03 MINOR, GAP-04 MINOR) are **verified FIXED** against the reviewed frontend commit, with evidence reproduced independently on this machine. The single blocking defect — the canonical `pnpm build` failing at the `prebuild` lifecycle hook — is resolved, and the fix was validated on a **fully clean tree** (with `frontend/public` deleted so the `prebuild` hook had to repopulate it). Brand-asset delivery is now git-tracked and reproducible. The prior false "build PASS" claims in the report/self-review have been corrected.

Two minor, non-blocking residuals remain (see below): no CI regression guard yet for the lifecycle-hook build, and a small UX edge in the G-cancel path. Neither affects the gate.

---

## Gap re-verification (evidence)

All commands run against the reviewed frontend tree (identical to `2156682`).

### GAP-01 — BLOCKER — `pnpm build` fails at `prebuild` → **FIXED**
- **Fix:** `frontend/scripts/sync-public-assets.mjs` no longer contains TypeScript annotations. `copyRecursive(src, dest)` is now valid plain ESM (was `copyRecursive(src: string, dest: string): void`).
- **Evidence:**
  - `node ./frontend/scripts/sync-public-assets.mjs` → exit 0, `Synced public assets to frontend/public` (no `SyntaxError`).
  - `NEXT_PUBLIC_MOCK_AUTH=true pnpm --filter @landi-flow/frontend build` → **exit 0**; `prebuild` ran the sync, then `next build` compiled and generated **11 routes** (`✓ Compiled successfully in 7.7s`, `✓ Generating static pages (11/11)`).
- **Verdict:** Resolved. Canonical build passes via the full pnpm lifecycle (hooks included), not just `next build`.

### GAP-02 — MAJOR — Brand-asset delivery broken / assets untracked → **FIXED**
- **Fix:** Brand assets are now committed at the tracked repo-root `public/assets/**`; `frontend/public` remains a generated (untracked) copy produced by `prebuild`.
- **Evidence:**
  - `git ls-files public` → 10 tracked assets (`logo/`, `admin/`, `landing/`, `og/`, `favicons/`, `marketing/`).
  - `git ls-files frontend/public` → empty (correctly generated, not committed — no duplicate tree).
  - Clean-tree proof: deleted `frontend/public`, ran the build; `prebuild` recreated `frontend/public/assets/**` (all 10 files present) and the build succeeded with **no pre-existing assets**. `brandAssets` paths in `correlation.ts` map 1:1 to the delivered files.
- **Verdict:** Resolved. Assets survive a clean checkout via the working `prebuild` hook.

### GAP-03 — MINOR — Report/self-review falsely asserted "build PASS" → **FIXED**
- **Fix:** Documentation now reflects the re-verified canonical build.
  - `outputs/.../frontend-implementation-report.md` states `pnpm build` PASS **"— includes prebuild hook"** and adds an explicit *Iteration 1 correction* explaining the `.mjs`-annotation root cause.
  - `logs/.../iteration-2/self-review.md` and `execution-log.md` record the full-lifecycle re-run and note the iteration-1 false claim.
  - `frontend/src/lib/correlation.ts` comment corrected from "symlinked" to "copied to frontend/public via prebuild" (doc-drift resolved).
- **Verdict:** Resolved.

### GAP-04 — MINOR — Any key after `G` consumed as G-secondary → **FIXED**
- **Fix:** In `use-keyboard-navigation.ts`, while `awaitingGSecondary`, only `i`/`s`/`e` (a `G_SECONDARY_KEYS` set) are `preventDefault()`'d and dispatched via `onGSecondary`; any other key calls `onCancelGSecondary()` **without** `preventDefault`, exiting G-mode. `app-shell.tsx` wires `onCancelGSecondary` (clears `awaitingGSecondary` + hint state), and `handleGKeyNavigation` also resets state on a valid key.
- **Evidence:** Source inspected (`use-keyboard-navigation.ts` L62–71; `app-shell.tsx` L105–124, L143–147).
- **Verdict:** Resolved for the reported defect. **Residual (minor):** a non-matching key still triggers an early `return` in the handler, so on that same keypress it cancels G-mode but does not also perform its own action (e.g., `G` then `C` cancels but won't create a story on that press; the next `C` works). Cosmetic; non-blocking.

---

## Verification performed

| Check | Command | Result | Evidence |
|-------|---------|--------|----------|
| Sync script (GAP-01) | `node ./frontend/scripts/sync-public-assets.mjs` | **PASS** | exit 0, no `SyntaxError` |
| Clean-tree assets (GAP-02) | delete `frontend/public`, run sync | **PASS** | all 10 `assets/**` repopulated |
| Asset tracking (GAP-02) | `git ls-files public` / `frontend/public` | **PASS** | 10 tracked at root; frontend generated |
| Typecheck | `pnpm --filter @landi-flow/frontend typecheck` | **PASS** | `tsc --noEmit` exit 0 |
| Lint | `pnpm --filter @landi-flow/frontend lint` | **PASS** | "✔ No ESLint warnings or errors" |
| Build (canonical) | `NEXT_PUBLIC_MOCK_AUTH=true pnpm --filter @landi-flow/frontend build` | **PASS** | prebuild + `next build`; 11 routes; exit 0 |
| G-key guard (GAP-04) | source review | **PASS** | `G_SECONDARY_KEYS` gate + `onCancelGSecondary` |
| Doc accuracy (GAP-03) | report / self-review / `correlation.ts` | **PASS** | canonical build claim; correction note; comment fixed |

---

## Success-criteria scorecard

| # | Criterion | iter 1 | iter 2 | Weight | Score | Notes |
|---|-----------|:------:|:------:|:------:|:-----:|-------|
| 1 | Next.js App Router + three-panel layout | PASS | PASS | 0.15 | 1.00 | 11 routes build; unchanged |
| 2 | Epic board, Story list, command menu, keyboard nav | PASS | PASS | 0.15 | 1.00 | + GAP-04 G-key guard tightened |
| 3 | Consumes `@landi-flow/ui` exclusively | PASS | PASS | 0.10 | 1.00 | unchanged |
| 4 | Event-driven stores wired to UI | PASS | PASS | 0.15 | 1.00 | unchanged |
| 5 | Brand assets wired from `public/assets/` | PARTIAL (0.55) | **PASS** | 0.10 | 1.00 | assets tracked; prebuild delivers on clean tree |
| 6 | HITM Epic-not-Project; OBS-001 correlation_id | PASS | PASS | 0.15 | 1.00 | unchanged |
| 7 | typecheck / lint / build pass | FAIL (0.30) | **PASS** | 0.15 | 1.00 | canonical `pnpm build` exit 0 (hooks included) |
| 8 | Actual code in repo | PASS | PASS | 0.05 | 1.00 | real code at `2156682` |

**Weighted composite (scorecard): 1.00.** Adjusted to **0.96** to reflect two minor non-blocking residuals (no CI guard for the full-lifecycle build; GAP-04 cancel-key early-return edge). **0.96 ≥ 0.90 → PASS.**

---

## Residuals & recommendations (non-blocking)

1. **CI regression guard (recommended in iter 1, still open):** No `.github/` workflow runs `pnpm --filter @landi-flow/frontend build`. Because GAP-01 was a lifecycle-hook failure invisible to `next build` alone, add a CI step invoking the full `build` so hook breakage is caught. Tracked honestly in the self-review deferrals.
2. **GAP-04 cancel-key edge:** Consider not consuming the non-matching key (let it fall through to its own handler) so `G`→`C` creates on the same press. Cosmetic.
3. **GAP-05 deferrals (unchanged, legitimately out of iteration-2 scope):** AC-NAV-03 transient tooltip, AC-PROG-01 filter panel, AC-PROG-03 role-based DOM trimming, AC-KEY-01/02/03 (no Create modal yet), AC-OBS-02 error toasts, Create Epic/Story modals + validation, `next-intl` App Router plugin, Playwright E2E. These do not affect the gate and are appropriately documented.

---

## Conclusion

The iteration-2 remediation is genuine and complete for the gaps it targeted. The blocking build failure (GAP-01) and the asset-delivery failure (GAP-02) are fixed and independently reproduced on a clean tree; the documentation-accuracy (GAP-03) and keyboard-UX (GAP-04) fixes are in place. Criteria 5 and 7 rise from PARTIAL/FAIL to PASS, clearing the 0.90 gate.

**Score: 0.96 — PASS.**

---

*Independent re-review — no implementer code was modified. All findings reproduced against the frontend tree at commit `2156682` (Node v24.3.0, pnpm 9.15.0).*
