-- STUDY-013 task-09ag/09aj/09ak — customer asks + SLA, admin settings, personal prefs.

CREATE TYPE linear_clone.ask_intake_source AS ENUM ('web', 'slack', 'email', 'api');

CREATE TABLE linear_clone.customer_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES linear_clone.customers(id) ON DELETE CASCADE,
  quote           text NOT NULL,
  source          linear_clone.ask_intake_source NOT NULL DEFAULT 'web',
  source_url      text,
  requester_name  text,
  is_important    boolean NOT NULL DEFAULT false,
  correlation_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER customer_requests_updated_at
  BEFORE UPDATE ON linear_clone.customer_requests
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TABLE linear_clone.customer_request_stories (
  request_id      uuid NOT NULL REFERENCES linear_clone.customer_requests(id) ON DELETE CASCADE,
  story_id        uuid NOT NULL REFERENCES linear_clone.stories(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, story_id)
);

CREATE TABLE linear_clone.customer_request_epics (
  request_id      uuid NOT NULL REFERENCES linear_clone.customer_requests(id) ON DELETE CASCADE,
  epic_id         uuid NOT NULL REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  PRIMARY KEY (request_id, epic_id)
);

CREATE TABLE linear_clone.slas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  team_id         uuid REFERENCES linear_clone.teams(id) ON DELETE SET NULL,
  name            text NOT NULL,
  rules           jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER slas_updated_at
  BEFORE UPDATE ON linear_clone.slas
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TABLE linear_clone.workspace_invite_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  token_hash      text NOT NULL UNIQUE,
  label           text,
  role            linear_clone.workspace_member_role NOT NULL DEFAULT 'member',
  max_uses        int,
  use_count       int NOT NULL DEFAULT 0,
  expires_at      timestamptz,
  revoked_at      timestamptz,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.user_notification_prefs (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  email_enabled   boolean NOT NULL DEFAULT true,
  slack_enabled   boolean NOT NULL DEFAULT false,
  in_app_enabled  boolean NOT NULL DEFAULT true,
  digest          text NOT NULL DEFAULT 'immediate',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workspace_id)
);

ALTER TABLE linear_clone.profiles
  ADD COLUMN IF NOT EXISTS settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE linear_clone.stories
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES linear_clone.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_id uuid REFERENCES linear_clone.slas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sla_due_at timestamptz;

CREATE INDEX customer_requests_workspace_idx
  ON linear_clone.customer_requests (workspace_id, created_at DESC);

CREATE INDEX slas_workspace_idx
  ON linear_clone.slas (workspace_id, created_at DESC);

CREATE INDEX stories_customer_idx
  ON linear_clone.stories (workspace_id, customer_id)
  WHERE customer_id IS NOT NULL;

-- RLS
ALTER TABLE linear_clone.customer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.customer_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.customer_request_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.customer_request_stories FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.customer_request_epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.customer_request_epics FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.slas ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.slas FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.workspace_invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.workspace_invite_links FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.user_notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.user_notification_prefs FORCE ROW LEVEL SECURITY;

CREATE POLICY customer_requests_select ON linear_clone.customer_requests
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY customer_requests_write ON linear_clone.customer_requests
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY customer_request_stories_select ON linear_clone.customer_request_stories
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.customer_requests cr
      WHERE cr.id = request_id
        AND linear_clone.is_workspace_member(cr.workspace_id)
    )
  );

CREATE POLICY customer_request_stories_write ON linear_clone.customer_request_stories
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.customer_requests cr
      WHERE cr.id = request_id
        AND linear_clone.is_workspace_member(cr.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.customer_requests cr
      WHERE cr.id = request_id
        AND linear_clone.is_workspace_member(cr.workspace_id)
    )
  );

CREATE POLICY customer_request_epics_select ON linear_clone.customer_request_epics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.customer_requests cr
      WHERE cr.id = request_id
        AND linear_clone.is_workspace_member(cr.workspace_id)
    )
  );

CREATE POLICY customer_request_epics_write ON linear_clone.customer_request_epics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.customer_requests cr
      WHERE cr.id = request_id
        AND linear_clone.is_workspace_member(cr.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.customer_requests cr
      WHERE cr.id = request_id
        AND linear_clone.is_workspace_member(cr.workspace_id)
    )
  );

CREATE POLICY slas_select ON linear_clone.slas
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY slas_admin_write ON linear_clone.slas
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id))
  WITH CHECK (linear_clone.is_workspace_admin(workspace_id));

CREATE POLICY invite_links_select ON linear_clone.workspace_invite_links
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id));

CREATE POLICY invite_links_admin_write ON linear_clone.workspace_invite_links
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id))
  WITH CHECK (linear_clone.is_workspace_admin(workspace_id));

CREATE POLICY notification_prefs_own ON linear_clone.user_notification_prefs
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.customer_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.customer_request_stories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.customer_request_epics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.slas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.workspace_invite_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.user_notification_prefs TO authenticated;

NOTIFY pgrst, 'reload schema';
