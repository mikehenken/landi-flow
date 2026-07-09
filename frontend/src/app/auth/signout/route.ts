import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { originFromForwardedHeaders } from '@/lib/supabase/cookie-domain';
import { AUTH_ENV_KEYS, getEnv } from '@landi-flow/auth/env';

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const headerStore = await headers();
  const configuredSite = getEnv(AUTH_ENV_KEYS.siteUrl, process.env);
  const configuredOrigin = configuredSite
    ? (() => {
        try {
          return new URL(configuredSite).origin;
        } catch {
          return configuredSite.replace(/\/$/, '');
        }
      })()
    : undefined;

  const origin =
    originFromForwardedHeaders(
      headerStore.get('x-forwarded-host'),
      headerStore.get('x-forwarded-proto'),
      headerStore.get('host')
    ) ??
    configuredOrigin ??
    (process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:3000');

  if (!origin) {
    throw new Error(`${AUTH_ENV_KEYS.siteUrl} or forwarded host headers required for sign-out redirect`);
  }

  return NextResponse.redirect(new URL('/auth/login', origin));
}
