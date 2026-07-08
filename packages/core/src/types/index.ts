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

/** CAP-035: inbox notification kinds derived from story/epic changes. */
export type InboxNotificationKind =
  | 'assigned'
  | 'status_changed'
  | 'delegate'
  | 'followed_update'
  | 'comment'
  | 'mention';

/** CAP-035: user-facing inbox notification row. */
export interface InboxNotification {
  id: string;
  workspace_id: string;
  kind: InboxNotificationKind;
  story_id: string | null;
  epic_id: string | null;
  story_identifier: string | null;
  story_title: string | null;
  actor_type: ActorType;
  actor_user_id: string | null;
  actor_agent_id: string | null;
  actor_name: string | null;
  summary: string;
  read: boolean;
  created_at: string;
}

/** CAP-015: persisted chronological activity event (linear_clone.activity_events). */
export interface ActivityEvent {
  id: string;
  workspace_id: string;
  story_id: string | null;
  epic_id: string | null;
  story_identifier: string | null;
  story_title: string | null;
  actor_type: ActorType;
  actor_user_id: string | null;
  actor_agent_id: string | null;
  actor_name: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  correlation_id: string | null;
  created_at: string;
}

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
  /** Human who created the Story (Shortcut: Requester). Maps to DB `created_by`. */
  creator_id: string | null;
  /** Human subscribers notified on Story updates (Shortcut: Followers). */
  follower_ids: string[];
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
  customer_id?: string | null;
  sla_id?: string | null;
  sla_due_at?: string | null;
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
  /** task-09k: agent assigned to drive this Epic (first-class assignee, alongside human lead). */
  delegate_agent_id: string | null;
  start_date: string | null;
  target_date: string | null;
  progress_cache: Record<string, unknown> | null;
  correlation_id: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * An AI agent connected to the workspace via the MCP credential system (task-09d).
 * Agents are FIRST-CLASS members: assignable and mentionable exactly like humans.
 */
