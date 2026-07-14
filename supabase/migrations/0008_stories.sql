CREATE TABLE linear_clone.labels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  team_id         uuid REFERENCES linear_clone.teams(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text,
  description     text,
  group_name      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.stories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  team_id         uuid NOT NULL REFERENCES linear_clone.teams(id) ON DELETE RESTRICT,
  number          int NOT NULL,
  identifier      text NOT NULL,
  title           text NOT NULL,
  description_json  jsonb,
  description_md    text,
  workflow_state_id uuid NOT NULL REFERENCES linear_clone.workflow_states(id),
  priority        linear_clone.story_priority NOT NULL DEFAULT 'none',
  assignee_id     uuid REFERENCES auth.users(id),
  delegate_agent_id uuid REFERENCES linear_clone.agents(id),
  epic_id         uuid REFERENCES linear_clone.epics(id),
  milestone_id    uuid REFERENCES linear_clone.milestones(id),
  cycle_id        uuid REFERENCES linear_clone.cycles(id),
  estimate        numeric(8,2),
  due_date        date,
  sort_order      numeric(20,10) DEFAULT 0,
  is_draft        boolean NOT NULL DEFAULT false,
  archived_at     timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  correlation_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, number)
);

CREATE TABLE linear_clone.story_relations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  source_story_id uuid NOT NULL REFERENCES linear_clone.stories(id) ON DELETE CASCADE,
  target_story_id uuid NOT NULL REFERENCES linear_clone.stories(id) ON DELETE CASCADE,
  relation_type   linear_clone.story_relation_type NOT NULL,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_story_id, target_story_id, relation_type),
  CHECK (source_story_id <> target_story_id)
);

CREATE TABLE linear_clone.story_description_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id        uuid NOT NULL REFERENCES linear_clone.stories(id) ON DELETE CASCADE,
  description_json jsonb NOT NULL,
  description_md  text,
  edited_by       uuid REFERENCES auth.users(id),
  edited_by_agent uuid REFERENCES linear_clone.agents(id),
  correlation_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.story_labels (
  story_id        uuid NOT NULL REFERENCES linear_clone.stories(id) ON DELETE CASCADE,
  label_id        uuid NOT NULL REFERENCES linear_clone.labels(id) ON DELETE CASCADE,
  PRIMARY KEY (story_id, label_id)
);

CREATE OR REPLACE FUNCTION linear_clone.trg_stories_set_identifier()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_team_key text;
BEGIN
  SELECT t.key INTO v_team_key
  FROM linear_clone.teams t
  WHERE t.id = NEW.team_id;
  IF v_team_key IS NULL THEN
    RAISE EXCEPTION 'team_id % not found for story identifier', NEW.team_id;
  END IF;
  NEW.identifier := v_team_key || '-' || NEW.number;
  RETURN NEW;
END;
$$;

CREATE TRIGGER stories_set_identifier
  BEFORE INSERT OR UPDATE OF team_id, number ON linear_clone.stories
  FOR EACH ROW
  EXECUTE FUNCTION linear_clone.trg_stories_set_identifier();

CREATE TRIGGER stories_updated_at
  BEFORE UPDATE ON linear_clone.stories
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TRIGGER labels_updated_at
  BEFORE UPDATE ON linear_clone.labels
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE UNIQUE INDEX stories_identifier_unique ON linear_clone.stories (identifier);
CREATE INDEX stories_workspace_updated_idx ON linear_clone.stories (workspace_id, updated_at DESC);
CREATE INDEX stories_epic_active_idx ON linear_clone.stories (epic_id) WHERE archived_at IS NULL;
CREATE INDEX stories_cycle_idx ON linear_clone.stories (cycle_id);
CREATE INDEX stories_assignee_idx ON linear_clone.stories (assignee_id);
CREATE INDEX stories_delegate_agent_idx ON linear_clone.stories (delegate_agent_id)
  WHERE delegate_agent_id IS NOT NULL;
