-- task-09m iteration 6: citext on hosted Supabase lives in extensions schema.
-- 0032 may no-op (IF NOT EXISTS) when citext is already in extensions, not public.
-- execute_mutation_with_outbox uses SET search_path = '' so bare ::citext fails at runtime.
-- SUPERSEDED by 0034_citext_to_citext_helper.sql (search_path=extensions misses public citext).

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

ALTER FUNCTION linear_clone_internal.execute_mutation_with_outbox(
  text,
  uuid,
  text,
  jsonb,
  uuid,
  uuid,
  jsonb
) SET search_path TO extensions;

NOTIFY pgrst, 'reload schema';
