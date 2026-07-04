-- Concurrency-safe team-scoped number allocation (G-05) and default workflow states (G-03).

CREATE TABLE linear_clone_internal.team_entity_counters (
  team_id       uuid NOT NULL REFERENCES linear_clone.teams(id) ON DELETE CASCADE,
  entity_type   text NOT NULL CHECK (entity_type IN ('story', 'cycle')),
  next_number   int NOT NULL DEFAULT 1,
  PRIMARY KEY (team_id, entity_type)
);

REVOKE ALL ON TABLE linear_clone_internal.team_entity_counters FROM PUBLIC;

CREATE OR REPLACE FUNCTION linear_clone_internal.allocate_team_number(
  p_team_id uuid,
  p_entity_type text
)
RETURNS int
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_number int;
BEGIN
  INSERT INTO linear_clone_internal.team_entity_counters (team_id, entity_type, next_number)
  VALUES (p_team_id, p_entity_type, 2)
  ON CONFLICT (team_id, entity_type)
  DO UPDATE SET next_number = linear_clone_internal.team_entity_counters.next_number + 1
  RETURNING next_number - 1 INTO v_number;

  RETURN v_number;
END;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.allocate_team_number FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.allocate_team_number TO service_role;

-- Seed default workflow states for every team (G-03: story-create exercisable).
CREATE OR REPLACE FUNCTION linear_clone_internal.ensure_default_workflow_states(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO linear_clone.workflow_states (team_id, name, category, position, is_default)
  SELECT p_team_id, d.name, d.category::linear_clone.workflow_category, d.position, d.is_default
  FROM (VALUES
    ('Backlog', 'backlog', 0, true),
    ('Todo', 'unstarted', 1, false),
    ('In Progress', 'started', 2, false),
    ('Done', 'completed', 3, false)
  ) AS d(name, category, position, is_default)
  ON CONFLICT (team_id, name) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION linear_clone_internal.ensure_default_workflow_states FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone_internal.ensure_default_workflow_states TO service_role;

-- Backfill existing teams.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM linear_clone.teams LOOP
    PERFORM linear_clone_internal.ensure_default_workflow_states(r.id);
  END LOOP;
END;
$$;

-- PostgREST wrapper for controllers.
CREATE OR REPLACE FUNCTION linear_clone.ensure_default_workflow_states(p_team_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT linear_clone_internal.ensure_default_workflow_states(p_team_id);
$$;

REVOKE ALL ON FUNCTION linear_clone.ensure_default_workflow_states FROM PUBLIC;
GRANT EXECUTE ON FUNCTION linear_clone.ensure_default_workflow_states TO service_role;
