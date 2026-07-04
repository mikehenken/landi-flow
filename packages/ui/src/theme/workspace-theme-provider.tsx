'use client';

import * as React from 'react';
import {
  mapWorkspaceThemeToCssVars,
  type WorkspaceThemePayload,
} from '@/tokens/theme';

export interface WorkspaceThemeProviderProps {
  theme?: WorkspaceThemePayload['theme'];
  logoUrl?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Injects workspace-specific CSS custom properties for white-label theming.
 * Restricted overrides per theming-whitelabel-spec (brand-primary, surface, logo).
 */
export function WorkspaceThemeProvider({
  theme,
  logoUrl,
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

  return (
    <div
      className={className}
      style={style}
      data-logo-url={resolvedLogoUrl ?? undefined}
    >
      {children}
    </div>
  );
}

export { mapWorkspaceThemeToCssVars, type WorkspaceThemePayload } from '@/tokens/theme';
