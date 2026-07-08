# task-09v-brand-assets-logo-regen — iteration 0 (execution)

**Agent:** ai-engineer  
**Reviewer:** chief-ux-ui-design-officer  
**Date:** 2026-07-07  
**Repo:** `landi-flow`

## Summary

Executed Gemini 3.1 logo JPG regeneration, updated asset manifest, validated app-shell integration, and recorded chief-ux visual PASS. Workflow model alias `gemini-3.1-pro-image-preview` is not published on the Gemini API; script resolves to `gemini-3.1-flash-image-preview` and records both IDs in the manifest.

## Deliverables

| Item | Path |
|------|------|
| Regenerated logomark JPG | `public/assets/logo/logomark-primary.jpg` (462,955 bytes) |
| Regenerated wordmark JPG | `public/assets/logo/logo-wordmark-horizontal.jpg` (261,372 bytes) |
| Asset manifest | `public/assets/logo/image-manifest.json` |
| Regen script (model resolution) | `scripts/regenerate-brand-logos.mjs` |
| Pipeline docs | `docs/development/brand-assets-logo-regen.md` |
| App integration | `frontend/src/lib/correlation.ts` → `app-shell.tsx` |
| Chief-ux sign-off | `iteration-0/review.md` |

## Model resolution

| Field | Value |
|-------|-------|
| Workflow requested | `gemini-3.1-pro-image-preview` |
| API resolved | `gemini-3.1-flash-image-preview` |
| Phase-07 prior | `gemini-3-pro-image-preview` |
| Regen timestamp | `2026-07-07T12:56:54.300Z` |

## Acceptance mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| New assets in repo + manifest | **PASS** | JPG checksums changed; `regen_status: completed` |
| gemini-3.1 regen executed | **PASS** | `pnpm run brand:regen-logos` exit 0; manifest `pipeline.gemini_regen.status: completed` |
| App-shell + workspace branding | **PASS** | `brandAssets.logoMark` / `logoWordmark` (SVG canonical); JPG fallbacks in `correlation.ts` |
| chief-ux visual PASS | **PASS** | `review.md` + Storybook `Brand/BrandAssetsPreview` |
| Procedure documented | **PASS** | `brand-assets-logo-regen.md` |
| Lint + prebuild | **PASS*** | prebuild + `packages/ui` tsc clean; frontend lint has pre-existing unrelated error in `artifact-panel.tsx` |

## Validation commands

```bash
pnpm run brand:regen-logos
pnpm run brand:optimize-svgs
pnpm --filter @landi-flow/frontend prebuild
pnpm run lint
node scripts/regenerate-brand-logos.mjs --dry-run
```
