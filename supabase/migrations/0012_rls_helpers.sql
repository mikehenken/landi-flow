-- RLS helper functions (SECURITY DEFINER, linear_clone schema exposed)
CREATE OR REPLACE FUNCTION linear_clone_internal.current_user_id()
RETURNS uuid
LANGUAGE sql STABLE
SET search_path = ''
AS $$ SELECT (SELECT auth.uid()) $$;

CREATE OR REPLACE FUNCTION linear_clone.is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM linear_clone.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = (SELECT auth.uid())
      AND wm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION linear_clone.workspace_role_rank(
  p_role linear_clone.workspace_member_role
)
RETURNS int
LANGUAGE sql IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_role
    WHEN 'guest'      THEN 0
    WHEN 'member'     THEN 1
    WHEN 'team_owner' THEN 2
    WHEN 'admin'      THEN 3
    WHEN 'owner'      THEN 4
  END;
$$;

CREATE OR REPLACE FUNCTION linear_clone.has_workspace_role(
  p_workspace_id uuid,
  p_min_role linear_clone.workspace_member_role
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM linear_clone.workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = (SELECT auth.uid())
      AND wm.status = 'active'
      AND linear_clone.workspace_role_rank(wm.role)
          >= linear_clone.workspace_role_rank(p_min_role)
  );
$$;

CREATE OR REPLACE FUNCTION linear_clone.is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT linear_clone.has_workspace_role(p_workspace_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION linear_clone.is_team_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM linear_clone.team_members tm
    WHERE tm.team_id = p_team_id
      AND tm.user_id = (SELECT auth.uid())
      AND tm.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION linear_clone.is_team_guest_only(p_team_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM linear_clone.workspace_members wm
    JOIN linear_clone.teams t ON t.workspace_id = wm.workspace_id
    WHERE t.id = p_team_id
      AND wm.user_id = (SELECT auth.uid())
      AND wm.role = 'guest'
  )
  AND NOT linear_clone.is_team_member(p_team_id);
$$;

GRANT EXECUTE ON FUNCTION linear_clone.is_workspace_member TO authenticated;
GRANT EXECUTE ON FUNCTION linear_clone.has_workspace_role TO authenticated;
GRANT EXECUTE ON FUNCTION linear_clone.is_workspace_admin TO authenticated;
GRANT EXECUTE ON FUNCTION linear_clone.is_team_member TO authenticated;
GRANT EXECUTE ON FUNCTION linear_clone.is_team_guest_only TO authenticated;
GRANT EXECUTE ON FUNCTION linear_clone.workspace_role_rank TO authenticated;
