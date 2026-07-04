-- HITM: Epic (never Project). epic_attached_views deferred until views exist (0009).
CREATE TABLE linear_clone.epic_statuses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  name            text NOT NULL,
  category        linear_clone.epic_status_category NOT NULL,
  position        int NOT NULL DEFAULT 0,
  color           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE TABLE linear_clone.epics (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            citext NOT NULL,
  icon_url        text,
  description_json jsonb,
  description_md  text,
  status_id       uuid NOT NULL REFERENCES linear_clone.epic_statuses(id),
  priority        linear_clone.epic_priority NOT NULL DEFAULT 'none',
  lead_id         uuid REFERENCES auth.users(id),
  start_date      date,
  target_date     date,
  progress_cache  jsonb,
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived_at     timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  correlation_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE linear_clone.epic_teams (
  epic_id         uuid NOT NULL REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  team_id         uuid NOT NULL REFERENCES linear_clone.teams(id) ON DELETE CASCADE,
  PRIMARY KEY (epic_id, team_id)
);

CREATE TABLE linear_clone.epic_members (
  epic_id         uuid NOT NULL REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  PRIMARY KEY (epic_id, user_id)
);

CREATE TABLE linear_clone.epic_labels_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE TABLE linear_clone.epic_labels (
  epic_id         uuid NOT NULL REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  label_id        uuid NOT NULL REFERENCES linear_clone.epic_labels_catalog(id) ON DELETE CASCADE,
  PRIMARY KEY (epic_id, label_id)
);

CREATE TABLE linear_clone.epic_dependencies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  blocked_epic_id uuid NOT NULL REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  blocking_epic_id uuid NOT NULL REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocked_epic_id, blocking_epic_id),
  CHECK (blocked_epic_id <> blocking_epic_id)
);

CREATE TRIGGER epics_updated_at
  BEFORE UPDATE ON linear_clone.epics
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE INDEX epics_workspace_status_idx ON linear_clone.epics (workspace_id, status_id);
