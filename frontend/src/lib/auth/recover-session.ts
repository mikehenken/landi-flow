import { ApiRequestError } from '@/lib/api/client';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@landi-flow/ui/i18n';
import { createClient } from '@/lib/supabase/client';

const AUTH_RECOVERY_RELOAD_KEY = 'landi-flow:auth-recovery-reload';

let authRecoveryInFlight = false;

export function isAuthFailure(error: unknown): boolean {
  if (error instanceof ApiRequestError && error.status === 401) {
    return true;
  }

  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    return (
      lower.includes('authentication required') ||
      lower.includes('unauthorized') ||
      lower.includes('session missing') ||
      lower.includes('sign in')
    );
  }

  return false;
}

export function extractLocaleFromPath(pathname: string): string {
  const first = pathname.split('/').filter(Boolean)[0];
  if (first && (SUPPORTED_LOCALES as readonly string[]).includes(first)) {
    return first;
  }
  return DEFAULT_LOCALE;
}

export function buildLoginRedirectPath(returnPath: string, locale?: string): string {
  const normalized = returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
  const resolvedLocale = locale ?? DEFAULT_LOCALE;
  return `/${resolvedLocale}/auth/login?redirect=${encodeURIComponent(normalized)}`;
}

/** Clears one-shot reload guard after a successful auth bootstrap. */
export function clearAuthRecoveryReloadGuard(): void {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.removeItem(AUTH_RECOVERY_RELOAD_KEY);
}

/**
 * Attempts to refresh the browser session before forcing a login redirect.
 * Returns true when a usable access token is available after refresh.
 */
export async function tryRefreshBrowserSession(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const supabase = createClient();
    const {
      data: { session: existing },
    } = await supabase.auth.getSession();

    if (existing?.access_token) {
      return true;
    }

    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error) {
      return false;
    }

    return Boolean(refreshed.session?.access_token);
  } catch {
    return false;
  }
}

export interface RecoverSessionOptions {
  /** When false, navigate to login without clearing cookies (avoids SSR/client sign-out races). */
  clearSession?: boolean;
  locale?: string;
}

/**
 * POST to the server sign-out route so SSR cookies are cleared before login.
 * Prevents middleware from bouncing an authenticated user away from /auth/login.
 */
export function submitServerSignOut(returnPath: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `/auth/signout?redirect=${encodeURIComponent(returnPath)}`;
  form.style.display = 'none';
  document.body.appendChild(form);
  form.submit();
}

/**
 * Clears the Supabase session via server sign-out (when needed) and navigates to login.
 * Uses a full navigation so middleware + SSR see a clean cookie state.
 */
export async function recoverSessionAndRedirect(
  returnPath?: string,
  options: RecoverSessionOptions = {},
): Promise<void> {
  if (typeof window === 'undefined' || authRecoveryInFlight) {
    return;
  }
  authRecoveryInFlight = true;

  const destination =
    returnPath ??
    `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const locale = options.locale ?? extractLocaleFromPath(window.location.pathname);
  const loginPath = buildLoginRedirectPath(destination, locale);
  const clearSession = options.clearSession ?? true;

  if (clearSession) {
    const refreshed = await tryRefreshBrowserSession();
    if (refreshed) {
      const alreadyReloaded = sessionStorage.getItem(AUTH_RECOVERY_RELOAD_KEY);
      if (!alreadyReloaded) {
        sessionStorage.setItem(AUTH_RECOVERY_RELOAD_KEY, '1');
        authRecoveryInFlight = false;
        window.location.reload();
        return;
      }
      sessionStorage.removeItem(AUTH_RECOVERY_RELOAD_KEY);
    }

    submitServerSignOut(destination);
    return;
  }

  window.location.replace(loginPath);
}
