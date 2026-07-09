'use client';

import * as React from 'react';
import { Button, useTranslations } from '@landi-flow/ui';
import { AppShell } from '@/components/app-shell';
import { SettingsSubnav } from '@/components/settings-subnav';
import { useOpenCreateMemberModal } from '@/components/create-story-modal';
import {
  removeMember,
  updateMember,
  type WorkspaceMemberWithProfile,
} from '@/controllers/member-controller';
import { useMemberStore } from '@/hooks/use-member-store';
import { useWorkspace } from '@/lib/workspace';

function MembersPageBody(): React.ReactElement {
  const t = useTranslations('navigation');
  const { workspace } = useWorkspace();
  const { members, loading, error } = useMemberStore();
  const openInviteMember = useOpenCreateMemberModal();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const handleActivate = React.useCallback(
    async (member: WorkspaceMemberWithProfile) => {
      setBusyId(member.id);
      try {
        await updateMember(workspace.id, member, { status: 'active' });
      } finally {
        setBusyId(null);
      }
    },
    [workspace.id],
  );

  const handleRemove = React.useCallback(
    async (member: WorkspaceMemberWithProfile) => {
      const label = member.display_name ?? member.email ?? 'this member';
      if (!window.confirm(`Remove ${label} from workspace?`)) {
        return;
      }
      setBusyId(member.id);
      try {
        await removeMember(workspace.id, member);
      } finally {
        setBusyId(null);
      }
    },
    [workspace.id],
  );

  return (
    <div className="flex h-full flex-col gap-6 p-6 lg:flex-row">
      <aside className="lg:w-48">
        <SettingsSubnav />
      </aside>
      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">{t('settings.members')}</h2>
            <p className="text-sm text-muted-foreground">
              Workspace membership persisted in `linear_clone.workspace_members`.
            </p>
          </div>
          <Button
            type="button"
            data-testid="members-invite-button"
            onClick={openInviteMember}
          >
            Invite member
          </Button>
        </div>

        {loading ? <p className="text-sm text-muted-foreground">Loading members…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="divide-y divide-border rounded-lg border border-border">
          {members.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t('settings.members_placeholder')}</p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                data-testid="workspace-member-row"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {member.display_name ?? member.email ?? 'Invited member'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.email && member.display_name ? `${member.email} · ` : ''}
                    {member.role} · {member.status}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {member.status !== 'active' ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busyId === member.id}
                      onClick={() => void handleActivate(member)}
                    >
                      Activate
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busyId === member.id}
                    onClick={() => void handleRemove(member)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceSettingsMembersPage(): React.ReactElement {
  const t = useTranslations('navigation');

  return (
    <AppShell
      viewTitle={t('settings.members')}
      breadcrumbs={[t('views.workspace'), t('settings.title'), t('settings.members')]}
    >
      <MembersPageBody />
    </AppShell>
  );
}
