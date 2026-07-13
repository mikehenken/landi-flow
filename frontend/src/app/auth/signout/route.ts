import { NextResponse, type NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { originFromForwardedHeaders } from '@/lib/supabase/cookie-domain';
import { AUTH_ENV_KEYS, getEnv } from '@landi-flow/auth/env';

async function resolveOrigin(): Promise<string> {
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
      headerStore.get('host'),
    ) ?? configuredOrigin;

  if (origin) {
    return origin;
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000';
  }

  throw new Error(`${AUTH_ENV_KEYS.siteUrl} or forwarded host headers required for sign-out redirect`);
}

function buildLoginRedirectUrl(origin: string, returnPath: string | null): URL {
  const loginUrl = new URL('/auth/login', origin);
  if (returnPath) {
    loginUrl.searchParams.set('redirect', returnPath);
  }
  return loginUrl;
}

async function handleSignOut(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const origin = await resolveOrigin();
  const returnPath = request.nextUrl.searchParams.get('redirect');
  return NextResponse.redirect(buildLoginRedirectUrl(origin, returnPath));
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handleSignOut(request);
}

/** GET supports auth-recovery flows that need a navigable sign-out URL. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return handleSignOut(request);
}
