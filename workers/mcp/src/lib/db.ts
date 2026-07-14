import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LINEAR_CLONE_SCHEMA } from '@landi-flow/auth/schema';
import { requireServiceRoleKey, type McpWorkerEnv } from '../env.js';

/**
 * Service-role client for the linear_clone schema. The MCP Worker is a trusted
 * server tier (like the API Worker); it bypasses RLS and enforces authorization
 * in application code via credential scopes + workspace/team membership checks.
 */
export type DbClient = SupabaseClient;

export function createServiceDbClient(env: McpWorkerEnv): DbClient {
  const serviceKey = requireServiceRoleKey(env);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: LINEAR_CLONE_SCHEMA },
  }) as unknown as DbClient;
}
