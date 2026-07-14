import type { WorkspaceMember } from '@landi-flow/core/types';

export interface WorkspaceMemberWithProfile extends WorkspaceMember {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}
