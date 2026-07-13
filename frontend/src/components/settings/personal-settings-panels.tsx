'use client';

import * as React from 'react';
import type { ApplicationMember, AuthorizedOAuthApp } from '@landi-flow/core/types';
import { Button, Input } from '@landi-flow/ui';
import {
  leaveWorkspace,
  loadApplicationMembers,
  loadAuthorizedApps,
  loadNotificationPrefs,
  loadProfile,
  loadPersonalApiKeys,
  createPersonalApiKey,
  revokeAuthorizedApp,
  updateNotificationPrefs,
  updateProfile,
} from '@/controllers/settings-completion-controller';
import { useShellSidebarPreference } from '@/hooks/use-shell-sidebar-preference';
import { useShellInspectorPreference } from '@/hooks/use-shell-inspector-preference';
import { useWorkspace } from '@/lib/workspace';
import { StoryDetailLayoutSettingRow } from '@/components/story-detail-layout-toggle';

export function PersonalPreferencesPanel(): React.ReactElement {
  const { collapsed, setCollapsed } = useShellSidebarPreference();
  const { open: inspectorOpen, setOpen: setInspectorOpen } = useShellInspectorPreference();

  return (
    <section
      className="rounded-lg border border-border bg-card p-6"
      data-testid="personal-preferences-panel"
      data-cap="CAP-109"
    >
      <h2 className="mb-4 text-lg font-medium">Preferences</h2>
      <div className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Navigation sidebar</h3>
          <p className="text-sm text-muted-foreground">
            Default sidebar state persists across workspace navigation (FHITM-B07).
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={collapsed}
              onChange={(event) => setCollapsed(event.target.checked)}
              data-testid="shell-sidebar-collapsed-pref"
            />
            Start with sidebar collapsed
          </label>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Properties panel</h3>
          <p className="text-sm text-muted-foreground">
            When content is available, show the right properties sidebar by default.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={inspectorOpen}
              onChange={(event) => setInspectorOpen(event.target.checked)}
              data-testid="shell-inspector-open-pref"
            />
            Show properties panel when available
          </label>
        </div>
        <StoryDetailLayoutSettingRow />
      </div>
    </section>
  );
}

export function PersonalProfilePanel({
  initialDisplayName,
}: {
  initialDisplayName: string;
}): React.ReactElement {
  const [displayName, setDisplayName] = React.useState(initialDisplayName);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    void loadProfile()
      .then((profile) => {
        if (typeof profile.display_name === 'string' && profile.display_name.trim().length > 0) {
          setDisplayName(profile.display_name);
        }
      })
      .catch(() => undefined);
  }, []);

  const handleSave = React.useCallback(async () => {
    await updateProfile({ displayName: displayName.trim() });
    setSaved(true);
  }, [displayName]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="personal-profile-panel">
      <h2 className="mb-4 text-lg font-medium">Profile</h2>
      <Input
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        data-testid="profile-display-name"
      />
      <Button type="button" className="mt-3" onClick={() => void handleSave()} data-testid="profile-save">
        Save profile
      </Button>
      {saved ? (
        <p className="mt-2 text-xs text-muted-foreground" data-testid="profile-saved-message">
          Profile saved.
        </p>
      ) : null}
    </section>
  );
}

export function NotificationPrefsPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const [emailEnabled, setEmailEnabled] = React.useState(true);
  const [inAppEnabled, setInAppEnabled] = React.useState(true);

  React.useEffect(() => {
    void loadNotificationPrefs(workspace.id)
      .then((prefs) => {
        setEmailEnabled(prefs.email_enabled);
        setInAppEnabled(prefs.in_app_enabled);
      })
      .catch(() => undefined);
  }, [workspace.id]);

  const handleSave = React.useCallback(async () => {
    await updateNotificationPrefs(workspace.id, {
      email_enabled: emailEnabled,
      in_app_enabled: inAppEnabled,
    });
  }, [workspace.id, emailEnabled, inAppEnabled]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="notification-prefs-panel">
      <h2 className="mb-4 text-lg font-medium">Notifications</h2>
      <label className="mb-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={emailEnabled}
          onChange={(event) => setEmailEnabled(event.target.checked)}
          data-testid="notification-email-enabled"
        />
        Email notifications
      </label>
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={inAppEnabled}
          onChange={(event) => setInAppEnabled(event.target.checked)}
          data-testid="notification-inapp-enabled"
        />
        In-app notifications
      </label>
      <Button type="button" onClick={() => void handleSave()} data-testid="notification-prefs-save">
        Save preferences
      </Button>
    </section>
  );
}

