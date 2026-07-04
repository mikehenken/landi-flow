import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PROTECTED_PREFIXES = ['/workspace', '/settings', '/onboarding'] as const;
const AUTH_PAGES = ['/auth/login', '/auth/signup'] as const;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((page) => pathname === page);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const mockAuth = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';

  if (mockAuth && isProtectedPath(pathname)) {
    return NextResponse.next({ request });
  }

  let sessionResult;
  try {
    sessionResult = await updateSession(request);
  } catch (error) {
    console.error('[middleware] Supabase session update failed:', error);
    if (isProtectedPath(pathname)) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  const { supabaseResponse, user } = sessionResult;

  if (isProtectedPath(pathname) && !user) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL('/workspace', request.url));
  }

  return supabaseResponse;
}
