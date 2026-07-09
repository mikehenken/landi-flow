import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCorrelationContext } from '@/lib/correlation';
import {
  fetchFlowApiUpstream,
  resolveFlowApiUpstreamBase,
} from '@/lib/api/upstream-fetch';

async function proxyRequest(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  if (!resolveFlowApiUpstreamBase()) {
    return NextResponse.json(
      { error: 'api_not_configured', message: 'FLOW_API_URL is not configured' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Authentication required' },
      { status: 401 },
    );
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    return NextResponse.json(
      { error: 'unauthorized', message: 'Authentication required' },
      { status: 401 },
    );
  }

  const correlation =
    request.headers.get('x-landi-correlation-id') ??
    request.headers.get('x-correlation-id') ??
    createCorrelationContext().correlation_id;
  const path = pathSegments.join('/');
  const search = request.nextUrl.search;
  const upstreamPath = `/api/v1/${path}${search}`;

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

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetchFlowApiUpstream(upstreamPath, init);
  } catch {
    return NextResponse.json(
      { error: 'api_not_configured', message: 'FLOW_API_URL is not configured' },
      { status: 503 },
    );
  }
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
  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { path } = await context.params;
  return proxyRequest(request, path);
}
