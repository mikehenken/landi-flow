import { NextResponse, type NextRequest } from 'next/server';
import {
  linkServerCustomerRequest,
  listServerCustomerRequests,
} from '@/lib/mock/server-settings-store';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const workspaceId =
    request.nextUrl.searchParams.get('workspace_id') ??
    request.nextUrl.searchParams.get('workspaceId');
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id required' }, { status: 400 });
  }
  return NextResponse.json({ data: listServerCustomerRequests(workspaceId) });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  let body: {
    workspace_id?: string;
    request_id?: string;
    story_id?: string;
    epic_id?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  if (!body.workspace_id || !body.request_id) {
    return NextResponse.json({ error: 'workspace_id and request_id required' }, { status: 400 });
  }

  const linked = linkServerCustomerRequest({
    workspaceId: body.workspace_id,
    requestId: body.request_id,
    storyId: body.story_id,
    epicId: body.epic_id,
  });

  if (!linked) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ request: linked });
}
