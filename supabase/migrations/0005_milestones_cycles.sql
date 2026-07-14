CREATE TABLE linear_clone.milestones (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id         uuid NOT NULL REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  target_date     date,
  position        int NOT NULL DEFAULT 0,
  completed_at    timestamptz,
  issue_count     int NOT NULL DEFAULT 0,
  completed_issue_count int NOT NULL DEFAULT 0,
  progress_pct    numeric(5,2) GENERATED ALWAYS AS (
    CASE WHEN issue_count = 0 THEN 0
         ELSE (completed_issue_count::numeric / issue_count * 100) END
  ) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.cycles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES linear_clone.teams(id) ON DELETE CASCADE,
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  name            text NOT NULL,
  number          int NOT NULL,
  starts_at       date NOT NULL,
  ends_at         date NOT NULL,
  completed_at    timestamptz,
  settings        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, number)
);

CREATE TRIGGER milestones_updated_at
  BEFORE UPDATE ON linear_clone.milestones
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TRIGGER cycles_updated_at
  BEFORE UPDATE ON linear_clone.cycles
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE INDEX milestones_epic_position_idx ON linear_clone.milestones (epic_id, position);
