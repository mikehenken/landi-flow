import { ENTITY_TOPICS } from '@landi-flow/core/events';
import type {
  CorrelationContext,
  WorkspaceMember,
  WorkspaceMemberRole,
  WorkspaceMemberStatus,
} from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export interface WorkspaceMemberWithProfile extends WorkspaceMember {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface MemberInviteInput {
  user_id: string;
  role?: WorkspaceMemberRole;
  status?: WorkspaceMemberStatus;
}

export interface MemberUpdateInput {
  role?: WorkspaceMemberRole;
  status?: WorkspaceMemberStatus;
}

export class MemberController extends BaseController {
  async list(workspaceId: string): Promise<WorkspaceMemberWithProfile[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data: members, error: membersError } = await this.db
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true });

    if (membersError) {
      throw new Error(`Failed to list workspace members: ${membersError.message}`);
    }

    const rows = (members ?? []) as WorkspaceMember[];
    if (rows.length === 0) {
      return [];
    }

    const userIds = rows.map((row) => row.user_id);
    const { data: profiles, error: profilesError } = await this.db
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);

    if (profilesError) {
      throw new Error(`Failed to load member profiles: ${profilesError.message}`);
    }

    const profileByUserId = new Map<
      string,
      { display_name: string | null; avatar_url: string | null }
    >();
    for (const profile of profiles ?? []) {
      const row = profile as {
        user_id: string;
        display_name: string | null;
        avatar_url: string | null;
      };
      profileByUserId.set(row.user_id, {
        display_name: row.display_name,
        avatar_url: row.avatar_url,
      });
    }

    return rows.map((member) => {
      const profile = profileByUserId.get(member.user_id);
      return {
        ...member,
        display_name: profile?.display_name ?? null,
        email: null,
        avatar_url: profile?.avatar_url ?? null,
      };
    });
  }

  async invite(
    workspaceId: string,
    input: MemberInviteInput,
    ctx: CorrelationContext,
  ): Promise<{ member: WorkspaceMember; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<WorkspaceMember>(
      workspaceId,
      ENTITY_TOPICS.WORKSPACE_UPDATED,
      { action: 'member_invited', user_id: input.user_id },
      ctx,
      'invite_workspace_member',
      {
        user_id: input.user_id,
        role: input.role ?? 'member',
        status: input.status ?? 'pending',
        invited_by: this.userId,
      },
    );

    return { member: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async update(
    workspaceId: string,
    memberId: string,
    input: MemberUpdateInput,
    ctx: CorrelationContext,
  ): Promise<{ member: WorkspaceMember; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<WorkspaceMember>(
      workspaceId,
      ENTITY_TOPICS.WORKSPACE_UPDATED,
      { action: 'member_updated', member_id: memberId },
      ctx,
      'update_workspace_member',
      {
        member_id: memberId,
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    );

    return { member: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }

  async remove(
    workspaceId: string,
    memberId: string,
    ctx: CorrelationContext,
  ): Promise<{ member: WorkspaceMember; correlation_id: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { entity, outbox_event_id } = await this.mutateWithOutbox<WorkspaceMember>(
      workspaceId,
      ENTITY_TOPICS.WORKSPACE_UPDATED,
      { action: 'member_removed', member_id: memberId },
      ctx,
      'remove_workspace_member',
      { member_id: memberId },
    );

    return { member: entity, correlation_id: ctx.correlation_id, outbox_event_id };
  }
}
