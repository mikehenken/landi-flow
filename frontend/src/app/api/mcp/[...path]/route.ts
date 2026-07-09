import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCorrelationContext } from '@/lib/correlation';

export const runtime = 'edge';

function resolveMcpBase(): string | null {
  const raw = process.env.MCP_WORKER_URL ?? process.env.NEXT_PUBLIC_MCP_URL;
  return raw ? raw.replace(/\/$/, '') : null;
}

async function proxyMcpRequest(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const upstreamBase = resolveMcpBase();
  if (!upstreamBase) {
    return NextResponse.json(
      { error: 'mcp_not_configured', message: 'MCP_WORKER_URL is not configured' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const correlation =
    request.headers.get('x-landi-correlation-id') ??
    request.headers.get('x-correlation-id') ??
    createCorrelationContext().correlation_id;
  const path = pathSegments.join('/');
  const search = request.nextUrl.search;
  const upstreamUrl = `${upstreamBase}/api/mcp/${path}${search}`;

  const headers = new Headers();
  headers.set('Authorization', `Bearer ${session.access_token}`);
  headers.set('X-Landi-Correlation-Id', correlation);
  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const upstreamResponse = await fetch(upstreamUrl, init);
  const body = await upstreamResponse.text();
  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': upstreamResponse.headers.get('Content-Type') ?? 'application/json',
    },
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyMcpRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyMcpRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyMcpRequest(request, path);
}
