import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type { CorrelationContext, Story } from '@landi-flow/core/types';

export interface PrepareEmitStatement {
  sql: string;
  params: unknown[];
}

/**
 * Transactional outbox emitter — server tier.
 * Reference: landi-store-extension `LifecycleEmitter.prepareEmit()`.
 * Clone: INSERT into linear_clone.outbox_events in same Postgres txn as entity mutation.
 */
export class LifecycleEmitter {
  constructor(private readonly enabled: boolean) {}

  prepareEmit(
    workspaceId: string,
    topic: string,
    payload: unknown,
    correlationId: string,
    causationId?: string
  ): PrepareEmitStatement | null {
    if (!this.enabled) {
      return null;
    }

    const id = crypto.randomUUID();
    const payloadStr = JSON.stringify(payload);

    return {
      sql: `INSERT INTO linear_clone.outbox_events
        (id, workspace_id, topic, payload, correlation_id, causation_id, status)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, 'pending')`,
      params: [id, workspaceId, topic, payloadStr, correlationId, causationId ?? null],
    };
  }
}

export { ENTITY_TOPICS };

export interface StoryCreateInput {
  team_id: string;
  epic_id?: string | null;
  title: string;
  description_md?: string | null;
}

/**
 * core-pm Story controller — RBAC → mutate → prepareEmit in one Supabase transaction.
 * Agent/MCP writes stage via agent_action_outbox first (see architecture-document.md).
 */
export class StoryController {
  constructor(private readonly emitter: LifecycleEmitter) {}

  async createStory(
    workspaceId: string,
    input: StoryCreateInput,
    ctx: CorrelationContext
  ): Promise<{ story: Story; outbox: PrepareEmitStatement | null }> {
    // Phase 09: Supabase service-role transaction (entity INSERT + outbox INSERT)
    const story: Story = {
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      team_id: input.team_id,
      epic_id: input.epic_id ?? null,
      identifier: 'LAN-0',
      title: input.title,
      description_md: input.description_md ?? null,
      priority: 'none',
      workflow_state_id: 'placeholder',
      assignee_user_id: null,
      delegate_agent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const outbox = this.emitter.prepareEmit(
      workspaceId,
      ENTITY_TOPICS.STORY_CREATED,
      { story_id: story.id, team_id: input.team_id },
      ctx.correlation_id,
      ctx.causation_id
    );

    return { story, outbox };
  }
}
