# Brand logo asset pipeline (task-09v)

## Current state (iteration-0 complete)

Landi Flow ships a **production-quality brand asset pipeline** with gemini-3.1 JPG regeneration executed (2026-07-07):

| Asset | Format | Role |
|-------|--------|------|
| `logomark-primary.svg` | SVG (canonical) | Sidebar mark at 32px+ |
| `logo-wordmark-horizontal.svg` | SVG (canonical) | Footer wordmark at opacity-60 |
| `logomark-primary.jpg` | JPG (fallback) | OG/social; gemini regen target |
| `logo-wordmark-horizontal.jpg` | JPG (fallback) | Social; gemini regen target |

Paths are centralized in `frontend/src/lib/correlation.ts` (`brandAssets`). Assets sync to `frontend/public` via `frontend/scripts/sync-public-assets.mjs` on prebuild.

Registry: `public/assets/logo/image-manifest.json` (checksums, chief-ux criteria, pipeline status).

Visual review: Storybook **Brand/BrandAssetsPreview** (`packages/ui/src/brand/brand-assets.stories.tsx`).

## Scripts

| Script | Purpose |
|--------|---------|
| `node scripts/optimize-brand-svgs.mjs` | Minify SVGs, refresh manifest checksums |
| `node scripts/regenerate-brand-logos.mjs --dry-run` | Validate regen readiness (no API key) |
| `node scripts/regenerate-brand-logos.mjs` | Regenerate JPGs via Gemini (requires `GEMINI_API_KEY`) |

Root `package.json` shortcuts:

```bash
pnpm run brand:optimize-svgs
pnpm run brand:regen-logos:dry-run
pnpm run brand:regen-logos
```

## Regeneration with Gemini (when `GEMINI_API_KEY` is set)

1. **Model:** Workflow specifies `gemini-3.1-pro-image-preview`; Google AI API resolves to published `gemini-3.1-flash-image-preview` (Nano Banana 2) when the pro alias is absent. Both are recorded in `image-manifest.json` (`requested_model` + `source_model`).
2. **Run:**

   ```powershell
   $env:GEMINI_API_KEY = "your-key"
   pnpm run brand:regen-logos
   pnpm run brand:optimize-svgs
   pnpm --filter @landi-flow/frontend prebuild
   ```

3. **Prompts** (embedded in `scripts/regenerate-brand-logos.mjs`):
   - **Logomark:** squircle mark, indigo/violet gradient, minimal geometric flow motif, dark-mode friendly, no text.
   - **Wordmark:** horizontal lockup "Landi Flow", same palette, legible at 24px height.
4. **Output:** 512×512 (mark), 1200×400 (wordmark), JPG.
5. **Post-regen:** Manifest `source_model` and `regen_status` updated automatically.

SVG assets remain canonical for in-app UI scaling; JPG regen updates OG/social fallbacks.

## UX review checklist (chief-ux sign-off)

- [x] Logomark readable at 32px sidebar width — SVG canonical; Storybook `SidebarMark32px`
- [x] Wordmark legible in footer at `opacity-60` — Storybook `FooterWordmark`
- [x] Workspace white-label `logo_url` override takes precedence — Storybook `WorkspaceOverride`; `getWorkspaceLogoUrl` in app-shell

Sign-off artifact: `logs/09-functional-completion/task-09v-brand-assets-logo-regen/iteration-0/review.md`

## Verification

```bash
pnpm run lint
pnpm --filter @landi-flow/frontend prebuild
node scripts/regenerate-brand-logos.mjs --dry-run
pnpm run brand:optimize-svgs
```

Full `pnpm run build-storybook` is blocked by pre-existing frontend modal story imports; brand story typechecks via `packages/ui` lint.
