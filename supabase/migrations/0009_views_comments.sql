CREATE TABLE linear_clone.views (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  team_id         uuid REFERENCES linear_clone.teams(id) ON DELETE CASCADE,
  epic_id         uuid REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  owner_id        uuid REFERENCES auth.users(id),
  name            text NOT NULL,
  description     text,
  scope           linear_clone.view_scope NOT NULL,
  layout          linear_clone.view_layout NOT NULL DEFAULT 'list',
  filter_ast      jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  grouping        text,
  sub_grouping    text,
  is_shared       boolean NOT NULL DEFAULT false,
  is_favorited    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE linear_clone.epic_attached_views (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  epic_id         uuid NOT NULL REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  view_id         uuid NOT NULL REFERENCES linear_clone.views(id) ON DELETE CASCADE,
  position        int NOT NULL DEFAULT 0,
  UNIQUE (epic_id, view_id)
);

CREATE TABLE linear_clone.view_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  view_id         uuid NOT NULL REFERENCES linear_clone.views(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_on       text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (view_id, user_id)
);

CREATE TABLE linear_clone.triage_inbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         uuid NOT NULL REFERENCES linear_clone.teams(id) ON DELETE CASCADE,
  story_id        uuid NOT NULL REFERENCES linear_clone.stories(id) ON DELETE CASCADE,
  snoozed_until   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, story_id)
);

CREATE TABLE linear_clone.comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  story_id        uuid REFERENCES linear_clone.stories(id) ON DELETE CASCADE,
  epic_id         uuid REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  parent_id       uuid REFERENCES linear_clone.comments(id) ON DELETE CASCADE,
  body_json       jsonb NOT NULL,
  body_md         text,
  actor_type      linear_clone.comment_actor_type NOT NULL DEFAULT 'human',
  author_user_id  uuid REFERENCES auth.users(id),
  author_agent_id uuid REFERENCES linear_clone.agents(id),
  on_behalf_of_user_id uuid REFERENCES auth.users(id),
  resolved_at     timestamptz,
  correlation_id  uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (story_id IS NOT NULL AND epic_id IS NULL) OR
    (story_id IS NULL AND epic_id IS NOT NULL)
  )
);

CREATE TABLE linear_clone.activity_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    uuid NOT NULL REFERENCES linear_clone.workspaces(id) ON DELETE CASCADE,
  story_id        uuid REFERENCES linear_clone.stories(id) ON DELETE CASCADE,
  epic_id         uuid REFERENCES linear_clone.epics(id) ON DELETE CASCADE,
  actor_type      linear_clone.actor_type NOT NULL,
  actor_user_id   uuid REFERENCES auth.users(id),
  actor_agent_id  uuid REFERENCES linear_clone.agents(id),
  event_type      text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id  uuid,
  causation_id    uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER views_updated_at
  BEFORE UPDATE ON linear_clone.views
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON linear_clone.comments
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.set_updated_at();

CREATE INDEX activity_events_story_created_idx ON linear_clone.activity_events (story_id, created_at DESC);
