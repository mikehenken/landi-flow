-- Table grants for authenticated role (Data API)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA linear_clone TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA linear_clone TO authenticated;

-- Revoke outbox direct access from authenticated (controllers use service_role)
REVOKE ALL ON linear_clone.outbox_events FROM authenticated;

-- Default privileges for future tables in linear_clone
ALTER DEFAULT PRIVILEGES IN SCHEMA linear_clone
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
