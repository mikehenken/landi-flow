import type { SupabaseClient } from '@supabase/supabase-js';
import { LINEAR_CLONE_SCHEMA, type LinearCloneSchema } from './schema.js';

/** Supabase client scoped to the non-public linear_clone schema. */
export type LinearCloneSupabaseClient = SupabaseClient<
  Record<string, unknown>,
  'public',
  LinearCloneSchema
>;

export { LINEAR_CLONE_SCHEMA };
