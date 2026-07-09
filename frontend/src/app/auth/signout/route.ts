import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto') ?? 'http';
  const origin = host ? `${proto}://${host.split(',')[0].trim()}` : 'http://localhost:3000';

  return NextResponse.redirect(new URL('/auth/login', origin));
}
