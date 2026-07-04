import type { CorrelationContext } from '@landi-flow/core/types';
import type { DbClient } from '../lib/db.js';
import { LifecycleEmitter, persistOutboxEvent, type PrepareEmitStatement } from '../lib/outbox-emitter.js';
import type { ApiWorkerEnv } from '../middleware/auth.js';

export abstract class BaseController {
  protected readonly emitter: LifecycleEmitter;

  constructor(protected readonly env: ApiWorkerEnv, protected readonly db: DbClient) {
    this.emitter = new LifecycleEmitter(env);
  }

  protected async mutateWithOutbox<T>(
    workspaceId: string,
    topic: string,
    payload: Record<string, unknown>,
    ctx: CorrelationContext,
    mutate: () => Promise<T>
  ): Promise<{ result: T; outbox_event_id: string | null }> {
    const result = await mutate();
    const emit = this.emitter.prepareEmit(workspaceId, topic, payload, ctx);
    if (!emit) {
      return { result, outbox_event_id: null };
    }
    const outboxEventId = await persistOutboxEvent(this.db, emit);
    return { result, outbox_event_id: outboxEventId };
  }

  protected prepareOnly(
    workspaceId: string,
    topic: string,
    payload: Record<string, unknown>,
    ctx: CorrelationContext
  ): PrepareEmitStatement | null {
    return this.emitter.prepareEmit(workspaceId, topic, payload, ctx);
  }
}
