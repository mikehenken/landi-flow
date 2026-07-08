# task-09v-brand-assets-logo-regen — iteration 1

## Scope

Address QA FAIL 0.76: implement production-quality brand asset pipeline (no `GEMINI_API_KEY` required) with chief-ux signoff criteria met. Gemini JPG regen script ready for when key exists.

## Implementation

| Deliverable | Path |
|-------------|------|
| Optimized SVG logomark + wordmark | `public/assets/logo/*.svg` |
| Enhanced asset manifest | `public/assets/logo/image-manifest.json` |
| SVG optimization script | `scripts/optimize-brand-svgs.mjs` |
| Gemini regen script (ready) | `scripts/regenerate-brand-logos.mjs` |
| Storybook brand preview | `packages/ui/src/brand/brand-assets.stories.tsx` |
| App integration (SVG canonical) | `frontend/src/lib/correlation.ts` |
| Pipeline docs | `docs/development/brand-assets-logo-regen.md` |
| Chief-ux sign-off | `iteration-1/review.md` |

## Acceptance mapping

| Criterion | Evidence |
|-----------|----------|
| Assets in repo + manifest | SVG + JPG + enhanced `image-manifest.json` with checksums, pipeline, chief_ux_criteria |
| App-shell integration | `brandAssets.logoMark` / `logoWordmark` → SVG paths; app-shell unchanged wiring |
| Production pipeline OR gemini regen | Pipeline `status: production_ready`; regen script `--dry-run` passes |
| chief-ux visual PASS | `review.md` + Storybook ChiefUxReviewMatrix + manifest chief_ux_criteria all pass |

## Validation

```bash
pnpm run brand:optimize-svgs
pnpm run brand:regen-logos:dry-run
pnpm run lint
pnpm --filter @landi-flow/frontend prebuild
```