export interface Agent {
  id: string;
  workspace_id: string;
  display_name: string;
  icon_url: string | null;
  mentionable: boolean;
  assignable: boolean;
  billable: boolean;
  mcp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export type MemberKind = 'human' | 'agent';

export type MemberPresence = 'online' | 'working' | 'idle' | 'offline';

/** task-09l: how an agent executes work (identity is separate from runtime). */
export type AgentRuntime = 'native' | 'external_mcp' | 'attribution_only';

/** task-09l: MCP connection state for external agents. */
export type AgentConnectionState = 'connected' | 'disconnected' | 'never_connected';

/**
 * Unified roster entry surfaced by `list_assignable_members`. Humans and agents share
 * one shape so assignee pickers and mention menus list them side by side (task-09k).
 * Agent rows include runtime metadata (task-09l agent architecture pivot).
 */
export interface AssignableMember {
  kind: MemberKind;
  /** For humans this is the auth user id; for agents the `agents.id`. */
  id: string;
  name: string;
  avatar_url: string | null;
  assignable: boolean;
  mentionable: boolean;
  presence: MemberPresence;
  /** Role (humans) or vendor/runtime label (agents). */
  subtitle: string | null;
  /** Present for agents — native in-app, external MCP, or post-hoc attribution only. */
  runtime?: AgentRuntime | null;
  vendor?: string | null;
  connection_state?: AgentConnectionState | null;
  is_builtin?: boolean;
  capabilities?: string[];
  /** When attribution differs from who actually executed (settings.developer_discrepancy). */
  developer_discrepancy?: boolean;
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

export interface ExtensionCatalogItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  manifest: Record<string, unknown>;
  publisher: string | null;
  is_official: boolean;
  created_at: string;
}

export interface ExtensionInstall {
  id: string;
  workspace_id: string;
  extension_id: string;
  oauth_app_id: string | null;
  config: Record<string, unknown>;
  installed_by: string;
  enabled: boolean;
  created_at: string;
  extension?: ExtensionCatalogItem;
}

export interface WebhookEndpoint {
  id: string;
  workspace_id: string;
  app_id: string | null;
  url: string;
  signing_secret_hash: string;
  resource_types: string[];
  team_id: string | null;
  all_public_teams: boolean;
  enabled: boolean;
  failure_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  outbox_event_id: string | null;
  delivery_uuid: string;
  event_topic: string;
  response_status: number | null;
  attempt: number;
  status: 'pending' | 'delivered' | 'failed' | 'dead_letter';
  correlation_id: string;
  created_at: string;
}

export interface WorkspaceSubscription {
  id: string;
  workspace_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_key: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceEntitlement {
  id: string;
  workspace_id: string;
  feature_key: string;
  enabled: boolean;
  limits: Record<string, unknown>;
  source: string;
  updated_at: string;
}

export interface AiGatewayUsageSummary {
  total_tokens_in: number;
  total_tokens_out: number;
  total_cost_usd: number;
  request_count: number;
}

export type AskIntakeSource = 'web' | 'slack' | 'email' | 'api';

export interface CustomerRequest {
  id: string;
  workspace_id: string;
  customer_id: string;
  quote: string;
  source: AskIntakeSource;
  source_url: string | null;
  requester_name: string | null;
  is_important: boolean;
  correlation_id: string | null;
  story_ids: string[];
  epic_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface SlaRule {
  id: string;
  workspace_id: string;
  team_id: string | null;
  name: string;
  rules: {
    response_hours?: number;
    resolution_hours?: number;
    priority?: StoryPriority;
  };
  created_at: string;
  updated_at: string;
}

export interface WorkspaceInviteLink {
  id: string;
  workspace_id: string;
  label: string | null;
  role: string;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface UserNotificationPrefs {
  user_id: string;
  workspace_id: string;
  email_enabled: boolean;
  slack_enabled: boolean;
  in_app_enabled: boolean;
  digest: 'immediate' | 'daily' | 'weekly';
  updated_at: string;
}

export interface AuthorizedOAuthApp {
  token_id: string;
  client_id: string;
  client_name: string;
  scopes: string[];
  created_at: string;
  expires_at: string;
}

export interface ApplicationMember {
  id: string;
  name: string;
  kind: 'oauth_app' | 'agent';
  client_id: string | null;
  created_at: string;
}

export type {
  WorkspaceLocale,
  WorkspaceThemeSettings,
  WorkspaceTerminologySettings,
  WorkspaceSettings,
} from './workspace-settings';
export { parseWorkspaceSettings } from './workspace-settings';

export type {
  StoryFilterOperator,
  StoryFilterField,
  StoryFilterCondition,
  StoryFilterAst,
  StoryDisplayProperty,
  StoryViewOrdering,
  StoryDisplayOptions,
  StoryViewPreferences,
} from './view-preferences';
export {
  DEFAULT_STORY_DISPLAY_PROPERTIES,
  DEFAULT_STORY_DISPLAY_OPTIONS,
  DEFAULT_STORY_VIEW_PREFERENCES,
  STORY_PRIORITY_VALUES,
} from './view-preferences';

export type {
  ArtifactKind,
  ArtifactSource,
  StoryArtifact,
} from './artifacts';

export type {
  Initiative,
  InitiativeSettings,
  InitiativeStatus,
} from './initiatives';

export type {
  PulseSchedule,
  PulseUpdate,
} from './pulse';

export type {
  RecurringCadence,
  RecurringStoryRule,
} from './recurring-stories';

export type {
  EpicAttachedView,
  EpicCustomerLink,
  EpicTeamLink,
} from './epic-surfaces';

/** MCP-IDE-002 — persisted comment row with actor attribution. */
export interface CommentRecord {
  id: string;
  workspace_id: string;
  story_id: string | null;
  epic_id: string | null;
  body_md: string;
  actor_type: ActorType;
  author_user_id: string | null;
  author_agent_id: string | null;
  on_behalf_of_user_id: string | null;
  parent_id: string | null;
  correlation_id: string | null;
  created_at: string;
}
