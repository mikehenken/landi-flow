-- STUDY-013 task-09 batch — ART-001 artifacts, initiatives, pulse, recurring stories, epic customers.

CREATE TYPE linear_clone.initiative_status AS ENUM ('active', 'planned', 'completed');

CREATE TYPE linear_clone.recurring_cadence AS ENUM ('daily', 'weekly', 'biweekly', 'monthly');

CREATE TYPE linear_clone.pulse_schedule_cadence AS ENUM ('daily', 'weekly', 'biweekly');

-- ART-001: story_artifacts
CREATE TABLE linear_clone.story_artifacts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  story_id            uuid REFERENCES linear_clone.stories(id) ON DELETE CASCADE,
  epic_id             uuid REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  artifact_kind       text NOT NULL,
  source              text NOT NULL,
  title               text NOT NULL,
  summary             text,
  mime_type           text,
  byte_size           bigint,
  agent_id            uuid REFERENCES linear_clone.agents(id) ON DELETE SET NULL,
  session_id          text,
  correlation_id      text,
  parent_artifact_id  uuid REFERENCES linear_clone.story_artifacts(id) ON DELETE SET NULL,
  storage_provider    text NOT NULL DEFAULT 'r2',
  storage_key         text,
  inline_body         text,
  content_hash        text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artifact_target_chk CHECK (
    (story_id IS NOT NULL AND epic_id IS NULL) OR
    (story_id IS NULL AND epic_id IS NOT NULL)
  )
);

CREATE TRIGGER story_artifacts_updated_at
  BEFORE UPDATE ON linear_clone.story_artifacts
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE INDEX idx_story_artifacts_story
  ON linear_clone.story_artifacts (story_id, created_at DESC);
CREATE INDEX idx_story_artifacts_epic
  ON linear_clone.story_artifacts (epic_id, created_at DESC);
CREATE INDEX idx_story_artifacts_correlation
  ON linear_clone.story_artifacts (correlation_id)
  WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_story_artifacts_session
  ON linear_clone.story_artifacts (session_id)
  WHERE session_id IS NOT NULL;

-- CAP-045: epic customer links
CREATE TABLE linear_clone.epic_customers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id         uuid NOT NULL REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES linear_clone.customers(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (epic_id, customer_id)
);

-- CAP-058–060: initiatives
CREATE TABLE linear_clone.initiative_settings (
  workspace_id        uuid PRIMARY KEY REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  enabled             boolean NOT NULL DEFAULT false,
  schedule_cadence    text NOT NULL DEFAULT 'weekly',
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER initiative_settings_updated_at
  BEFORE UPDATE ON linear_clone.initiative_settings
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TABLE linear_clone.initiatives (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description_md  text,
  status          linear_clone.initiative_status NOT NULL DEFAULT 'planned',
  owner_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date      date,
  target_date     date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER initiatives_updated_at
  BEFORE UPDATE ON linear_clone.initiatives
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TABLE linear_clone.initiative_epics (
  initiative_id   uuid NOT NULL REFERENCES linear_clone.initiatives(id) ON DELETE CASCADE,
  epic_id         uuid NOT NULL REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (initiative_id, epic_id)
);

-- CAP-063–065: pulse
CREATE TABLE linear_clone.pulse_updates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  epic_id         uuid REFERENCES linear_clone.epics(id) ON DELETE SET NULL,
  title           text NOT NULL,
  body_md         text NOT NULL DEFAULT '',
  author_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.pulse_schedules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  label           text NOT NULL,
  cadence         linear_clone.pulse_schedule_cadence NOT NULL DEFAULT 'weekly',
  enabled         boolean NOT NULL DEFAULT true,
  last_run_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER pulse_schedules_updated_at
  BEFORE UPDATE ON linear_clone.pulse_schedules
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

-- CAP-010: recurring story rules
CREATE TABLE linear_clone.recurring_story_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  team_id         uuid NOT NULL REFERENCES linear_clone.teams(id) ON DELETE CASCADE,
  title_template  text NOT NULL,
  cadence         linear_clone.recurring_cadence NOT NULL DEFAULT 'weekly',
  enabled         boolean NOT NULL DEFAULT true,
  last_spawn_at   timestamptz,
  spawn_count     int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER recurring_story_rules_updated_at
  BEFORE UPDATE ON linear_clone.recurring_story_rules
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE INDEX initiatives_workspace_status_idx
  ON linear_clone.initiatives (workspace_id, status);
CREATE INDEX pulse_updates_workspace_idx
  ON linear_clone.pulse_updates (workspace_id, created_at DESC);
CREATE INDEX recurring_story_rules_team_idx
  ON linear_clone.recurring_story_rules (team_id, enabled);

-- RLS
ALTER TABLE linear_clone.story_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.story_artifacts FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_customers FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.initiative_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.initiative_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.initiatives FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.initiative_epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.initiative_epics FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.pulse_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.pulse_updates FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.pulse_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.pulse_schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.recurring_story_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.recurring_story_rules FORCE ROW LEVEL SECURITY;

CREATE POLICY story_artifacts_select ON linear_clone.story_artifacts
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY story_artifacts_write ON linear_clone.story_artifacts
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY epic_customers_select ON linear_clone.epic_customers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.epics e
      WHERE e.id = epic_id AND linear_clone.is_workspace_member(e.workspace_id)
    )
  );

CREATE POLICY epic_customers_write ON linear_clone.epic_customers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.epics e
      WHERE e.id = epic_id AND linear_clone.is_workspace_member(e.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.epics e
      WHERE e.id = epic_id AND linear_clone.is_workspace_member(e.workspace_id)
    )
  );

CREATE POLICY initiative_settings_rw ON linear_clone.initiative_settings
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY initiatives_rw ON linear_clone.initiatives
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY initiative_epics_rw ON linear_clone.initiative_epics
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.initiatives i
      WHERE i.id = initiative_id AND linear_clone.is_workspace_member(i.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.initiatives i
      WHERE i.id = initiative_id AND linear_clone.is_workspace_member(i.workspace_id)
    )
  );

CREATE POLICY pulse_updates_rw ON linear_clone.pulse_updates
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY pulse_schedules_rw ON linear_clone.pulse_schedules
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY recurring_story_rules_rw ON linear_clone.recurring_story_rules
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.story_artifacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.epic_customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.initiative_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.initiatives TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.initiative_epics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.pulse_updates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.pulse_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON linear_clone.recurring_story_rules TO authenticated;
