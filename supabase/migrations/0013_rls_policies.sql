-- Enable RLS on core PM tables (iteration 1 scope)
ALTER TABLE linear_clone.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.workspace_members FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.teams FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.team_members FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epics ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.epics FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.milestones FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.cycles FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.stories FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.story_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.story_relations FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.views ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.views FORCE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.outbox_events FORCE ROW LEVEL SECURITY;

-- Workspaces: members can read
CREATE POLICY workspaces_select ON linear_clone.workspaces
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(id));

CREATE POLICY workspace_members_select ON linear_clone.workspace_members
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY teams_select ON linear_clone.teams
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY team_members_select ON linear_clone.team_members
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id AND linear_clone.is_workspace_member(t.workspace_id)
    )
  );

CREATE POLICY epics_select ON linear_clone.epics
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY epics_insert ON linear_clone.epics
  FOR INSERT TO authenticated
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY epics_update ON linear_clone.epics
  FOR UPDATE TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY milestones_select ON linear_clone.milestones
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY milestones_insert ON linear_clone.milestones
  FOR INSERT TO authenticated
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY milestones_update ON linear_clone.milestones
  FOR UPDATE TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY cycles_select ON linear_clone.cycles
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY cycles_insert ON linear_clone.cycles
  FOR INSERT TO authenticated
  WITH CHECK (
    linear_clone.is_team_member(team_id)
    OR linear_clone.is_workspace_admin(workspace_id)
  );

CREATE POLICY cycles_update ON linear_clone.cycles
  FOR UPDATE TO authenticated
  USING (
    linear_clone.is_team_member(team_id)
    OR linear_clone.is_workspace_admin(workspace_id)
  )
  WITH CHECK (
    linear_clone.is_team_member(team_id)
    OR linear_clone.is_workspace_admin(workspace_id)
  );

CREATE POLICY stories_select ON linear_clone.stories
  FOR SELECT TO authenticated
  USING (
    linear_clone.is_workspace_member(workspace_id)
    AND (
      linear_clone.is_team_member(team_id)
      OR linear_clone.is_workspace_admin(workspace_id)
    )
    AND NOT (
      linear_clone.is_team_guest_only(team_id)
      AND NOT linear_clone.is_team_member(team_id)
    )
  );

CREATE POLICY stories_insert ON linear_clone.stories
  FOR INSERT TO authenticated
  WITH CHECK (
    linear_clone.is_team_member(team_id)
    OR linear_clone.is_workspace_admin(workspace_id)
  );

CREATE POLICY stories_update ON linear_clone.stories
  FOR UPDATE TO authenticated
  USING (
    linear_clone.is_team_member(team_id)
    OR linear_clone.is_workspace_admin(workspace_id)
  )
  WITH CHECK (
    linear_clone.is_team_member(team_id)
    OR linear_clone.is_workspace_admin(workspace_id)
  );

CREATE POLICY story_relations_select ON linear_clone.story_relations
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY story_relations_insert ON linear_clone.story_relations
  FOR INSERT TO authenticated
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY views_select ON linear_clone.views
  FOR SELECT TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY views_insert ON linear_clone.views
  FOR INSERT TO authenticated
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY views_update ON linear_clone.views
  FOR UPDATE TO authenticated
  USING (linear_clone.is_workspace_member(workspace_id))
  WITH CHECK (linear_clone.is_workspace_member(workspace_id));

CREATE POLICY views_delete ON linear_clone.views
  FOR DELETE TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR linear_clone.is_workspace_admin(workspace_id)
  );

-- outbox_events: no direct client access; service role only via controllers
CREATE POLICY outbox_events_deny_all ON linear_clone.outbox_events
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- service_role bypasses RLS by default in Supabase
