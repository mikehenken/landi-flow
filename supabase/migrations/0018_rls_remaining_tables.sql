-- G-01: Enable + FORCE RLS on all remaining linear_clone tables (AR-03 compliance).

ALTER TABLE linear_clone.workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.workflow_states FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_statuses FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_teams FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_members FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_labels_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_labels_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_labels FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_dependencies FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_attached_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epic_attached_views FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.labels FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.story_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.story_labels FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.story_description_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.story_description_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.comments FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.activity_events FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.view_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.view_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.triage_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.triage_inbox FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.oauth_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.oauth_apps FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.agents FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.agent_team_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.agent_team_access FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.agent_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.agent_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.agent_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.agent_action_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.agent_action_outbox FORCE ROW LEVEL SECURITY;

-- workflow_states (via team workspace)
CREATE POLICY workflow_states_select ON linear_clone.workflow_states
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id AND linear_clone.is_workspace_member(t.workspace_id)
    )
  );

CREATE POLICY workflow_states_insert ON linear_clone.workflow_states
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id
        AND (
          linear_clone.is_team_member(t.id)
          OR linear_clone.is_workspace_admin(t.workspace_id)
        )
    )
  );

CREATE POLICY workflow_states_update ON linear_clone.workflow_states
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id
        AND (
          linear_clone.is_team_member(t.id)
          OR linear_clone.is_workspace_admin(t.workspace_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id
        AND (
          linear_clone.is_team_member(t.id)
          OR linear_clone.is_workspace_admin(t.workspace_id)
        )
    )
  );

-- epic_statuses
CREATE POLICY epic_statuses_select ON linear_clone.epic_statuses
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY epic_statuses_mutate ON linear_clone.epic_statuses
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id))
  WITH CHECK (linear_clone.is_workspace_admin(workspace_id));

-- epic junction / catalog tables (via epic or workspace)
CREATE POLICY epic_teams_select ON linear_clone.epic_teams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.epics e
      WHERE e.id = epic_id AND linear_clone.is_workspace_member(e.workspace_id)
    )
  );

CREATE POLICY epic_teams_mutate ON linear_clone.epic_teams
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

CREATE POLICY epic_members_select ON linear_clone.epic_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.epics e
      WHERE e.id = epic_id AND linear_clone.is_workspace_member(e.workspace_id)
    )
  );

CREATE POLICY epic_members_mutate ON linear_clone.epic_members
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

CREATE POLICY epic_labels_catalog_select ON linear_clone.epic_labels_catalog
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY epic_labels_catalog_mutate ON linear_clone.epic_labels_catalog
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY epic_labels_select ON linear_clone.epic_labels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.epics e
      WHERE e.id = epic_id AND linear_clone.is_workspace_member(e.workspace_id)
    )
  );

CREATE POLICY epic_labels_mutate ON linear_clone.epic_labels
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

CREATE POLICY epic_dependencies_select ON linear_clone.epic_dependencies
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY epic_dependencies_mutate ON linear_clone.epic_dependencies
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY epic_attached_views_select ON linear_clone.epic_attached_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.epics e
      WHERE e.id = epic_id AND linear_clone.is_workspace_member(e.workspace_id)
    )
  );

CREATE POLICY epic_attached_views_mutate ON linear_clone.epic_attached_views
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

-- labels
CREATE POLICY labels_select ON linear_clone.labels
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY labels_mutate ON linear_clone.labels
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY story_labels_select ON linear_clone.story_labels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.stories s
      WHERE s.id = story_id AND linear_clone.is_workspace_member(s.workspace_id)
    )
  );

CREATE POLICY story_labels_mutate ON linear_clone.story_labels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.stories s
      WHERE s.id = story_id AND linear_clone.is_workspace_member(s.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.stories s
      WHERE s.id = story_id AND linear_clone.is_workspace_member(s.workspace_id)
    )
  );

CREATE POLICY story_description_versions_select ON linear_clone.story_description_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.stories s
      WHERE s.id = story_id AND linear_clone.is_workspace_member(s.workspace_id)
    )
  );

