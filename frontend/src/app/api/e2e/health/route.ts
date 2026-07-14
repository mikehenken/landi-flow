import { NextResponse } from 'next/server';

/**
 * Playwright webServer readiness probe — returns 200 only when mock auth is active.
 * Prevents E2E from running against a real-auth dev server on :3000.
 */
export async function GET(): Promise<NextResponse> {
  const mockAuth = process.env.NEXT_PUBLIC_MOCK_AUTH === 'true';
  if (!mockAuth) {
    return NextResponse.json({ ok: false, mockAuth: false }, { status: 503 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, mockAuth: true, missing: 'NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY' },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true, mockAuth: true });
}
