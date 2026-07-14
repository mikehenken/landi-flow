-- NF-01 partial fix: agents table ONLY in this migration.
-- agent_sessions / agent_activities / agent_action_outbox deferred to 0010
-- after stories (0008) and comments (0009) exist.
CREATE TABLE linear_clone.agents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  oauth_app_id    uuid REFERENCES linear_clone.oauth_apps(id),
  app_user_id     uuid NOT NULL UNIQUE,
  display_name    text NOT NULL,
  icon_url        text,
  mentionable     boolean NOT NULL DEFAULT true,
  assignable      boolean NOT NULL DEFAULT true,
  billable        boolean NOT NULL DEFAULT false,
  mcp_enabled     boolean NOT NULL DEFAULT false,
  installed_by    uuid NOT NULL REFERENCES auth.users(id),
  per_workspace_app_id text,
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.agent_team_access (
  agent_id        uuid NOT NULL REFERENCES linear_clone.agents(id) ON DELETE CASCADE,
  team_id         uuid NOT NULL REFERENCES linear_clone.teams(id) ON DELETE CASCADE,
  granted_by      uuid NOT NULL REFERENCES auth.users(id),
  granted_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (agent_id, team_id)
);

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON linear_clone.agents
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();
