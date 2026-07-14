-- PostgREST / Data API grants for linear_clone (task-09m iteration 4).
-- 0001 grants USAGE to authenticated only; 0014 grants tables to authenticated only.
-- service_role (Supabase JS service key) needs schema + object privileges for linear_clone.
-- Idempotent: GRANT is re-runnable; reserved/missing roles are skipped via DO blocks.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT USAGE ON SCHEMA linear_clone TO service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA linear_clone TO service_role;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA linear_clone TO service_role;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'linear_clone service_role grants skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT USAGE ON SCHEMA linear_clone TO anon;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'linear_clone anon schema usage skipped: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT USAGE ON SCHEMA linear_clone TO postgres;
  END IF;
EXCEPTION
  WHEN insufficient_privilege OR undefined_object THEN
    RAISE NOTICE 'linear_clone postgres schema usage skipped: %', SQLERRM;
END $$;

DO $$
DECLARE
  grantor text;
BEGIN
  FOREACH grantor IN ARRAY ARRAY['postgres', 'supabase_admin'] LOOP
    CONTINUE WHEN NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = grantor);
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA linear_clone '
      || 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role',
      grantor
    );
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA linear_clone '
      || 'GRANT USAGE, SELECT ON SEQUENCES TO service_role',
      grantor
    );
  END LOOP;
EXCEPTION
  WHEN insufficient_privilege OR undefined_object THEN
    RAISE NOTICE 'linear_clone default privileges for service_role skipped: %', SQLERRM;
END $$;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
