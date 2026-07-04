-- AR-03 CI RLS gate: fail migration apply if any linear_clone table lacks RLS.

DO $$
DECLARE
  v_unprotected text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
  INTO v_unprotected
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'linear_clone'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity;

  IF v_unprotected IS NOT NULL THEN
    RAISE EXCEPTION 'AR-03 RLS gate failed: tables without RLS enabled: %', v_unprotected;
  END IF;
END;
$$;

COMMENT ON SCHEMA linear_clone IS
  'AR-03: all user-facing tables must have RLS enabled (verified by 0019_ar03_rls_gate.sql).';
