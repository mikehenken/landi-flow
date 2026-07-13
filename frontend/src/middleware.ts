import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';
import { resolveWorkspaceIdFromHost } from '@/lib/workspace/registry';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';

const PROTECTED_PREFIXES = ['/workspace', '/settings', '/onboarding', '/oauth'] as const;
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
  const questionIndex = redirectParam.indexOf('?');
  const pathPart =
    questionIndex === -1 ? redirectParam : redirectParam.slice(0, questionIndex);
  const queryPart = questionIndex === -1 ? '' : redirectParam.slice(questionIndex);
  const normalized = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const bare = stripLocalePrefix(normalized);
  const destination = `${bare}${queryPart}`;
  if (isProtectedPath(normalized) || bare.startsWith('/workspace/') || bare.startsWith('/oauth/')) {
    return localeAwarePath(locale, destination);
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

  // Production must never persist host/demo ids (e.g. `ws-landi-flow-demo`) —
  // those cause Liveblocks auth 500s and `/api/v1/workspaces/...` 404s.
  // Mock auth keeps the registry demo id; real auth waits for a UUID cookie
  // written by ActiveWorkspaceProvider after membership resolve.
  if (existingWorkspaceCookie && isWorkspaceUuid(existingWorkspaceCookie)) {
    intlResponse.cookies.set('workspace-id', existingWorkspaceCookie, {
      path: '/',
      sameSite: 'lax',
    });
  } else if (mockAuth) {
    intlResponse.cookies.set('workspace-id', hostWorkspaceId, {
      path: '/',
      sameSite: 'lax',
    });
  } else if (isWorkspaceUuid(hostWorkspaceId)) {
    intlResponse.cookies.set('workspace-id', hostWorkspaceId, {
      path: '/',
      sameSite: 'lax',
    });
  } else if (existingWorkspaceCookie) {
    intlResponse.cookies.set('workspace-id', '', {
      path: '/',
      sameSite: 'lax',
      maxAge: 0,
    });
  }

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
      const barePath = stripLocalePrefix(pathname);
      const redirectTarget = request.nextUrl.search
        ? `${barePath}${request.nextUrl.search}`
        : barePath;
      loginUrl.searchParams.set('redirect', redirectTarget);
      return NextResponse.redirect(loginUrl);
    }
    return intlResponse;
  }

  const { supabaseResponse, user } = sessionResult;
  mergeCookies(intlResponse, supabaseResponse);

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL(localeAwarePath(locale, '/auth/login'), request.url);
    const barePath = stripLocalePrefix(pathname);
    const redirectTarget = request.nextUrl.search
      ? `${barePath}${request.nextUrl.search}`
      : barePath;
    loginUrl.searchParams.set('redirect', redirectTarget);
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
