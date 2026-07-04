CREATE TABLE linear_clone.workflow_states (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES linear_clone.teams(id) ON DELETE CASCADE,
  name            text NOT NULL,
  category        linear_clone.workflow_category NOT NULL,
  position        int NOT NULL DEFAULT 0,
  color           text,
  is_default      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, name)
);

CREATE TRIGGER workflow_states_updated_at
  BEFORE UPDATE ON linear_clone.workflow_states
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();
