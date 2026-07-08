import type { NextRequest } from 'next/server';
import type { ArtifactKind, ArtifactSource, StoryArtifact } from '@landi-flow/core/types';
import { createClient } from '@/lib/supabase/server';
import { createCorrelationContext } from '@/lib/correlation';
import { isMockAuthEnabled } from '@/lib/api/config';
import { SEED_ARTIFACTS } from '@/lib/artifacts/artifact-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CreateArtifactBody {
  workspace_id: string;
  story_id?: string | null;
  epic_id?: string | null;
  artifact_kind: ArtifactKind;
  source: ArtifactSource;
  title: string;
  summary?: string | null;
  mime_type?: string | null;
  byte_size?: number | null;
  inline_body?: string | null;
  parent_artifact_id?: string | null;
  agent_id?: string | null;
  session_id?: string | null;
  correlation_id?: string | null;
}

const mockArtifacts: StoryArtifact[] = [...SEED_ARTIFACTS];

function filterArtifacts(storyId: string | null, epicId: string | null): StoryArtifact[] {
  if (storyId) {
    return mockArtifacts.filter((row) => row.story_id === storyId);
  }
  if (epicId) {
    return mockArtifacts.filter((row) => row.epic_id === epicId);
  }
  return mockArtifacts;
}

export async function GET(request: NextRequest): Promise<Response> {
  const storyId = request.nextUrl.searchParams.get('story_id');
  const epicId = request.nextUrl.searchParams.get('epic_id');

  if (!storyId && !epicId) {
    return Response.json(
      { ok: false, errorText: 'story_id or epic_id is required' },
      { status: 400 },
    );
  }

  if (isMockAuthEnabled()) {
    return Response.json({
      ok: true,
      artifacts: filterArtifacts(storyId, epicId),
      live: false,
    });
  }

  try {
    const supabase = await createClient();
    let query = supabase
      .schema('linear_clone')
      .from('story_artifacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (storyId) {
      query = query.eq('story_id', storyId);
    } else if (epicId) {
      query = query.eq('epic_id', epicId);
    }

    const { data, error } = await query;
    if (error) {
      return Response.json({ ok: false, errorText: error.message }, { status: 502 });
    }

    return Response.json({ ok: true, artifacts: data ?? [], live: true });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorText: err instanceof Error ? err.message : 'Failed to list artifacts',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: CreateArtifactBody;
  try {
    body = (await request.json()) as CreateArtifactBody;
  } catch {
    return Response.json({ ok: false, errorText: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.workspace_id?.trim()) {
    return Response.json({ ok: false, errorText: 'workspace_id is required' }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return Response.json({ ok: false, errorText: 'title is required' }, { status: 400 });
  }
  if (!body.story_id && !body.epic_id) {
    return Response.json(
      { ok: false, errorText: 'story_id or epic_id is required' },
      { status: 400 },
    );
  }

  const correlation =
    body.correlation_id ??
    request.headers.get('x-landi-correlation-id') ??
    createCorrelationContext().correlation_id;

  const now = new Date().toISOString();
  const artifact: StoryArtifact = {
    id: `artifact-${crypto.randomUUID()}`,
    workspace_id: body.workspace_id,
    story_id: body.story_id ?? null,
    epic_id: body.epic_id ?? null,
    artifact_kind: body.artifact_kind,
    source: body.source,
    title: body.title,
    summary: body.summary ?? null,
    mime_type: body.mime_type ?? null,
    byte_size: body.byte_size ?? null,
    agent_id: body.agent_id ?? null,
    session_id: body.session_id ?? null,
    correlation_id: correlation,
    parent_artifact_id: body.parent_artifact_id ?? null,
    storage_provider: body.inline_body ? 'inline_text' : 'r2',
    storage_key: null,
    inline_body: body.inline_body ?? null,
    content_hash: null,
    metadata: {},
    created_by: null,
    created_at: now,
    updated_at: now,
  };

  if (isMockAuthEnabled()) {
    mockArtifacts.unshift(artifact);
    return Response.json({ ok: true, artifact, live: false }, { status: 201 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema('linear_clone')
      .from('story_artifacts')
      .insert({
        workspace_id: artifact.workspace_id,
        story_id: artifact.story_id,
        epic_id: artifact.epic_id,
        artifact_kind: artifact.artifact_kind,
        source: artifact.source,
        title: artifact.title,
        summary: artifact.summary,
        mime_type: artifact.mime_type,
        byte_size: artifact.byte_size,
        agent_id: artifact.agent_id,
        session_id: artifact.session_id,
        correlation_id: artifact.correlation_id,
        parent_artifact_id: artifact.parent_artifact_id,
        storage_provider: artifact.storage_provider,
        storage_key: artifact.storage_key,
        inline_body: artifact.inline_body,
        metadata: artifact.metadata,
      })
      .select('*')
      .single();

    if (error) {
      return Response.json({ ok: false, errorText: error.message }, { status: 502 });
    }

    return Response.json({ ok: true, artifact: data, live: true }, { status: 201 });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorText: err instanceof Error ? err.message : 'Failed to create artifact',
      },
      { status: 500 },
    );
  }
}
