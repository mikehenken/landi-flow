-- STUDY-013 task-09e: RLS for extensions, webhooks, billing tables

ALTER TABLE linear_clone.extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.extensions FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.extension_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.extension_installs FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.import_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.webhooks FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.webhook_deliveries FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.entitlements FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.ai_gateway_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.ai_gateway_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.audit_log FORCE ROW LEVEL SECURITY;

-- Public marketplace catalog (read-only for authenticated)
CREATE POLICY extensions_catalog_select ON linear_clone.extensions
  FOR SELECT TO authenticated
  USING (true);

-- Workspace extension installs
CREATE POLICY extension_installs_select ON linear_clone.extension_installs
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY extension_installs_admin_write ON linear_clone.extension_installs
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id))
  WITH CHECK (linear_clone.is_workspace_admin(workspace_id));

-- Import jobs
CREATE POLICY import_jobs_select ON linear_clone.import_jobs
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY import_jobs_admin_write ON linear_clone.import_jobs
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id))
  WITH CHECK (linear_clone.is_workspace_admin(workspace_id));

-- Outbound webhooks (admin only)
CREATE POLICY webhooks_admin_select ON linear_clone.webhooks
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id));

CREATE POLICY webhooks_admin_write ON linear_clone.webhooks
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id))
  WITH CHECK (linear_clone.is_workspace_admin(workspace_id));

CREATE POLICY webhook_deliveries_admin_select ON linear_clone.webhook_deliveries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.webhooks w
      WHERE w.id = webhook_id AND linear_clone.is_workspace_admin(w.workspace_id)
    )
  );

-- Billing: owner/admin read; mutations via service role (Stripe webhook)
CREATE POLICY subscriptions_admin_select ON linear_clone.subscriptions
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id));

CREATE POLICY entitlements_member_select ON linear_clone.entitlements
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY ai_usage_admin_select ON linear_clone.ai_gateway_usage
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id));

CREATE POLICY audit_log_admin_select ON linear_clone.audit_log
  FOR SELECT TO authenticated
  USING (
    workspace_id IS NULL OR linear_clone.is_workspace_admin(workspace_id)
  );

-- outbox_events: deny direct client access (service role via controllers)
-- webhook_deliveries writes: service role only (no authenticated INSERT/UPDATE policies)

-- AR-03 gate: assert all linear_clone tables have RLS enabled
DO $$
DECLARE
  v_missing int;
BEGIN
  SELECT count(*) INTO v_missing
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'linear_clone'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity;

  IF v_missing > 0 THEN
    RAISE EXCEPTION 'AR-03 RLS gate failed: % linear_clone tables missing RLS', v_missing;
  END IF;
END;
$$;
