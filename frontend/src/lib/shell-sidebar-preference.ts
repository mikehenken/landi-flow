/** User preference for app shell left sidebar collapsed state (task-09t). */
export const SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY = 'landi-flow:shell-sidebar-collapsed';

/** Default: sidebar open (expanded) on desktop. */
export const DEFAULT_SHELL_SIDEBAR_COLLAPSED = false;

export function isShellSidebarCollapsedValue(value: string): boolean {
  return value === 'true' || value === 'false';
}

export function parseShellSidebarCollapsedValue(value: string): boolean {
  return value === 'true';
}

export function readShellSidebarCollapsedPreference(): boolean {
  if (typeof window === 'undefined') {
    return DEFAULT_SHELL_SIDEBAR_COLLAPSED;
  }

  try {
    const stored = window.localStorage.getItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY);
    if (stored !== null && isShellSidebarCollapsedValue(stored)) {
      return parseShellSidebarCollapsedValue(stored);
    }
  } catch {
    // localStorage may be unavailable (private mode, SSR hydration guard)
  }

  return DEFAULT_SHELL_SIDEBAR_COLLAPSED;
}

export function writeShellSidebarCollapsedPreference(collapsed: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY,
      collapsed ? 'true' : 'false',
    );
  } catch {
    // Ignore quota / privacy errors
  }
}
