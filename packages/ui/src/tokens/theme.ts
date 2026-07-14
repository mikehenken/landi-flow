import type { CSSProperties } from 'react';

/** CSS custom property keys allowed for workspace white-label overrides. */
export const OVERRIDABLE_THEME_KEYS = [
  'brand-primary',
  'surface',
  'font-family-heading',
] as const;

export type OverridableThemeKey = (typeof OVERRIDABLE_THEME_KEYS)[number];

/** HSL string format used by CSS variables (e.g. "235 86% 65%"). */
export type HslToken = string;

/** Workspace theme payload per theming-whitelabel-spec. */
export interface WorkspaceThemePayload {
  theme: {
    brand_primary?: HslToken;
    surface?: HslToken;
    logo_url?: string;
    font_family_heading?: string;
  };
}

/** Default Landi Flow brand tokens (#131316 bg, #5e6ad2 accent). */
export const DEFAULT_THEME_TOKENS: Record<string, HslToken> = {
  background: '240 5% 8%',
  foreground: '0 0% 98%',
  surface: '240 5% 10%',
  'surface-elevated': '240 5% 14%',
  'surface-overlay': '240 5% 18%',
  'foreground-muted': '240 5% 65%',
  'foreground-subtle': '240 5% 45%',
  border: '240 5% 18%',
  'border-subtle': '240 5% 14%',
  'brand-primary': '235 86% 65%',
  'primary-foreground': '0 0% 100%',
  input: '240 5% 18%',
  ring: '235 86% 65%',
  'status-todo': '240 5% 65%',
  'status-in-progress': '217 91% 60%',
  'status-done': '235 86% 65%',
  'status-canceled': '0 0% 40%',
  'status-error': '0 84% 60%',
  'status-warning': '35 92% 60%',
};

/** Maps workspace payload keys to CSS variable names. */
export function mapWorkspaceThemeToCssVars(
  payload: WorkspaceThemePayload['theme'],
): Record<string, string> {
  const vars: Record<string, string> = {};

  if (payload.brand_primary) {
    vars['--brand-primary'] = payload.brand_primary;
    vars['--ring'] = payload.brand_primary;
  }

  if (payload.surface) {
    vars['--surface'] = payload.surface;
  }

  if (payload.font_family_heading) {
    vars['--font-family-heading'] = payload.font_family_heading;
  }

  return vars;
}

/** Converts CSS vars record to React inline style object. */
export function cssVarsToStyle(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}
