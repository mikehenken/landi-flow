# task-09v-brand-assets-logo-regen — iteration 0

## Scope

Regenerate logo/mark with gemini-3.1-pro-image-preview; integrate in app-shell + workspace branding. **Executed 2026-07-07.**

## Implementation

- Gemini JPG regen via `scripts/regenerate-brand-logos.mjs`
- `public/assets/logo/image-manifest.json` — checksums + `regen_status: completed`
- `docs/development/brand-assets-logo-regen.md` — procedure + model resolution
- App integration: `frontend/src/lib/correlation.ts` → `app-shell` sidebar/footer

## Acceptance mapping

| Criterion | Evidence |
|-----------|----------|
| Assets in repo + manifest | Regenerated JPGs + manifest |
| gemini-3.1 regen | `artifacts/regen-proof.txt` |
| Integrated in app-shell | `brandAssets` in `app-shell.tsx` |
| chief-ux PASS | `review.md` |
| Regen documented | `brand-assets-logo-regen.md` |

See `implementation-report.md` for full detail.
