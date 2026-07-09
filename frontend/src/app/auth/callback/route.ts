import { productionCookieDomain, requestOrigin } from '@/lib/supabase/cookie-domain';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_ENV_KEYS } from '@landi-flow/auth/env';
import { LINEAR_CLONE_SCHEMA } from '@landi-flow/auth/schema';

export const runtime = 'edge';

const ALLOWED_REDIRECT_HOSTS = ['localhost', '127.0.0.1', 'landi.build', 'dev.landi.build'];

function applySessionCookies(
  response: NextResponse,
  pending: { name: string; value: string; options: CookieOptions }[],
  cookieDomain: string | undefined
): void {
  for (const { name, value, options } of pending) {
    response.cookies.set(name, value, {
      ...options,
      domain: cookieDomain ?? options.domain,
    });
  }
}

function buildRedirectTarget(
  origin: string,
  nextParam: string
): { redirectTo: string; isAbsoluteRedirect: boolean } {
  const isAbsoluteRedirect = nextParam.startsWith('http://') || nextParam.startsWith('https://');
  if (!isAbsoluteRedirect) {
    return { redirectTo: `${origin}${nextParam}`, isAbsoluteRedirect: false };
  }
  try {
    const parsed = new URL(nextParam);
    const hostname = parsed.hostname.toLowerCase();
    const allowed =
      ALLOWED_REDIRECT_HOSTS.includes(hostname) ||
      hostname.endsWith('.landi.build') ||
      hostname.endsWith('.workers.dev');
    return {
      redirectTo: allowed ? nextParam : `${origin}/workspace`,
      isAbsoluteRedirect: true,
    };
  } catch {
    return { redirectTo: `${origin}/workspace`, isAbsoluteRedirect: true };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get('code');
  const next = request.nextUrl.searchParams.get('next') ?? '/workspace';
  const origin = requestOrigin(request);
  const cookieDomain = productionCookieDomain(request);

  const supabaseUrl = process.env[AUTH_ENV_KEYS.supabaseUrl];
  const supabaseAnonKey = process.env[AUTH_ENV_KEYS.supabaseAnonKey];

  const redirectToLogin = (): NextResponse => NextResponse.redirect(`${origin}/auth/login`);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      `Auth callback: missing ${AUTH_ENV_KEYS.supabaseUrl} or ${AUTH_ENV_KEYS.supabaseAnonKey}`
    );
    return redirectToLogin();
  }

  if (!code) {
    return redirectToLogin();
  }

  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      db: { schema: LINEAR_CLONE_SCHEMA },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          pendingCookies.push(...cookiesToSet);
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Auth callback: exchangeCodeForSession failed', error.message);
      return redirectToLogin();
    }

    const { redirectTo } = buildRedirectTarget(origin, next);
    const response = NextResponse.redirect(redirectTo);
    applySessionCookies(response, pendingCookies, cookieDomain);
    return response;
  } catch (err) {
    console.error('Auth callback: unhandled error', err);
    return redirectToLogin();
  }
}
