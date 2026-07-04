import type { CorrelationContext } from '@landi-flow/core/types';
import type { DbClient } from '../lib/db.js';
import {
  assertTeamReadable,
  assertTeamWriteAccess,
  assertWorkspaceAdmin,
  assertWorkspaceMember,
} from '../lib/authorization.js';
import type { ApiWorkerEnv } from '../middleware/auth.js';
import {
  buildMutationPayload,
  executeTransactionalMutation,
  type MutationOperation,
  type TransactionalMutationResult,
} from '../lib/transactional-mutation.js';

export abstract class BaseController {
  constructor(
    protected readonly env: ApiWorkerEnv,
    protected readonly db: DbClient,
    protected readonly userId: string
  ) {}

  protected async assertWorkspaceMember(workspaceId: string): Promise<void> {
    await assertWorkspaceMember(this.db, this.userId, workspaceId);
  }

  protected async assertWorkspaceAdmin(workspaceId: string): Promise<void> {
    await assertWorkspaceAdmin(this.db, this.userId, workspaceId);
  }

  protected async assertTeamWriteAccess(workspaceId: string, teamId: string): Promise<void> {
    await assertTeamWriteAccess(this.db, this.userId, workspaceId, teamId);
  }

  protected async assertTeamReadable(workspaceId: string, teamId: string): Promise<void> {
    await assertTeamReadable(this.db, this.userId, workspaceId, teamId);
  }

  protected async mutateWithOutbox<T>(
    workspaceId: string,
    topic: string,
    payload: Record<string, unknown>,
    ctx: CorrelationContext,
    op: MutationOperation,
    params: Record<string, unknown>
  ): Promise<TransactionalMutationResult<T>> {
    return executeTransactionalMutation<T>(this.db, this.env, {
      op,
      workspace_id: workspaceId,
      topic,
      payload: buildMutationPayload(workspaceId, topic, payload, ctx),
      correlation_id: ctx.correlation_id,
      causation_id: ctx.causation_id,
      params,
    });
  }

  protected async mutateWithOutboxNullableWorkspace<T>(
    topic: string,
    payload: Record<string, unknown>,
    ctx: CorrelationContext,
    op: MutationOperation,
    params: Record<string, unknown>
  ): Promise<TransactionalMutationResult<T>> {
    return executeTransactionalMutation<T>(this.db, this.env, {
      op,
      workspace_id: null,
      topic,
      payload: {
        ...payload,
        correlation_id: ctx.correlation_id,
        ...(ctx.causation_id ? { causation_id: ctx.causation_id } : {}),
      },
      correlation_id: ctx.correlation_id,
      causation_id: ctx.causation_id,
      params,
    });
  }
}
