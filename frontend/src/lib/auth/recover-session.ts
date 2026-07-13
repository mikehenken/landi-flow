import { ApiRequestError } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';

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

export function buildLoginRedirectPath(returnPath: string): string {
  const normalized = returnPath.startsWith('/') ? returnPath : `/${returnPath}`;
  return `/auth/login?redirect=${encodeURIComponent(normalized)}`;
}

/**
 * Clears the Supabase browser session and navigates to login with a return URL.
 * Uses a full navigation so middleware + SSR see a clean cookie state.
 */
export async function recoverSessionAndRedirect(returnPath?: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const destination =
    returnPath ??
    `${window.location.pathname}${window.location.search}${window.location.hash}`;

  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (signOutError) {
    console.error('[auth] signOut during recovery failed:', signOutError);
  }

  window.location.replace(buildLoginRedirectPath(destination));
}
