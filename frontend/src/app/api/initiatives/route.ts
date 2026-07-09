import type { NextRequest } from 'next/server';
import type { Initiative, InitiativeSettings } from '@landi-flow/core/types';
import { createClient } from '@/lib/supabase/server';
import { isMockAuthEnabled } from '@/lib/api/config';
import {
  SEED_INITIATIVES,
  readInitiativeSettings as readMockSettings,
} from '@/lib/initiatives/initiatives-store';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const mockInitiatives: Initiative[] = [...SEED_INITIATIVES];
let mockSettings: InitiativeSettings = readMockSettings();

function mapInitiativeRow(row: Record<string, unknown>, epicIds: string[]): Initiative {
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    name: String(row.name),
    description_md: row.description_md ? String(row.description_md) : null,
    status: row.status as Initiative['status'],
    owner_id: row.owner_id ? String(row.owner_id) : null,
    start_date: row.start_date ? String(row.start_date) : null,
    target_date: row.target_date ? String(row.target_date) : null,
    epic_ids: epicIds,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const workspaceId = request.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) {
    return Response.json({ ok: false, errorText: 'workspace_id is required' }, { status: 400 });
  }

  if (isMockAuthEnabled()) {
    return Response.json({
      ok: true,
      initiatives: mockInitiatives.filter((row) => row.workspace_id === workspaceId),
      settings: { ...mockSettings, workspace_id: workspaceId },
      live: false,
    });
  }

  try {
    const supabase = await createClient();
    const [initiativesResult, settingsResult, epicLinksResult] = await Promise.all([
      supabase
        .schema('linear_clone')
        .from('initiatives')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true }),
      supabase
        .schema('linear_clone')
        .from('initiative_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
      supabase.schema('linear_clone').from('initiative_epics').select('initiative_id, epic_id'),
    ]);

    if (initiativesResult.error) {
      return Response.json({ ok: false, errorText: initiativesResult.error.message }, { status: 502 });
    }

    const epicLinks = epicLinksResult.data ?? [];
    const epicIdsByInitiative = new Map<string, string[]>();
    for (const link of epicLinks) {
      const initiativeId = String(link.initiative_id);
      const epicId = String(link.epic_id);
      const existing = epicIdsByInitiative.get(initiativeId) ?? [];
      epicIdsByInitiative.set(initiativeId, [...existing, epicId]);
    }

    const initiatives = (initiativesResult.data ?? []).map((row) =>
      mapInitiativeRow(row as Record<string, unknown>, epicIdsByInitiative.get(String(row.id)) ?? []),
    );

    const settingsRow = settingsResult.data as Record<string, unknown> | null;
    const settings: InitiativeSettings = settingsRow
      ? {
          workspace_id: workspaceId,
          enabled: Boolean(settingsRow.enabled),
          schedule_cadence:
            (settingsRow.schedule_cadence as InitiativeSettings['schedule_cadence']) ?? 'weekly',
          updated_at: String(settingsRow.updated_at ?? new Date().toISOString()),
        }
      : {
          workspace_id: workspaceId,
          enabled: false,
          schedule_cadence: 'weekly',
          updated_at: new Date().toISOString(),
        };

    return Response.json({ ok: true, initiatives, settings, live: true });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorText: err instanceof Error ? err.message : 'Failed to list initiatives',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: { workspace_id: string; name: string; status?: Initiative['status'] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, errorText: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.workspace_id?.trim() || !body.name?.trim()) {
    return Response.json({ ok: false, errorText: 'workspace_id and name are required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const initiative: Initiative = {
    id: `initiative-${crypto.randomUUID()}`,
    workspace_id: body.workspace_id,
    name: body.name,
    description_md: null,
    status: body.status ?? 'planned',
    owner_id: null,
    start_date: null,
    target_date: null,
    epic_ids: [],
    created_at: now,
    updated_at: now,
  };

  if (isMockAuthEnabled()) {
    mockInitiatives.push(initiative);
    return Response.json({ ok: true, initiative, live: false }, { status: 201 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema('linear_clone')
      .from('initiatives')
      .insert({
        workspace_id: initiative.workspace_id,
        name: initiative.name,
        status: initiative.status,
      })
      .select('*')
      .single();

    if (error) {
      return Response.json({ ok: false, errorText: error.message }, { status: 502 });
    }

    return Response.json(
      { ok: true, initiative: mapInitiativeRow(data as Record<string, unknown>, []), live: true },
      { status: 201 },
    );
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorText: err instanceof Error ? err.message : 'Failed to create initiative',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  let body: { workspace_id: string; enabled: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, errorText: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.workspace_id?.trim()) {
    return Response.json({ ok: false, errorText: 'workspace_id is required' }, { status: 400 });
  }

  const settings: InitiativeSettings = {
    workspace_id: body.workspace_id,
    enabled: body.enabled,
    schedule_cadence: 'weekly',
    updated_at: new Date().toISOString(),
  };

  if (isMockAuthEnabled()) {
    mockSettings = settings;
    return Response.json({ ok: true, settings, live: false });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema('linear_clone')
      .from('initiative_settings')
      .upsert({
        workspace_id: body.workspace_id,
        enabled: body.enabled,
        schedule_cadence: 'weekly',
        updated_at: settings.updated_at,
      })
      .select('*')
      .single();

    if (error) {
      return Response.json({ ok: false, errorText: error.message }, { status: 502 });
    }

    const row = data as Record<string, unknown>;
    return Response.json({
      ok: true,
      settings: {
        workspace_id: body.workspace_id,
        enabled: Boolean(row.enabled),
        schedule_cadence:
          (row.schedule_cadence as InitiativeSettings['schedule_cadence']) ?? 'weekly',
        updated_at: String(row.updated_at),
      },
      live: true,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorText: err instanceof Error ? err.message : 'Failed to update initiative settings',
      },
      { status: 500 },
    );
  }
}
