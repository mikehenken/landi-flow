import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

/** Time to wait for cookie-backed session hydration after SSR / OAuth redirect. */
export const SESSION_BOOTSTRAP_MS = 8_000;

const RETRY_DELAYS_MS = [100, 250, 500, 1000] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Reads the browser Supabase session without calling `getUser()`.
 *
 * `getUser()` throws `Auth session missing!` when the SSR cookie store has not
 * hydrated yet. This helper uses `getSession()`, `INITIAL_SESSION`, and short
 * retries to avoid that race after OAuth redirects.
 */
export async function bootstrapSupabaseSession(): Promise<Session | null> {
  const supabase = createClient();

  const {
    data: { session: initialSession },
  } = await supabase.auth.getSession();

  if (initialSession) {
    return initialSession;
  }

  const initialEventSession = await new Promise<Session | null>((resolve) => {
    let settled = false;

    const finish = (session: Session | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
      resolve(session);
    };

    const timeoutId = setTimeout(() => {
      finish(null);
    }, SESSION_BOOTSTRAP_MS);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        finish(session);
        return;
      }

      if (event === 'INITIAL_SESSION') {
        finish(null);
      }
    });
  });

  if (initialEventSession) {
    return initialEventSession;
  }

  for (const delayMs of RETRY_DELAYS_MS) {
    await sleep(delayMs);
    const {
      data: { session: retrySession },
    } = await supabase.auth.getSession();
    if (retrySession) {
      return retrySession;
    }
  }

  return null;
}
