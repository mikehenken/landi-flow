import { createBrowserClient } from '@supabase/ssr';
import { LINEAR_CLONE_SCHEMA } from '@landi-flow/auth/schema';

/**
 * Browser Supabase client — cookie-backed PKCE session (real auth, no mock).
 * Use static `process.env.NEXT_PUBLIC_*` reads so Next.js inlines values in the client bundle.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: LINEAR_CLONE_SCHEMA },
    isSingleton: true,
  });
}

export function createLinearCloneBrowserClient() {
  return createClient();
}
