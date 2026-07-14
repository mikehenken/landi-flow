-- STUDY-013 linear_clone schema bootstrap (task-09b iteration 1)
CREATE SCHEMA IF NOT EXISTS linear_clone;
CREATE SCHEMA IF NOT EXISTS linear_clone_internal;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

GRANT USAGE ON SCHEMA linear_clone TO authenticated;
REVOKE ALL ON SCHEMA linear_clone FROM PUBLIC;

CREATE OR REPLACE FUNCTION linear_clone_internal.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Enumerated types (HITM: Epic not Project, Story not Issue in UI)
CREATE TYPE linear_clone.workspace_member_role AS ENUM (
  'owner', 'admin', 'team_owner', 'member', 'guest'
);

CREATE TYPE linear_clone.workspace_member_status AS ENUM (
  'active', 'pending', 'suspended'
);

CREATE TYPE linear_clone.team_visibility AS ENUM ('public', 'private');

CREATE TYPE linear_clone.team_member_role AS ENUM ('owner', 'member', 'guest');

CREATE TYPE linear_clone.story_priority AS ENUM (
  'none', 'low', 'medium', 'high', 'urgent'
);

CREATE TYPE linear_clone.workflow_category AS ENUM (
  'backlog', 'unstarted', 'started', 'completed', 'canceled', 'duplicate', 'triage'
);

CREATE TYPE linear_clone.story_relation_type AS ENUM (
  'parent', 'sub', 'blocks', 'blocked_by', 'related', 'duplicate'
);

CREATE TYPE linear_clone.epic_status_category AS ENUM (
  'backlog', 'planned', 'in_progress', 'completed', 'cancelled'
);

CREATE TYPE linear_clone.epic_priority AS ENUM (
  'none', 'low', 'medium', 'high', 'urgent'
);

CREATE TYPE linear_clone.actor_type AS ENUM ('human', 'agent', 'system');

CREATE TYPE linear_clone.comment_actor_type AS ENUM ('human', 'agent', 'system');

CREATE TYPE linear_clone.agent_session_state AS ENUM (
  'pending', 'active', 'error', 'awaiting_input', 'complete', 'stale'
);

CREATE TYPE linear_clone.agent_activity_type AS ENUM (
  'thought', 'elicitation', 'action', 'response', 'error', 'prompt'
);

CREATE TYPE linear_clone.agent_action_status AS ENUM (
  'proposed', 'approved', 'rejected', 'applied'
);

CREATE TYPE linear_clone.outbox_event_status AS ENUM (
  'pending', 'published', 'failed'
);

CREATE TYPE linear_clone.view_layout AS ENUM (
  'list', 'board', 'timeline', 'calendar'
);

CREATE TYPE linear_clone.view_scope AS ENUM ('workspace', 'team', 'epic', 'personal');
