import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseMcpOAuthParams } from '@/lib/oauth/mcp-consent';

export const dynamic = 'force-dynamic';

function resolveMcpWorkerBase(): string | null {
  const raw = process.env.MCP_WORKER_URL ?? process.env.NEXT_PUBLIC_MCP_URL;
  return raw ? raw.replace(/\/$/, '') : null;
}

/**
 * Authenticated proxy to MCP worker GET /authorize.
 * Forwards the Supabase session JWT and returns the worker redirect (authorization code).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const upstreamBase = resolveMcpWorkerBase();
  if (!upstreamBase) {
    return NextResponse.json(
      { error: 'mcp_not_configured', message: 'MCP_WORKER_URL is not configured' },
      { status: 503 },
    );
  }

  const parsed = parseMcpOAuthParams(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!parsed.ok) {
    return NextResponse.json({ error: 'invalid_request', message: parsed.error }, { status: 400 });
  }

  const workspaceId = request.nextUrl.searchParams.get('workspace_id')?.trim();
  if (!workspaceId) {
    return NextResponse.json(
      { error: 'invalid_request', message: 'workspace_id is required' },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: 'unauthorized', message: 'Sign in required' }, { status: 401 });
  }

  const upstreamUrl = `${upstreamBase}/authorize${request.nextUrl.search}`;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        Accept: 'application/json, text/html',
      },
      redirect: 'manual',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream authorize failed';
    return NextResponse.json({ error: 'upstream_error', message }, { status: 502 });
  }

  if (upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
    const location = upstreamResponse.headers.get('Location');
    if (location) {
      return NextResponse.redirect(location);
    }
  }

  const contentType = upstreamResponse.headers.get('Content-Type') ?? 'application/json';
  const body = await upstreamResponse.text();
  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: { 'Content-Type': contentType },
  });
}
