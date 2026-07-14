/** User preference for app shell right properties panel visibility. */
export const SHELL_INSPECTOR_OPEN_STORAGE_KEY = 'landi-flow:shell-inspector-open';

/** Default: properties panel open when content is available. */
export const DEFAULT_SHELL_INSPECTOR_OPEN = true;

export function isShellInspectorOpenValue(value: string): boolean {
  return value === 'true' || value === 'false';
}

export function parseShellInspectorOpenValue(value: string): boolean {
  return value === 'true';
}

export function readShellInspectorOpenPreference(): boolean {
  if (typeof window === 'undefined') {
    return DEFAULT_SHELL_INSPECTOR_OPEN;
  }

  try {
    const stored = window.localStorage.getItem(SHELL_INSPECTOR_OPEN_STORAGE_KEY);
    if (stored !== null && isShellInspectorOpenValue(stored)) {
      return parseShellInspectorOpenValue(stored);
    }
  } catch {
    // localStorage may be unavailable (private mode, SSR hydration guard)
  }

  return DEFAULT_SHELL_INSPECTOR_OPEN;
}

export function writeShellInspectorOpenPreference(open: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SHELL_INSPECTOR_OPEN_STORAGE_KEY, open ? 'true' : 'false');
  } catch {
    // Ignore quota / privacy errors
  }
}
