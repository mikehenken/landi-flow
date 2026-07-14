import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_ENV_KEYS } from '@landi-flow/auth/env';
import type { LinearCloneSupabaseClient } from '@landi-flow/auth';
import { LINEAR_CLONE_SCHEMA } from '@landi-flow/auth/schema';
import { productionCookieDomain } from '@/lib/supabase/cookie-domain';

export interface SessionUpdateResult {
  supabaseResponse: NextResponse;
  user: User | null;
  supabase: LinearCloneSupabaseClient;
}

export async function updateSession(request: NextRequest): Promise<SessionUpdateResult> {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env[AUTH_ENV_KEYS.supabaseUrl];
  const supabaseAnonKey = process.env[AUTH_ENV_KEYS.supabaseAnonKey];

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Missing ${AUTH_ENV_KEYS.supabaseUrl} or ${AUTH_ENV_KEYS.supabaseAnonKey}`
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: LINEAR_CLONE_SCHEMA },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            domain: productionCookieDomain(request),
          })
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user, supabase };
}
