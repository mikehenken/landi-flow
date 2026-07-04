-- STUDY-013 task-09c: auth profile bootstrap + identity RLS write policies
-- Real Supabase auth.users → linear_clone.profiles linkage (no mock identity)

CREATE OR REPLACE FUNCTION linear_clone_internal.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO linear_clone.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'user'), '@', 1),
      'User'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION linear_clone_internal.handle_new_user();

-- Profiles RLS (auth tables)
ALTER TABLE linear_clone.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE linear_clone.profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON linear_clone.profiles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY profiles_select_workspace_peers ON linear_clone.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM linear_clone.workspace_members wm_self
      JOIN linear_clone.workspace_members wm_peer
        ON wm_self.workspace_id = wm_peer.workspace_id
      WHERE wm_self.user_id = (SELECT auth.uid())
        AND wm_peer.user_id = profiles.user_id
        AND wm_self.status = 'active'
        AND wm_peer.status = 'active'
    )
  );

CREATE POLICY profiles_update_own ON linear_clone.profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Workspace / membership write policies (RBAC via workspace_role_rank)
CREATE POLICY workspaces_insert ON linear_clone.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY workspaces_update ON linear_clone.workspaces
  FOR UPDATE TO authenticated
  USING (linear_clone.is_workspace_admin(id))
  WITH CHECK (linear_clone.is_workspace_admin(id));

CREATE POLICY workspace_members_insert ON linear_clone.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR linear_clone.is_workspace_admin(workspace_id)
  );

CREATE POLICY workspace_members_update ON linear_clone.workspace_members
  FOR UPDATE TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id))
  WITH CHECK (linear_clone.is_workspace_admin(workspace_id));

CREATE POLICY workspace_members_delete ON linear_clone.workspace_members
  FOR DELETE TO authenticated
  USING (linear_clone.is_workspace_admin(workspace_id));

CREATE POLICY teams_insert ON linear_clone.teams
  FOR INSERT TO authenticated
  WITH CHECK (linear_clone.has_workspace_role(workspace_id, 'admin'));

CREATE POLICY teams_update ON linear_clone.teams
  FOR UPDATE TO authenticated
  USING (
    linear_clone.is_workspace_admin(workspace_id)
    OR linear_clone.is_team_member(id)
  )
  WITH CHECK (
    linear_clone.is_workspace_admin(workspace_id)
    OR linear_clone.is_team_member(id)
  );

CREATE POLICY team_members_insert ON linear_clone.team_members
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id
        AND (
          linear_clone.is_workspace_admin(t.workspace_id)
          OR linear_clone.is_team_member(team_id)
        )
    )
  );

CREATE POLICY team_members_update ON linear_clone.team_members
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id
        AND linear_clone.is_workspace_admin(t.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id
        AND linear_clone.is_workspace_admin(t.workspace_id)
    )
  );

CREATE POLICY team_members_delete ON linear_clone.team_members
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM linear_clone.teams t
      WHERE t.id = team_id
        AND linear_clone.is_workspace_admin(t.workspace_id)
    )
  );

GRANT SELECT, UPDATE ON linear_clone.profiles TO authenticated;
