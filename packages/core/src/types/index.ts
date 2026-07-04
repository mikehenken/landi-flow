/** HITM nomenclature: Epic (never Project), Story (UI), Issue (API alias only). */

export type {
  AuthUserContext,
  OAuthProvider,
  Profile,
  TeamMemberRole,
  WorkspaceMember,
  WorkspaceMemberRole,
  WorkspaceMemberStatus,
} from '@landi-flow/auth';

export type ActorType = 'human' | 'agent' | 'system';

export type StoryPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export type EpicStatusCategory =
  | 'backlog'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type EpicPriority = StoryPriority;

export type StoryRelationType =
  | 'parent'
  | 'sub'
  | 'blocks'
  | 'blocked_by'
  | 'related'
  | 'duplicate';

export type ViewLayout = 'list' | 'board' | 'timeline' | 'calendar';

export type ViewScope = 'workspace' | 'team' | 'epic' | 'personal';

export type WorkflowCategory =
  | 'backlog'
  | 'unstarted'
  | 'started'
  | 'completed'
  | 'canceled'
  | 'duplicate'
  | 'triage';

export interface CorrelationContext {
  correlation_id: string;
  causation_id?: string;
}

export interface Workspace {
  id: string;
  slug: string;
  name: string;
  icon_url: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Team {
  id: string;
  workspace_id: string;
  slug: string;
  name: string;
  key: string;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export interface WorkflowState {
  id: string;
  team_id: string;
  name: string;
  category: WorkflowCategory;
  position: number;
  is_default: boolean;
}

export interface Story {
  id: string;
  workspace_id: string;
  team_id: string;
  number: number;
  identifier: string;
  title: string;
  description_json: Record<string, unknown> | null;
  description_md: string | null;
  workflow_state_id: string;
  priority: StoryPriority;
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
  created_at: string;
  updated_at: string;
}

export interface Epic {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description_json: Record<string, unknown> | null;
  description_md: string | null;
  status_id: string;
  priority: EpicPriority;
  lead_id: string | null;
  start_date: string | null;
  target_date: string | null;
  progress_cache: Record<string, unknown> | null;
  correlation_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  epic_id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  target_date: string | null;
  position: number;
  completed_at: string | null;
  issue_count: number;
  completed_issue_count: number;
  progress_pct: number;
  created_at: string;
  updated_at: string;
}

export interface Cycle {
  id: string;
  team_id: string;
  workspace_id: string;
  name: string;
  number: number;
  starts_at: string;
  ends_at: string;
  completed_at: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface StoryRelation {
  id: string;
  workspace_id: string;
  source_story_id: string;
  target_story_id: string;
  relation_type: StoryRelationType;
  created_by: string | null;
  created_at: string;
}

export interface View {
  id: string;
  workspace_id: string;
  team_id: string | null;
  epic_id: string | null;
  owner_id: string | null;
  name: string;
  description: string | null;
  scope: ViewScope;
  layout: ViewLayout;
  filter_ast: Record<string, unknown>;
  display_options: Record<string, unknown>;
  grouping: string | null;
  sub_grouping: string | null;
  is_shared: boolean;
  is_favorited: boolean;
  created_at: string;
  updated_at: string;
}

export interface OutboxEventRow {
  id: string;
  workspace_id: string;
  topic: string;
  payload: Record<string, unknown>;
  correlation_id: string;
  causation_id: string | null;
  status: 'pending' | 'published' | 'failed';
  retry_count: number;
  created_at: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    correlation_id: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  page_info: {
    has_next_page: boolean;
    end_cursor: string | null;
  };
  correlation_id: string;
}
