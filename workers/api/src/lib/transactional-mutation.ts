import type { CorrelationContext } from '@landi-flow/core/types';
import type { DbClient } from './db.js';
import type { ApiWorkerEnv } from '../middleware/auth.js';
import { LifecycleEmitter } from './outbox-emitter.js';

export type MutationOperation =
  | 'create_workspace'
  | 'update_workspace'
  | 'create_epic'
  | 'update_epic'
  | 'create_story'
  | 'update_story'
  | 'create_milestone'
  | 'update_milestone'
  | 'create_cycle'
  | 'update_cycle'
  | 'complete_cycle'
  | 'create_view'
  | 'update_view'
  | 'delete_view'
  | 'create_story_relation'
  | 'delete_story_relation'
  | 'create_workflow_state'
  | 'install_extension'
  | 'uninstall_extension'
  | 'create_webhook'
  | 'update_webhook'
  | 'delete_webhook'
  | 'archive_epic'
  | 'archive_story'
  | 'create_customer'
  | 'update_customer'
  | 'delete_customer'
  | 'invite_workspace_member'
  | 'update_workspace_member'
  | 'remove_workspace_member';

export interface TransactionalMutationInput {
  op: MutationOperation;
  workspace_id: string | null;
  topic: string | null;
  payload: Record<string, unknown>;
  correlation_id: string;
  causation_id?: string;
  params: Record<string, unknown>;
}

export interface TransactionalMutationResult<T> {
  entity: T;
  outbox_event_id: string | null;
}

interface RpcMutationRow {
  entity: unknown;
  outbox_event_id: string | null;
}

export async function executeTransactionalMutation<T>(
  db: DbClient,
  env: ApiWorkerEnv,
  input: TransactionalMutationInput
): Promise<TransactionalMutationResult<T>> {
  const emitter = new LifecycleEmitter(env);
  const emitEnabled = emitter.isEnabled() && input.topic !== null;

  const { data, error } = await db.rpc('execute_mutation_with_outbox', {
    p_op: input.op,
    p_workspace_id: input.workspace_id,
    p_topic: emitEnabled ? input.topic : null,
    p_payload: input.payload,
    p_correlation_id: input.correlation_id,
    p_causation_id: input.causation_id ?? null,
    p_params: input.params,
  });

  if (error) {
    throw new Error(`Transactional mutation failed (${input.op}): ${error.message}`);
  }

  const row = data as RpcMutationRow;
  return {
    entity: row.entity as T,
    outbox_event_id: row.outbox_event_id ?? null,
  };
}

export function buildMutationPayload(
  workspaceId: string,
  topic: string,
  payload: Record<string, unknown>,
  ctx: CorrelationContext
): Record<string, unknown> {
  return {
    ...payload,
    workspace_id: workspaceId,
    correlation_id: ctx.correlation_id,
    ...(ctx.causation_id ? { causation_id: ctx.causation_id } : {}),
  };
}
