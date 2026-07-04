import type { CorrelationContext } from '@landi-flow/core/types';
import type { ApiWorkerEnv } from '../middleware/auth.js';

export interface PrepareEmitStatement {
  workspaceId: string;
  topic: string;
  payload: Record<string, unknown>;
  correlationId: string;
  causationId?: string;
}

/**
 * Outbox emitter — server tier.
 * Reference: landi-store-extension `LifecycleEmitter.prepareEmit()`.
 * Atomic persistence: entity DML + outbox INSERT occur in one Postgres transaction
 * via `linear_clone.execute_mutation_with_outbox` RPC (not separate client round-trips).
 * OBS-001: correlation_id required on every event.
 */
export class LifecycleEmitter {
  constructor(private readonly env: ApiWorkerEnv) {}

  isEnabled(): boolean {
    return this.env.ENABLE_OUTBOX_EMITTER !== 'false';
  }

  prepareEmit(
    workspaceId: string,
    topic: string,
    payload: Record<string, unknown>,
    ctx: CorrelationContext
  ): PrepareEmitStatement | null {
    if (!this.isEnabled()) {
      return null;
    }

    return {
      workspaceId,
      topic,
      payload: {
        ...payload,
        workspace_id: workspaceId,
        correlation_id: ctx.correlation_id,
        ...(ctx.causation_id ? { causation_id: ctx.causation_id } : {}),
      },
      correlationId: ctx.correlation_id,
      causationId: ctx.causation_id,
    };
  }
}

export async function persistOutboxEvent(
  db: ReturnType<typeof import('./db.js').createDbClient>,
  emit: PrepareEmitStatement
): Promise<string> {
  const { data, error } = await db.rpc('insert_outbox_event', {
    p_workspace_id: emit.workspaceId,
    p_topic: emit.topic,
    p_payload: emit.payload,
    p_correlation_id: emit.correlationId,
    p_causation_id: emit.causationId ?? null,
  });

  if (error) {
    throw new Error(`Outbox insert failed: ${error.message}`);
  }

  return String(data);
}
