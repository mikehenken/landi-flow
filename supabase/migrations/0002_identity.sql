-- Identity and tenancy
CREATE TABLE linear_clone.profiles (
  user_id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text NOT NULL,
  avatar_url      text,
  timezone        text DEFAULT 'UTC',
  locale          text DEFAULT 'en',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.workspaces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            citext NOT NULL UNIQUE,
  name            text NOT NULL,
  icon_url        text,
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE TABLE linear_clone.workspace_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            linear_clone.workspace_member_role NOT NULL DEFAULT 'member',
  status          linear_clone.workspace_member_status NOT NULL DEFAULT 'active',
  invited_by      uuid REFERENCES auth.users(id),
  joined_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE linear_clone.teams (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  slug            citext NOT NULL,
  name            text NOT NULL,
  key             citext NOT NULL,
  icon_url        text,
  visibility      linear_clone.team_visibility NOT NULL DEFAULT 'public',
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  UNIQUE (workspace_id, slug),
  UNIQUE (workspace_id, key)
);

CREATE TABLE linear_clone.team_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES linear_clone.teams(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            linear_clone.team_member_role NOT NULL DEFAULT 'member',
  status          linear_clone.workspace_member_status NOT NULL DEFAULT 'active',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON linear_clone.profiles
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON linear_clone.workspaces
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TRIGGER workspace_members_updated_at
  BEFORE UPDATE ON linear_clone.workspace_members
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON linear_clone.teams
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON linear_clone.team_members
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();
