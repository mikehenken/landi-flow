import type { WorkspaceMemberRole, WorkspaceMemberStatus } from '@landi-flow/core/types';
import type { WorkspaceMemberWithProfile } from '@/lib/api/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { apiFetch, apiList } from '@/lib/api/client';
import { memberStore } from '@/stores/member-store';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function assertValidEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new Error('Invalid email address');
  }
  return normalized;
}

export interface InviteMemberInput {
  workspaceId: string;
  email: string;
  displayName?: string;
  role?: WorkspaceMemberRole;
  status?: WorkspaceMemberStatus;
}

export async function loadWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMemberWithProfile[]> {
  if (isMockAuthEnabled()) {
    return memberStore.getServerSnapshot().members;
  }
  return apiList<WorkspaceMemberWithProfile>(`workspaces/${workspaceId}/members`);
}

export async function inviteMember(input: InviteMemberInput): Promise<WorkspaceMemberWithProfile> {
  const email = assertValidEmail(input.email);
  const displayName = input.displayName?.trim() || null;

  if (isMockAuthEnabled()) {
    const now = new Date().toISOString();
    const member: WorkspaceMemberWithProfile = {
      id: `member-${Date.now()}`,
      workspace_id: input.workspaceId,
      user_id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `mock-user-${Date.now()}`,
      role: input.role ?? 'member',
      status: input.status ?? 'pending',
      invited_by: null,
      joined_at: input.status === 'active' ? now : null,
      created_at: now,
      updated_at: now,
      display_name: displayName ?? email.split('@')[0] ?? email,
      email,
      avatar_url: null,
    };
    memberStore.upsertMember(member);
    return member;
  }

  const response = await apiFetch<{ member: WorkspaceMemberWithProfile }>(
    `workspaces/${input.workspaceId}/members`,
    {
      method: 'POST',
      body: {
        email,
        ...(displayName ? { display_name: displayName } : {}),
        role: input.role ?? 'member',
        status: input.status ?? 'pending',
      },
    },
  );
  memberStore.upsertMember(response.member);
  return response.member;
}

export async function updateMember(
  workspaceId: string,
  member: WorkspaceMemberWithProfile,
  patch: { role?: WorkspaceMemberRole; status?: WorkspaceMemberStatus },
): Promise<WorkspaceMemberWithProfile> {
  const previous = { ...member };
  memberStore.upsertMember({ ...member, ...patch });
  if (isMockAuthEnabled()) {
    return { ...member, ...patch };
  }

  try {
    const response = await apiFetch<{ member: WorkspaceMemberWithProfile }>(
      `workspaces/${workspaceId}/members/${member.id}`,
      { method: 'PATCH', body: patch },
    );
    memberStore.upsertMember(response.member);
    return response.member;
  } catch (error) {
    memberStore.upsertMember(previous);
    throw error;
  }
}

export async function removeMember(
  workspaceId: string,
  member: WorkspaceMemberWithProfile,
): Promise<void> {
  memberStore.removeMember(member.id);
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    await apiFetch(`workspaces/${workspaceId}/members/${member.id}`, { method: 'DELETE' });
  } catch (error) {
    memberStore.upsertMember(member);
    throw error;
  }
}

export type { WorkspaceMemberWithProfile };
