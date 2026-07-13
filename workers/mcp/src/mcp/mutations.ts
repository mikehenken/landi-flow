/**
 * Data + mutation service for MCP tools. Reads use the service-role client scoped
 * by workspace/authorization; writes ALWAYS route through the Agent Action Bus
 * (`execute_agent_mutation` RPC) — never a direct table write — so agent + human
 * mutations share the transactional-outbox path with a full audit trail.
 */
import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type { McpWorkspaceContext } from '@landi-flow/core/mcp';
import type { DbClient } from '../lib/db.js';
import { loadMcpWorkspaceContext } from '../lib/workspace-context-loader.js';
import type { McpPrincipal } from '../auth/authenticate.js';

export class McpAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpAuthorizationError';
  }
}

export interface MutationResult {
  entity: Record<string, unknown> | null;
  status: 'applied' | 'proposed';
  action_id: string;
  outbox_event_id: string | null;
}

export class McpProjectService {
  constructor(
    private readonly db: DbClient,
    private readonly principal: McpPrincipal,
    private readonly workspaceId: string,
    private readonly correlationId: string
  ) {}

  /** Assert the principal may act in this workspace (user membership or app binding). */
  async assertWorkspaceAccess(): Promise<void> {
    // App-actor tokens are already workspace-bound at issuance.
    if (this.principal.actorType === 'agent' && this.principal.type === 'oauth_token' && !this.principal.userId) {
      if (this.principal.workspaceId && this.principal.workspaceId !== this.workspaceId) {
        throw new McpAuthorizationError('Credential is bound to a different workspace');
      }
      return;
    }
    if (!this.principal.userId) {
      throw new McpAuthorizationError('No user identity for authorization');
    }
    const { data, error } = await this.db
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', this.workspaceId)
      .eq('user_id', this.principal.userId)
      .eq('status', 'active')
      .maybeSingle();
    if (error) {
      throw new McpAuthorizationError(`Authorization check failed: ${error.message}`);
    }
    if (!data) {
      throw new McpAuthorizationError('Not a member of the target workspace');
    }
  }

  // --- Reads --------------------------------------------------------------

