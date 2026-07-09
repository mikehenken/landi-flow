import type { NextRequest } from 'next/server';
import type { RecurringStoryRule } from '@landi-flow/core/types';
import { createClient } from '@/lib/supabase/server';
import { isMockAuthEnabled } from '@/lib/api/config';
import { SEED_RECURRING_RULES } from '@/lib/recurring-stories/recurring-stories-store';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const mockRules: RecurringStoryRule[] = [...SEED_RECURRING_RULES];

function mapDbRow(row: Record<string, unknown>): RecurringStoryRule {
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    team_id: String(row.team_id),
    title_template: String(row.title_template),
    cadence: row.cadence as RecurringStoryRule['cadence'],
    enabled: Boolean(row.enabled),
    last_spawn_at: row.last_spawn_at ? String(row.last_spawn_at) : null,
    spawn_count: Number(row.spawn_count ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  const teamId = request.nextUrl.searchParams.get('team_id');
  if (!teamId) {
    return Response.json({ ok: false, errorText: 'team_id is required' }, { status: 400 });
  }

  if (isMockAuthEnabled()) {
    return Response.json({
      ok: true,
      rules: mockRules.filter((row) => row.team_id === teamId),
      live: false,
    });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema('linear_clone')
      .from('recurring_story_rules')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (error) {
      return Response.json({ ok: false, errorText: error.message }, { status: 502 });
    }

    return Response.json({
      ok: true,
      rules: (data ?? []).map((row) => mapDbRow(row as Record<string, unknown>)),
      live: true,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorText: err instanceof Error ? err.message : 'Failed to list recurring rules',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: {
    workspace_id: string;
    team_id: string;
    title_template: string;
    cadence?: RecurringStoryRule['cadence'];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, errorText: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.workspace_id?.trim() || !body.team_id?.trim() || !body.title_template?.trim()) {
    return Response.json({ ok: false, errorText: 'workspace_id, team_id, title_template required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const rule: RecurringStoryRule = {
    id: `recur-${crypto.randomUUID()}`,
    workspace_id: body.workspace_id,
    team_id: body.team_id,
    title_template: body.title_template,
    cadence: body.cadence ?? 'weekly',
    enabled: true,
    last_spawn_at: null,
    spawn_count: 0,
    created_at: now,
    updated_at: now,
  };

  if (isMockAuthEnabled()) {
    mockRules.push(rule);
    return Response.json({ ok: true, rule, live: false }, { status: 201 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .schema('linear_clone')
      .from('recurring_story_rules')
      .insert({
        workspace_id: rule.workspace_id,
        team_id: rule.team_id,
        title_template: rule.title_template,
        cadence: rule.cadence,
        enabled: rule.enabled,
      })
      .select('*')
      .single();

    if (error) {
      return Response.json({ ok: false, errorText: error.message }, { status: 502 });
    }

    return Response.json({ ok: true, rule: mapDbRow(data as Record<string, unknown>), live: true }, { status: 201 });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorText: err instanceof Error ? err.message : 'Failed to create recurring rule',
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest): Promise<Response> {
  let body: { rule_id: string; enabled?: boolean; last_spawn_at?: string; spawn_count?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ ok: false, errorText: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.rule_id?.trim()) {
    return Response.json({ ok: false, errorText: 'rule_id is required' }, { status: 400 });
  }

  if (isMockAuthEnabled()) {
    const index = mockRules.findIndex((row) => row.id === body.rule_id);
    if (index < 0) {
      return Response.json({ ok: false, errorText: 'Rule not found' }, { status: 404 });
    }
    const current = mockRules[index]!;
    const updated: RecurringStoryRule = {
      ...current,
      enabled: body.enabled ?? current.enabled,
      last_spawn_at: body.last_spawn_at ?? current.last_spawn_at,
      spawn_count: body.spawn_count ?? current.spawn_count,
      updated_at: new Date().toISOString(),
    };
    mockRules[index] = updated;
    return Response.json({ ok: true, rule: updated, live: false });
  }

  try {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.enabled !== undefined) {
      patch.enabled = body.enabled;
    }
    if (body.last_spawn_at !== undefined) {
      patch.last_spawn_at = body.last_spawn_at;
    }
    if (body.spawn_count !== undefined) {
      patch.spawn_count = body.spawn_count;
    }

    const { data, error } = await supabase
      .schema('linear_clone')
      .from('recurring_story_rules')
      .update(patch)
      .eq('id', body.rule_id)
      .select('*')
      .single();

    if (error) {
      return Response.json({ ok: false, errorText: error.message }, { status: 502 });
    }

    return Response.json({ ok: true, rule: mapDbRow(data as Record<string, unknown>), live: true });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorText: err instanceof Error ? err.message : 'Failed to update recurring rule',
      },
      { status: 500 },
    );
  }
}
