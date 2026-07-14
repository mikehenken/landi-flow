/** Brand asset paths — must stay aligned with frontend/src/lib/correlation.ts brandAssets. */
export const BRAND_ASSET_PATHS = {
  logoMark: '/assets/logo/logomark-primary.svg',
  logoWordmark: '/assets/logo/logo-wordmark-horizontal.svg',
  logoMarkJpg: '/assets/logo/logomark-primary.jpg',
  logoWordmarkJpg: '/assets/logo/logo-wordmark-horizontal.jpg',
} as const;

export interface BrandAssetsPreviewProps {
  /** Simulate app-shell sidebar mark width. */
  markSizePx?: number;
  /** Simulate footer wordmark width. */
  wordmarkWidthPx?: number;
  /** Simulate footer opacity-60 treatment. */
  wordmarkOpacity?: number;
  /** Override mark URL (workspace white-label). */
  logoOverrideUrl?: string;
  showLabels?: boolean;
}

/**
 * Visual preview of Landi Flow brand assets at production display sizes.
 * Used for chief-ux sign-off and Storybook regression capture.
 */
export function BrandAssetsPreview({
  markSizePx = 32,
  wordmarkWidthPx = 120,
  wordmarkOpacity = 0.6,
  logoOverrideUrl,
  showLabels = true,
}: BrandAssetsPreviewProps) {
  const markSrc = logoOverrideUrl ?? BRAND_ASSET_PATHS.logoMark;
  const wordmarkSrc = BRAND_ASSET_PATHS.logoWordmark;

  return (
    <div className="space-y-8" data-testid="brand-assets-preview">
      <section className="space-y-3" data-testid="brand-mark-preview">
        {showLabels ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Sidebar logomark ({markSizePx}px)
          </p>
        ) : null}
        <div
          className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4"
          style={{ width: 'fit-content' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={markSrc}
            alt="Landi Flow logomark"
            width={markSizePx}
            height={markSizePx}
            className="shrink-0"
            data-testid="brand-logomark"
          />
          <span className="text-sm text-foreground">Landi Flow</span>
        </div>
      </section>

      <section className="space-y-3" data-testid="brand-wordmark-preview">
        {showLabels ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Footer wordmark (opacity {Math.round(wordmarkOpacity * 100)}%)
          </p>
        ) : null}
        <div className="rounded-lg border border-border bg-surface p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wordmarkSrc}
            alt="Landi Flow wordmark"
            width={wordmarkWidthPx}
            height={24}
            className="h-5 w-auto"
            style={{ opacity: wordmarkOpacity }}
            data-testid="brand-wordmark"
          />
        </div>
      </section>

      <section className="space-y-3" data-testid="brand-format-compare">
        {showLabels ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            SVG vs JPG at 32px (scaling quality)
          </p>
        ) : null}
        <div className="flex items-end gap-6 rounded-lg border border-border bg-surface p-4">
          <div className="text-center space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_ASSET_PATHS.logoMark}
              alt="SVG mark"
              width={32}
              height={32}
              data-testid="brand-mark-svg"
            />
            <span className="text-[10px] text-muted-foreground">SVG</span>
          </div>
          <div className="text-center space-y-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRAND_ASSET_PATHS.logoMarkJpg}
              alt="JPG mark"
              width={32}
              height={32}
              data-testid="brand-mark-jpg"
            />
            <span className="text-[10px] text-muted-foreground">JPG</span>
          </div>
        </div>
      </section>
    </div>
  );
}
