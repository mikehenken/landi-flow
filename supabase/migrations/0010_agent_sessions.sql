-- NF-01 resolution (STUDY-013 task-05c GAP-04 residual):
-- agent_sessions references stories and comments; stories.delegate_agent_id references agents.
-- This inherent cycle cannot be satisfied in a single linear CREATE order.
-- Fix: create agents (0007) before stories (0008); defer agent_sessions until after comments (0009).

CREATE TABLE linear_clone.agent_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid NOT NULL REFERENCES linear_clone.agents(id) ON DELETE CASCADE,
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  story_id        uuid REFERENCES linear_clone.stories(id) ON DELETE SET NULL,
  epic_id         uuid REFERENCES linear_clone.epics(id) ON DELETE SET NULL,
  comment_id      uuid REFERENCES linear_clone.comments(id) ON DELETE SET NULL,
  state           linear_clone.agent_session_state NOT NULL DEFAULT 'pending',
  external_urls   jsonb NOT NULL DEFAULT '[]'::jsonb,
  plan            jsonb,
  created_via     text NOT NULL,
  correlation_id  uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.agent_activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES linear_clone.agent_sessions(id) ON DELETE CASCADE,
  type            linear_clone.agent_activity_type NOT NULL,
  body            text,
  action          text,
  parameter       jsonb,
  result          jsonb,
  ephemeral       boolean NOT NULL DEFAULT false,
  signals         jsonb NOT NULL DEFAULT '[]'::jsonb,
  actor_type      linear_clone.actor_type NOT NULL DEFAULT 'agent',
  correlation_id  uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.agent_action_outbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  session_id      uuid REFERENCES linear_clone.agent_sessions(id),
  mutation_type   text NOT NULL,
  target_type     text NOT NULL,
  target_id       uuid,
  proposed_payload jsonb NOT NULL,
  status          linear_clone.agent_action_status NOT NULL DEFAULT 'proposed',
  reviewed_by     uuid REFERENCES auth.users(id),
  reviewed_at     timestamptz,
  applied_at      timestamptz,
  correlation_id  uuid NOT NULL,
  causation_id    uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER agent_sessions_updated_at
  BEFORE UPDATE ON linear_clone.agent_sessions
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE INDEX agent_action_outbox_proposed_idx ON linear_clone.agent_action_outbox (status, workspace_id)
  WHERE status = 'proposed';

COMMENT ON TABLE linear_clone.agent_sessions IS
  'NF-01: Created in migration 0010 after stories+comments; breaks stories<->agents FK cycle from 05c design.';
