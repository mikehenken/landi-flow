  -- Expose linear_clone to PostgREST on hosted Supabase (matches supabase/config.toml [api].schemas).
  -- Idempotent: re-running keeps linear_clone in the schema list.
  DO $$
  DECLARE
    current_schemas text;
    merged text;
  BEGIN
    SELECT split_part(setconfig[1], '=', 2)
    INTO current_schemas
    FROM pg_db_role_setting s
    JOIN pg_roles r ON r.oid = s.setrole
    WHERE r.rolname = 'authenticator'
      AND setconfig[1] LIKE 'pgrst.db_schemas=%'
    LIMIT 1;

    IF current_schemas IS NULL OR current_schemas = '' THEN
      merged := 'public, storage, graphql_public, linear_clone';
    ELSIF position('linear_clone' in current_schemas) = 0 THEN
      merged := current_schemas || ', linear_clone';
    ELSE
      merged := current_schemas;
    END IF;

    -- Hosted Supabase: only alter authenticator. supabase_admin is reserved (42501).
    EXECUTE format('ALTER ROLE authenticator SET pgrst.db_schemas = %L', merged);
  END $$;

  NOTIFY pgrst, 'reload config';