export function PersonalApiKeysPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const [keys, setKeys] = React.useState<Array<{ id: string; name: string; key_prefix: string }>>([]);
  const [issuedKey, setIssuedKey] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const keys = await loadPersonalApiKeys();
    setKeys(keys);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = React.useCallback(async () => {
    const created = await createPersonalApiKey(workspace.id, 'Personal API key');
    setIssuedKey(created.api_key || 'issued');
    await refresh();
  }, [workspace.id, refresh]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="personal-api-keys-panel">
      <h2 className="mb-4 text-lg font-medium">API keys</h2>
      <Button type="button" onClick={() => void handleCreate()} data-testid="api-key-create">
        Create API key
      </Button>
      {issuedKey ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground" data-testid="api-key-issued">
          Issued key (copy now): {issuedKey}
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-border rounded-md border border-border">
        {keys.map((key) => (
          <li key={key.id} className="px-3 py-2 text-sm" data-testid="api-key-row">
            {key.name} · {key.key_prefix}…
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ConnectedAccountsPanel(): React.ReactElement {
  const [connected, setConnected] = React.useState<string[]>([]);

  React.useEffect(() => {
    void loadProfile()
      .then((profile) => {
        const settings =
          typeof profile.settings === 'object' && profile.settings !== null
            ? (profile.settings as Record<string, unknown>)
            : {};
        const accounts = Array.isArray(settings.connected_accounts)
          ? settings.connected_accounts.filter((value): value is string => typeof value === 'string')
          : [];
        setConnected(accounts);
      })
      .catch(() => setConnected([]));
  }, []);

  const handleToggle = React.useCallback(async (provider: string) => {
    const next = connected.includes(provider)
      ? connected.filter((value) => value !== provider)
      : [...connected, provider];
    setConnected(next);
    await updateProfile({ settings: { connected_accounts: next } });
  }, [connected]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="connected-accounts-panel">
      <h2 className="mb-4 text-lg font-medium">Connected accounts</h2>
      {['github', 'google', 'slack'].map((provider) => (
        <label key={provider} className="mb-2 flex items-center gap-2 text-sm capitalize">
          <input
            type="checkbox"
            checked={connected.includes(provider)}
            onChange={() => void handleToggle(provider)}
            data-testid={`connected-account-${provider}`}
            data-connected={connected.includes(provider) ? 'true' : 'false'}
          />
          {provider}
        </label>
      ))}
    </section>
  );
}

export function ApplicationMembersPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const [members, setMembers] = React.useState<ApplicationMember[]>([]);

  React.useEffect(() => {
    void loadApplicationMembers(workspace.id).then(setMembers).catch(() => setMembers([]));
  }, [workspace.id]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="application-members-panel">
      <h2 className="mb-4 text-lg font-medium">Application members</h2>
      <ul className="divide-y divide-border rounded-md border border-border">
        {members.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">No application members registered.</li>
        ) : (
          members.map((member) => (
            <li key={member.id} className="px-3 py-2 text-sm" data-testid="application-member-row">
              {member.name} · {member.kind}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export function AuthorizedAppsPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const [apps, setApps] = React.useState<AuthorizedOAuthApp[]>([]);

  React.useEffect(() => {
    void loadAuthorizedApps(workspace.id).then(setApps).catch(() => setApps([]));
  }, [workspace.id]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="authorized-apps-panel">
      <h2 className="mb-4 text-lg font-medium">Authorized apps</h2>
      <ul className="divide-y divide-border rounded-md border border-border">
        {apps.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">No authorized third-party apps.</li>
        ) : (
          apps.map((app) => (
            <li key={app.token_id} className="flex items-center justify-between px-3 py-2 text-sm" data-testid="authorized-app-row">
              <span>{app.client_name}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  void revokeAuthorizedApp(workspace.id, app.token_id).then(() =>
                    setApps((current) => current.filter((row) => row.token_id !== app.token_id)),
                  )
                }
              >
                Revoke
              </Button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export function LeaveWorkspacePanel(): React.ReactElement {
  const { workspace } = useWorkspace();

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="leave-workspace-panel">
      <h2 className="mb-2 text-lg font-medium">Leave workspace</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Remove your membership from this workspace.
      </p>
      <Button
        type="button"
        variant="destructive"
        data-testid="leave-workspace-button"
        onClick={() => void leaveWorkspace(workspace.id)}
      >
        Leave workspace
      </Button>
    </section>
  );
}
