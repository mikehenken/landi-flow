'use client';

import * as React from 'react';
import {
  mapWorkspaceThemeToCssVars,
  type WorkspaceThemePayload,
} from '@/tokens/theme';

export interface WorkspaceThemeProviderProps {
  theme?: WorkspaceThemePayload['theme'];
  logoUrl?: string;
  /** Google Fonts family for async loading (font-display: swap). */
  fontGoogleFamily?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Loads a Google Font asynchronously with font-display: swap to prevent CLS.
 */
function WorkspaceFontLink({ family }: { family: string }): React.ReactElement {
  const encoded = encodeURIComponent(family.replace(/ /g, '+'));
  const href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700&display=swap`;

  return (
    // eslint-disable-next-line @next/next/no-page-custom-font
    <link rel="stylesheet" href={href} />
  );
}

/**
 * Injects workspace-specific CSS custom properties for white-label theming.
 * Restricted overrides per theming-whitelabel-spec (brand-primary, surface, logo).
 */
export function WorkspaceThemeProvider({
  theme,
  logoUrl,
  fontGoogleFamily,
  children,
  className,
}: WorkspaceThemeProviderProps): React.ReactElement {
  const style = React.useMemo(() => {
    if (!theme) {
      return undefined;
    }
    return mapWorkspaceThemeToCssVars(theme);
  }, [theme]);

  const resolvedLogoUrl = logoUrl ?? theme?.logo_url;
  const googleFamily = fontGoogleFamily ?? undefined;

  return (
    <div
      className={className}
      style={style}
      data-logo-url={resolvedLogoUrl ?? undefined}
    >
      {googleFamily ? <WorkspaceFontLink family={googleFamily} /> : null}
      {children}
    </div>
  );
}

export { mapWorkspaceThemeToCssVars, type WorkspaceThemePayload } from '@/tokens/theme';
