import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';
import { resolveWorkspaceIdFromHost } from '@/lib/workspace/registry';

const PROTECTED_PREFIXES = ['/workspace', '/settings', '/onboarding'] as const;
const AUTH_PAGES = ['/auth/login', '/auth/signup'] as const;

const handleI18nRouting = createIntlMiddleware(routing);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|api/|auth/callback|auth/signout|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

function stripLocalePrefix(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && (routing.locales as readonly string[]).includes(first)) {
    return `/${segments.slice(1).join('/')}` || '/';
  }
  return pathname;
}

function extractLocale(pathname: string): string {
  const first = pathname.split('/').filter(Boolean)[0];
  if (first && (routing.locales as readonly string[]).includes(first)) {
    return first;
  }
  return routing.defaultLocale;
}

function isProtectedPath(pathname: string): boolean {
  const bare = stripLocalePrefix(pathname);
  return PROTECTED_PREFIXES.some(
    (prefix) => bare === prefix || bare.startsWith(`${prefix}/`),
  );
}

function isAuthPage(pathname: string): boolean {
  const bare = stripLocalePrefix(pathname);
  return AUTH_PAGES.some((page) => bare === page);
}

/** Locale home (`/en`, `/`) — redirects before client workspace bootstrap runs. */
function isAppEntryPath(pathname: string): boolean {
  const bare = stripLocalePrefix(pathname);
  return bare === '/';
}

function localeAwarePath(locale: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/${locale}${normalized === '/' ? '' : normalized}`;
}

function mergeCookies(target: NextResponse, source: NextResponse): void {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const mockAuth = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
  const locale = extractLocale(pathname);
  const workspaceId = resolveWorkspaceIdFromHost(request.headers.get('host'));

  const intlResponse = handleI18nRouting(request);
  intlResponse.cookies.set('workspace-id', workspaceId, {
    path: '/',
    sameSite: 'lax',
  });

  if (mockAuth && isProtectedPath(pathname)) {
    return intlResponse;
  }

  let sessionResult;
  try {
    sessionResult = await updateSession(request);
  } catch (error) {
    console.error('[middleware] Supabase session update failed:', error);
    if (isProtectedPath(pathname)) {
      const loginUrl = new URL(localeAwarePath(locale, '/auth/login'), request.url);
      loginUrl.searchParams.set('redirect', stripLocalePrefix(pathname));
      return NextResponse.redirect(loginUrl);
    }
    return intlResponse;
  }

  const { supabaseResponse, user } = sessionResult;
  mergeCookies(intlResponse, supabaseResponse);

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL(localeAwarePath(locale, '/auth/login'), request.url);
    loginUrl.searchParams.set('redirect', stripLocalePrefix(pathname));
    return NextResponse.redirect(loginUrl);
  }

  if (isAppEntryPath(pathname)) {
    if (user) {
      return NextResponse.redirect(
        new URL(localeAwarePath(locale, '/workspace/inbox'), request.url),
      );
    }
    const loginUrl = new URL(localeAwarePath(locale, '/auth/login'), request.url);
    loginUrl.searchParams.set('redirect', '/workspace/inbox');
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthPage(pathname)) {
    return NextResponse.redirect(
      new URL(localeAwarePath(locale, '/workspace/inbox'), request.url),
    );
  }

  return intlResponse;
}
