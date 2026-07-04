import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { LINEAR_CLONE_SCHEMA } from '@landi-flow/auth/schema';
import type { ApiWorkerEnv } from '../middleware/auth.js';

/** Service-role client for linear_clone schema (generated DB types deferred to Phase 10). */
export type DbClient = SupabaseClient;

export function createDbClient(env: ApiWorkerEnv): DbClient {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for data mutations');
  }

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: LINEAR_CLONE_SCHEMA },
  }) as unknown as DbClient;
}