CREATE POLICY story_description_versions_insert ON linear_clone.story_description_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.stories s
      WHERE s.id = story_id AND linear_clone.is_workspace_member(s.workspace_id)
    )
  );

-- comments & activity
CREATE POLICY comments_select ON linear_clone.comments
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY comments_mutate ON linear_clone.comments
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY activity_events_select ON linear_clone.activity_events
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY activity_events_insert ON linear_clone.activity_events
  FOR INSERT TO authenticated
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

-- views subscriptions
CREATE POLICY view_subscriptions_select ON linear_clone.view_subscriptions
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM linear_clone.views v
      WHERE v.id = view_id AND linear_clone.is_workspace_member(v.workspace_id)
    )
  );

CREATE POLICY view_subscriptions_mutate ON linear_clone.view_subscriptions
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- triage inbox
CREATE POLICY triage_inbox_select ON linear_clone.triage_inbox
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id AND linear_clone.is_workspace_member(t.workspace_id)
    )
  );

CREATE POLICY triage_inbox_mutate ON linear_clone.triage_inbox
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id
        AND (
          linear_clone.is_team_member(t.id)
          OR linear_clone.is_workspace_admin(t.workspace_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id
        AND (
          linear_clone.is_team_member(t.id)
          OR linear_clone.is_workspace_admin(t.workspace_id)
        )
    )
  );

-- oauth_apps (admin only for writes)
CREATE POLICY oauth_apps_select ON linear_clone.oauth_apps
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY oauth_apps_mutate ON linear_clone.oauth_apps
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id))
  WITH CHECK (linear_clone.is_workspace_admin(workspace_id));

-- agents
CREATE POLICY agents_select ON linear_clone.agents
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY agents_mutate ON linear_clone.agents
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id))
  WITH CHECK (linear_clone.is_workspace_admin(workspace_id));

CREATE POLICY agent_team_access_select ON linear_clone.agent_team_access
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.agents a
      WHERE a.id = agent_id AND linear_clone.is_workspace_member(a.workspace_id)
    )
  );

CREATE POLICY agent_team_access_mutate ON linear_clone.agent_team_access
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.agents a
      WHERE a.id = agent_id AND linear_clone.is_workspace_admin(a.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.agents a
      WHERE a.id = agent_id AND linear_clone.is_workspace_admin(a.workspace_id)
    )
  );

-- agent sessions / activities / action outbox
CREATE POLICY agent_sessions_select ON linear_clone.agent_sessions
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY agent_sessions_mutate ON linear_clone.agent_sessions
  FOR ALL TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY agent_activities_select ON linear_clone.agent_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.agent_sessions s
      WHERE s.id = session_id AND linear_clone.is_workspace_member(s.workspace_id)
    )
  );

CREATE POLICY agent_activities_insert ON linear_clone.agent_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.agent_sessions s
      WHERE s.id = session_id AND linear_clone.is_workspace_member(s.workspace_id)
    )
  );

CREATE POLICY agent_action_outbox_deny ON linear_clone.agent_action_outbox
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- story_relations delete policy (insert/select in 0013)
CREATE POLICY story_relations_delete ON linear_clone.story_relations
  FOR DELETE TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

-- milestones delete
CREATE POLICY milestones_delete ON linear_clone.milestones
  FOR DELETE TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

-- stories delete (archive path deferred; deny hard delete for now)
CREATE POLICY stories_delete ON linear_clone.stories
  FOR DELETE TO authenticated
  USING (
    linear_clone.is_team_member(team_id)
    OR linear_clone.is_workspace_admin(workspace_id)
  );

-- epics delete
CREATE POLICY epics_delete ON linear_clone.epics
  FOR DELETE TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id));

-- cycles delete
CREATE POLICY cycles_delete ON linear_clone.cycles
  FOR DELETE TO authenticated
  USING (
    linear_clone.is_team_member(team_id)
    OR linear_clone.is_workspace_admin(workspace_id)
  );
