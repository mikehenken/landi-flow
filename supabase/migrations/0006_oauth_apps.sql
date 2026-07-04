-- Minimal oauth_apps for agents.oauth_app_id FK (full credentials in later phase)
CREATE TABLE linear_clone.oauth_apps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  name            text NOT NULL,
  developer_name  text,
  redirect_uris   text[] NOT NULL DEFAULT '{}',
  is_public       boolean NOT NULL DEFAULT false,
  client_credentials_enabled boolean NOT NULL DEFAULT false,
  webhooks_enabled boolean NOT NULL DEFAULT false,
  client_id       text NOT NULL UNIQUE,
  client_secret_hash text NOT NULL,
  client_secret_vault_id uuid,
  icon_url        text,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz
);

CREATE TRIGGER oauth_apps_updated_at
  BEFORE UPDATE ON linear_clone.oauth_apps
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();
