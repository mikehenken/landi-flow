import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';
import { resolveWorkspaceIdFromHost } from '@/lib/workspace/registry';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';

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

/** Safe post-login destination when an authenticated user hits an auth page. */
function resolveAuthenticatedAuthRedirect(
  locale: string,
  redirectParam: string | null,
): string {
  if (!redirectParam) {
    return localeAwarePath(locale, '/workspace/inbox');
  }
  const normalized = redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`;
  const bare = stripLocalePrefix(normalized);
  if (isProtectedPath(normalized) || bare.startsWith('/workspace/')) {
    return localeAwarePath(locale, bare);
  }
  return localeAwarePath(locale, '/workspace/inbox');
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

  const intlResponse = handleI18nRouting(request);
  const existingWorkspaceCookie = request.cookies.get('workspace-id')?.value;
  const hostWorkspaceId = resolveWorkspaceIdFromHost(request.headers.get('host'));
  const workspaceIdForCookie =
    existingWorkspaceCookie && isWorkspaceUuid(existingWorkspaceCookie)
      ? existingWorkspaceCookie
      : hostWorkspaceId;

  intlResponse.cookies.set('workspace-id', workspaceIdForCookie, {
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

  // Authenticated users should not linger on auth pages — honor deep-link redirect.
  if (user && isAuthPage(pathname) && !mockAuth) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    return NextResponse.redirect(
      new URL(resolveAuthenticatedAuthRedirect(locale, redirectParam), request.url),
    );
  }

  return intlResponse;
}
