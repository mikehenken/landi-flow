/** BCP-47 locale codes supported by the frontend i18n pipeline. */

export type WorkspaceLocale = 'en' | 'es' | 'de' | 'ar';



/** White-label theme tokens stored on Workspace.settings per theming-whitelabel-spec. */

export interface WorkspaceThemeSettings {

  brand_primary?: string;

  surface?: string;

  logo_url?: string;

  font_family_heading?: string;

  /** Optional Google Fonts family name for async loading with font-display: swap. */

  font_google_family?: string;

}



/** Configurable entity display labels stored on workspaces.settings.terminology (CR-09r-011). */

export interface WorkspaceTerminologySettings {

  /** Singular story label (default: Story). */

  story?: string;

  /** Plural stories label (default: Stories). */

  stories?: string;

  /** Singular epic label (default: Epic). */

  epic?: string;

  /** Plural epics label (default: Epics). */

  epics?: string;

  /** Workspace noun (default: Workspace). */

  workspace?: string;

}



/** Typed workspace settings for multi-tenant branding and i18n defaults. */

export interface WorkspaceSettings {

  theme?: WorkspaceThemeSettings;

  /** Default locale for workspace members when profile locale is unset. */

  default_locale?: WorkspaceLocale;

  /** Custom hostnames mapped to this workspace (white-label domains). */

  custom_domains?: string[];

  /** White-label entity labels overriding i18n defaults (CR-09r-011). */

  terminology?: WorkspaceTerminologySettings;

}



function parseOptionalString(value: unknown): string | undefined {

  if (typeof value !== 'string') {

    return undefined;

  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;

}



function parseTerminologySettings(

  terminologyRaw: unknown,

): WorkspaceTerminologySettings | undefined {

  if (!terminologyRaw || typeof terminologyRaw !== 'object' || Array.isArray(terminologyRaw)) {

    return undefined;

  }



  const raw = terminologyRaw as Record<string, unknown>;

  const terminology: WorkspaceTerminologySettings = {

    story: parseOptionalString(raw.story),

    stories: parseOptionalString(raw.stories),

    epic: parseOptionalString(raw.epic),

    epics: parseOptionalString(raw.epics),

    workspace: parseOptionalString(raw.workspace),

  };



  const hasValues = Object.values(terminology).some((value) => value !== undefined);

  return hasValues ? terminology : undefined;

}



/** Parse workspace settings from the generic JSON column. */

export function parseWorkspaceSettings(

  settings: Record<string, unknown> | null | undefined,

): WorkspaceSettings {

  if (!settings || typeof settings !== 'object') {

    return {};

  }



  const themeRaw = settings.theme;

  const theme =

    themeRaw && typeof themeRaw === 'object' && !Array.isArray(themeRaw)

      ? (themeRaw as WorkspaceThemeSettings)

      : undefined;



  const defaultLocaleRaw = settings.default_locale;

  const default_locale =

    typeof defaultLocaleRaw === 'string' ? (defaultLocaleRaw as WorkspaceLocale) : undefined;



  const domainsRaw = settings.custom_domains;

  const custom_domains = Array.isArray(domainsRaw)

    ? domainsRaw.filter((d): d is string => typeof d === 'string')

    : undefined;



  const terminology = parseTerminologySettings(settings.terminology);



  return { theme, default_locale, custom_domains, terminology };

}


