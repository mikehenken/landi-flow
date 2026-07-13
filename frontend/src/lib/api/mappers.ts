import type { Epic, Story, WorkflowState } from '@landi-flow/core/types';
import type { CustomerRecord } from '@/lib/seed-data';
import type { WorkspaceMemberWithProfile } from '@/lib/api/types';

export type { WorkspaceMemberWithProfile };

interface DbStoryRow {
  id: string;
  workspace_id: string;
  team_id: string;
  number: number;
  identifier: string;
  title: string;
  description_json: Record<string, unknown> | null;
  description_md: string | null;
  workflow_state_id: string;
  priority: Story['priority'];
  assignee_id: string | null;
  delegate_agent_id: string | null;
  epic_id: string | null;
  milestone_id: string | null;
  cycle_id: string | null;
  estimate: number | null;
  due_date: string | null;
  sort_order: number;
  is_draft: boolean;
  archived_at: string | null;
  correlation_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  label_ids?: string[];
}

interface DbEpicRow {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description_json: Record<string, unknown> | null;
  description_md: string | null;
  status_id: string;
  priority: Epic['priority'];
  lead_id: string | null;
  delegate_agent_id: string | null;
  start_date: string | null;
  target_date: string | null;
  progress_cache: Record<string, unknown> | null;
  correlation_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DbCustomerRow {
  id: string;
  name: string;
  domain: string;
  tier: string | null;
  revenue: number | null;
  status: string;
}

export function mapStoryRow(row: DbStoryRow): Story {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    team_id: row.team_id,
    number: row.number,
    identifier: row.identifier,
    title: row.title,
    description_json: row.description_json,
    description_md: row.description_md,
    workflow_state_id: row.workflow_state_id,
    priority: row.priority,
    assignee_id: row.assignee_id,
    creator_id: row.created_by,
    follower_ids: [],
    label_ids: row.label_ids ?? [],
    delegate_agent_id: row.delegate_agent_id,
    epic_id: row.epic_id,
    milestone_id: row.milestone_id,
    cycle_id: row.cycle_id,
    estimate: row.estimate,
    due_date: row.due_date,
    sort_order: Number(row.sort_order),
    is_draft: row.is_draft,
    archived_at: row.archived_at,
    correlation_id: row.correlation_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapEpicRow(row: DbEpicRow): Epic {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    name: row.name,
    slug: row.slug,
    description_json: row.description_json,
    description_md: row.description_md,
    status_id: row.status_id,
    priority: row.priority,
    lead_id: row.lead_id,
    delegate_agent_id: row.delegate_agent_id ?? null,
    start_date: row.start_date,
    target_date: row.target_date,
    progress_cache: row.progress_cache,
    correlation_id: row.correlation_id,
    archived_at: row.archived_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapCustomerRow(row: DbCustomerRow): CustomerRecord {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    tier: row.tier,
    revenue: row.revenue,
    status: row.status,
  };
}

export function mapMemberRow(row: WorkspaceMemberWithProfile): WorkspaceMemberWithProfile {
  return row;
}

export type { DbStoryRow, DbEpicRow, DbCustomerRow, WorkflowState };
