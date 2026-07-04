/** Workspace RBAC roles — mirrors linear_clone.workspace_member_role enum. */
export type WorkspaceMemberRole =
  | 'owner'
  | 'admin'
  | 'team_owner'
  | 'member'
  | 'guest';

export type WorkspaceMemberStatus = 'active' | 'pending' | 'suspended';

export type TeamMemberRole = 'owner' | 'member' | 'guest';

export interface Profile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  status: WorkspaceMemberStatus;
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthUserContext {
  userId: string;
  email: string | undefined;
}

export type OAuthProvider = 'google' | 'github';
