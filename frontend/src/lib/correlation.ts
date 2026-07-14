import type { CorrelationContext } from '@landi-flow/core/types';

/** OBS-001: generate a correlation ID for error boundaries and toasts. */
export function createCorrelationContext(
  causationId?: string,
): CorrelationContext {
  const correlationId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `corr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return causationId
    ? { correlation_id: correlationId, causation_id: causationId }
    : { correlation_id: correlationId };
}

/** Brand asset paths served from monorepo public/assets (copied to frontend/public via prebuild). */
export const brandAssets = {
  /** Canonical SVG — scales cleanly at 32px sidebar width. */
  logoMark: '/assets/logo/logomark-primary.svg',
  logoWordmark: '/assets/logo/logo-wordmark-horizontal.svg',
  /** Phase-07 JPG fallbacks for OG/social and gemini regen targets. */
  logoMarkJpg: '/assets/logo/logomark-primary.jpg',
  logoWordmarkJpg: '/assets/logo/logo-wordmark-horizontal.jpg',
  heroGraphic: '/assets/landing/hero-graphic.jpg',
  emptyEpic: '/assets/admin/empty-state-epic.jpg',
  adminDashboard: '/assets/admin/admin-dashboard-mockup.jpg',
  featureCollaboration: '/assets/landing/feature-human-ai-collaboration.jpg',
  ogImage: '/assets/og/og-image.jpg',
} as const;

export type BrandAssetKey = keyof typeof brandAssets;