  async listEpics(limit = 50): Promise<unknown[]> {
    const { data, error } = await this.db
      .from('epics')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) {
      throw new Error(`Failed to list epics: ${error.message}`);
    }
    return data ?? [];
  }

  async getEpic(epicId: string): Promise<unknown> {
    const { data, error } = await this.db
      .from('epics')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .eq('id', epicId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to get epic: ${error.message}`);
    }
    return data;
  }

  async listStories(teamId: string | undefined, limit = 50): Promise<unknown[]> {
    let query = this.db
      .from('stories')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (teamId) {
      query = query.eq('team_id', teamId);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list stories: ${error.message}`);
    }
    return data ?? [];
  }

  async getStory(storyRef: string): Promise<unknown> {
    const column = isUuid(storyRef) ? 'id' : 'identifier';
    const { data, error } = await this.db
      .from('stories')
      .select('*')
      .eq('workspace_id', this.workspaceId)
      .eq(column, storyRef)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to get story: ${error.message}`);
    }
    return data;
  }

  async searchStories(queryText: string, limit = 25): Promise<unknown[]> {
    const pattern = `%${queryText.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const { data, error } = await this.db
      .from('stories')
      .select('id, identifier, title, workflow_state_id, priority, assignee_id, delegate_agent_id, epic_id, team_id, updated_at')
      .eq('workspace_id', this.workspaceId)
      .is('archived_at', null)
      .or(`title.ilike.${pattern},identifier.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error) {
      throw new Error(`Failed to search stories: ${error.message}`);
    }
    return data ?? [];
  }

  async listAgents(): Promise<unknown[]> {
    const { data, error } = await this.db
      .from('agents')
      .select('id, display_name, icon_url, assignable, mentionable, billable, mcp_enabled')
      .eq('workspace_id', this.workspaceId);
    if (error) {
      throw new Error(`Failed to list agents: ${error.message}`);
    }
    return data ?? [];
  }

  /**
   * Unified assignee roster: active human members + assignable agents in one shape.
   * Backed by the `list_assignable_members` RPC so the MCP surface and the UI list
   * agents as first-class members alongside humans (task-09k).
   */
  async listMembers(): Promise<unknown[]> {
    const { data, error } = await this.db.rpc('list_assignable_members', {
      p_workspace_id: this.workspaceId,
    });
    if (error) {
      throw new Error(`Failed to list members: ${error.message}`);
    }
    return Array.isArray(data) ? (data as unknown[]) : [];
  }

  /** Full workspace roster for MCP agents — teams, states, statuses, labels, members. */
  async getWorkspaceContext(userId: string | null): Promise<McpWorkspaceContext> {
    return loadMcpWorkspaceContext(this.db, this.workspaceId, userId);
  }

  // --- Writes (Action Bus) ------------------------------------------------

  private async execAgentMutation(
    op: string,
    topic: string | null,
    payload: Record<string, unknown>,
    params: Record<string, unknown>,
    meta: { targetType: string; mutationType: string; autoApply: boolean }
  ): Promise<MutationResult> {
    const { data, error } = await this.db.rpc('execute_agent_mutation', {
      p_op: op,
      p_workspace_id: this.workspaceId,
      p_topic: topic,
      p_payload: { ...payload, workspace_id: this.workspaceId, correlation_id: this.correlationId },
      p_correlation_id: this.correlationId,
      p_causation_id: null,
      p_params: params,
      p_session_id: null,
      p_actor_agent_id: this.principal.agentId,
      p_target_type: meta.targetType,
      p_mutation_type: meta.mutationType,
      p_auto_apply: meta.autoApply,
    });
    if (error) {
      throw new Error(`Agent mutation failed (${op}): ${error.message}`);
    }
    const row = data as {
      entity: Record<string, unknown> | null;
      outbox_event_id: string | null;
      action_id: string;
      status: 'applied' | 'proposed';
    };
    return {
      entity: row.entity,
      status: row.status,
      action_id: row.action_id,
      outbox_event_id: row.outbox_event_id ?? null,
    };
  }

  async createEpic(input: {
    name: string;
    slug: string;
    status_id: string;
    description_md?: string | null;
    priority?: string;
    lead_id?: string | null;
    start_date?: string | null;
    target_date?: string | null;
    team_ids?: string[];
  }): Promise<MutationResult> {
    return this.execAgentMutation(
      'create_epic',
      ENTITY_TOPICS.EPIC_CREATED,
      { epic_slug: input.slug, name: input.name, via: 'mcp' },
      {
        name: input.name,
        slug: input.slug,
        status_id: input.status_id,
        description_md: input.description_md ?? null,
        priority: input.priority ?? 'none',
        lead_id: input.lead_id ?? null,
        start_date: input.start_date ?? null,
        target_date: input.target_date ?? null,
        created_by: this.principal.userId,
        team_ids: input.team_ids ?? [],
      },
      { targetType: 'epic', mutationType: 'create_epic', autoApply: true }
    );
  }

  async updateEpic(epicId: string, patch: Record<string, unknown>): Promise<MutationResult> {
    return this.execAgentMutation(
      'update_epic',
      ENTITY_TOPICS.EPIC_UPDATED,
      { epic_id: epicId, patch, via: 'mcp' },
      { epic_id: epicId, ...patch },
      { targetType: 'epic', mutationType: 'update_epic', autoApply: true }
    );
  }

  async createStory(input: {
    team_id: string;
    title: string;
    workflow_state_id: string;
    description_md?: string | null;
    priority?: string;
    assignee_id?: string | null;
    delegate_agent_id?: string | null;
    epic_id?: string | null;
    milestone_id?: string | null;
    cycle_id?: string | null;
    estimate?: number | null;
  }): Promise<MutationResult> {
    return this.execAgentMutation(
      'create_story',
      ENTITY_TOPICS.STORY_CREATED,
      { team_id: input.team_id, title: input.title, via: 'mcp' },
      {
        team_id: input.team_id,
        title: input.title,
        description_md: input.description_md ?? null,
        workflow_state_id: input.workflow_state_id,
        priority: input.priority ?? 'none',
        assignee_id: input.assignee_id ?? null,
        delegate_agent_id: input.delegate_agent_id ?? null,
        epic_id: input.epic_id ?? null,
        milestone_id: input.milestone_id ?? null,
        cycle_id: input.cycle_id ?? null,
        estimate: input.estimate ?? null,
        created_by: this.principal.userId,
      },
      { targetType: 'story', mutationType: 'create_story', autoApply: true }
    );
  }

  async updateStory(
    teamId: string,
    storyId: string,
    patch: Record<string, unknown>,
    isStatusChange: boolean
  ): Promise<MutationResult> {
    return this.execAgentMutation(
      'update_story',
      isStatusChange ? ENTITY_TOPICS.STORY_STATUS_CHANGED : ENTITY_TOPICS.STORY_UPDATED,
      { story_id: storyId, patch, via: 'mcp' },
      { team_id: teamId, story_id: storyId, ...patch },
      { targetType: 'story', mutationType: 'update_story', autoApply: true }
    );
  }

  /**
   * First-class Story assignment through the Action Bus. `assignee` / `delegateAgent`
   * are tri-state: `undefined` leaves the field unchanged, `null` clears it, a string
   * sets it. This is what lets an agent be assigned (or unassigned) like a human.
   */
  async assignStory(
    storyId: string,
    input: { assignee_id?: string | null; delegate_agent_id?: string | null }
  ): Promise<MutationResult> {
    const params: Record<string, unknown> = { story_id: storyId };
    if ('assignee_id' in input) {
      params.assignee_id = input.assignee_id ?? null;
    }
    if ('delegate_agent_id' in input) {
      params.delegate_agent_id = input.delegate_agent_id ?? null;
    }
    return this.execAgentMutation(
      'assign_story',
      ENTITY_TOPICS.STORY_ASSIGNED,
      { story_id: storyId, via: 'mcp' },
      params,
      { targetType: 'story', mutationType: 'assign_story', autoApply: true }
    );
  }

  /**
   * First-class Epic assignment through the Action Bus (human `lead_id` and/or agent
   * `delegate_agent_id`). Same tri-state semantics as {@link assignStory}.
   */
  async assignEpic(
    epicId: string,
    input: { lead_id?: string | null; delegate_agent_id?: string | null }
  ): Promise<MutationResult> {
    const params: Record<string, unknown> = { epic_id: epicId };
    if ('lead_id' in input) {
      params.lead_id = input.lead_id ?? null;
    }
    if ('delegate_agent_id' in input) {
      params.delegate_agent_id = input.delegate_agent_id ?? null;
    }
    return this.execAgentMutation(
      'assign_epic',
      ENTITY_TOPICS.EPIC_ASSIGNED,
      { epic_id: epicId, via: 'mcp' },
      params,
      { targetType: 'epic', mutationType: 'assign_epic', autoApply: true }
    );
  }

  async createComment(input: {
    story_id?: string | null;
    epic_id?: string | null;
    parent_id?: string | null;
    body_md: string;
    actor_type?: 'human' | 'agent' | 'system';
    on_behalf_of_user_id?: string | null;
  }): Promise<MutationResult> {
    const actorType = input.actor_type ?? (this.principal.agentId ? 'agent' : 'human');
    return this.execAgentMutation(
      'create_comment',
      ENTITY_TOPICS.COMMENT_CREATED,
      { story_id: input.story_id ?? null, epic_id: input.epic_id ?? null, via: 'mcp' },
      {
        story_id: input.story_id ?? null,
        epic_id: input.epic_id ?? null,
        parent_id: input.parent_id ?? null,
        body_md: input.body_md,
        actor_type: actorType,
        author_user_id: actorType === 'human' ? this.principal.userId : null,
        on_behalf_of_user_id: input.on_behalf_of_user_id ?? null,
      },
      { targetType: 'comment', mutationType: 'create_comment', autoApply: true }
    );
  }

  async attachSignal(input: {
    story_id?: string | null;
    epic_id?: string | null;
    signal: Record<string, unknown>;
  }): Promise<MutationResult> {
    return this.execAgentMutation(
      'attach_signal',
      'signal.attached',
      { story_id: input.story_id ?? null, epic_id: input.epic_id ?? null, via: 'mcp' },
      {
        story_id: input.story_id ?? null,
        epic_id: input.epic_id ?? null,
        signal: input.signal,
      },
      { targetType: 'signal', mutationType: 'attach_signal', autoApply: true }
    );
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
