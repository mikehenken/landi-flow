import type { NextRequest } from 'next/server';
import type { EpicAttachedView, EpicCustomerLink, EpicTeamLink } from '@landi-flow/core/types';
import { createClient } from '@/lib/supabase/server';
import { isMockAuthEnabled } from '@/lib/api/config';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const SEED_CUSTOMER_LINKS: EpicCustomerLink[] = [
  {
    id: 'ecl-001',
    epic_id: 'epic-001',
    customer_id: 'customer-acme',
    created_at: '2026-07-01T10:00:00.000Z',
  },
];

const SEED_TEAM_LINKS: EpicTeamLink[] = [
  {
    id: 'etl-001',
    epic_id: 'epic-001',
    team_id: 'team-design',
    created_at: '2026-07-01T10:00:00.000Z',
  },
  {
    id: 'etl-002',
    epic_id: 'epic-001',
    team_id: 'team-engineering',
    created_at: '2026-07-02T10:00:00.000Z',
  },
];

const SEED_ATTACHED_VIEWS: EpicAttachedView[] = [
  {
    id: 'eav-001',
    epic_id: 'epic-001',
    view_id: 'view-my-active',
    position: 0,
    created_at: '2026-07-03T10:00:00.000Z',
  },
];

const mockCustomers: EpicCustomerLink[] = [...SEED_CUSTOMER_LINKS];
const mockTeams: EpicTeamLink[] = [...SEED_TEAM_LINKS];
const mockViews: EpicAttachedView[] = [...SEED_ATTACHED_VIEWS];

export async function GET(request: NextRequest): Promise<Response> {
  const epicId = request.nextUrl.searchParams.get('epic_id');
  if (!epicId) {
    return Response.json({ ok: false, errorText: 'epic_id is required' }, { status: 400 });
  }

  if (isMockAuthEnabled()) {
    return Response.json({
      ok: true,
      customers: mockCustomers.filter((row) => row.epic_id === epicId),
      teams: mockTeams.filter((row) => row.epic_id === epicId),
      attached_views: mockViews
        .filter((row) => row.epic_id === epicId)
        .sort((a, b) => a.position - b.position),
      live: false,
    });
  }

  try {
    const supabase = await createClient();
    const [customersResult, teamsResult, viewsResult] = await Promise.all([
      supabase.schema('linear_clone').from('epic_customers').select('*').eq('epic_id', epicId),
      supabase.schema('linear_clone').from('epic_teams').select('*').eq('epic_id', epicId),
      supabase
        .schema('linear_clone')
        .from('epic_attached_views')
        .select('*')
        .eq('epic_id', epicId)
        .order('position', { ascending: true }),
    ]);

    if (customersResult.error) {
      return Response.json({ ok: false, errorText: customersResult.error.message }, { status: 502 });
    }
    if (teamsResult.error) {
      return Response.json({ ok: false, errorText: teamsResult.error.message }, { status: 502 });
    }
    if (viewsResult.error) {
      return Response.json({ ok: false, errorText: viewsResult.error.message }, { status: 502 });
    }

    return Response.json({
      ok: true,
      customers: (customersResult.data ?? []).map((row) => ({
        id: String(row.id),
        epic_id: String(row.epic_id),
        customer_id: String(row.customer_id),
        created_at: String(row.created_at),
      })),
      teams: (teamsResult.data ?? []).map((row) => ({
        id: String(row.id ?? `${row.epic_id}-${row.team_id}`),
        epic_id: String(row.epic_id),
        team_id: String(row.team_id),
        created_at: String(row.created_at ?? new Date().toISOString()),
      })),
      attached_views: (viewsResult.data ?? []).map((row) => ({
        id: String(row.id),
        epic_id: String(row.epic_id),
        view_id: String(row.view_id),
        position: Number(row.position ?? 0),
        created_at: String(row.created_at),
      })),
      live: true,
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        errorText: err instanceof Error ? err.message : 'Failed to load epic surfaces',
      },
      { status: 500 },
    );
  }
}
