'use client';

import * as React from 'react';
import type { SlaRule, Team, WorkspaceInviteLink } from '@landi-flow/core/types';
import { Button, Input, cn } from '@landi-flow/ui';
import {
  createInviteLink,
  createSlaRule,
  createTeam,
  importCsvStories,
  loadInviteLinks,
  loadSlaRules,
  loadTeams,
  loadContextDefaults,
  revokeInviteLink,
  updateSecurityDomains,
  updateWorkspaceGeneral,
} from '@/controllers/settings-completion-controller';
import { useWorkspace } from '@/lib/workspace';

export function WorkspaceGeneralSettingsPanel(): React.ReactElement {
  const { workspace, patchWorkspace } = useWorkspace();
  const [name, setName] = React.useState(workspace.name);
  const [iconUrl, setIconUrl] = React.useState(workspace.icon_url ?? '');
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    try {
      const trimmedName = name.trim();
      const trimmedIcon = iconUrl.trim() || null;
      await updateWorkspaceGeneral({
        workspaceId: workspace.id,
        name: trimmedName,
        iconUrl: trimmedIcon,
      });
      patchWorkspace?.({
        name: trimmedName,
        icon_url: trimmedIcon,
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }, [workspace.id, name, iconUrl, patchWorkspace]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="workspace-general-settings">
      <h2 className="mb-4 text-lg font-medium">Workspace general (CAP-099)</h2>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Name</span>
          <Input value={name} onChange={(event) => setName(event.target.value)} data-testid="workspace-name-input" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Icon URL</span>
          <Input value={iconUrl} onChange={(event) => setIconUrl(event.target.value)} data-testid="workspace-icon-input" />
        </label>
        <Button type="button" disabled={saving} onClick={() => void handleSave()} data-testid="workspace-general-save">
          Save workspace
        </Button>
        {saved ? (
          <p className="text-xs text-muted-foreground" data-testid="workspace-general-saved">
            Saved — workspace name updated in shell.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export function TeamsAdminPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [key, setKey] = React.useState('');

  React.useEffect(() => {
    void loadTeams(workspace.id).then(setTeams).catch(() => setTeams([]));
  }, [workspace.id]);

  const handleCreate = React.useCallback(async () => {
    const team = await createTeam({
      workspaceId: workspace.id,
      name: name.trim(),
      slug: slug.trim(),
      key: key.trim().toUpperCase(),
    });
    setTeams((current) => [...current, team]);
    setName('');
    setSlug('');
    setKey('');
  }, [workspace.id, name, slug, key]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="teams-admin-panel">
      <h2 className="mb-4 text-lg font-medium">Teams (CAP-100)</h2>
      <ul className="mb-4 divide-y divide-border rounded-md border border-border">
        {teams.map((team) => (
          <li key={team.id} className="px-3 py-2 text-sm" data-testid="team-admin-row">
            {team.name} <span className="text-muted-foreground">({team.key})</span>
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-3">
        <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} data-testid="team-create-name" />
        <Input placeholder="slug" value={slug} onChange={(event) => setSlug(event.target.value)} data-testid="team-create-slug" />
        <Input placeholder="KEY" value={key} onChange={(event) => setKey(event.target.value)} data-testid="team-create-key" />
      </div>
      <Button type="button" className="mt-3" onClick={() => void handleCreate()} data-testid="team-create-submit">
        Create team
      </Button>
    </section>
  );
}

export function SecuritySettingsPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const [domains, setDomains] = React.useState('');
  const [invites, setInvites] = React.useState<WorkspaceInviteLink[]>([]);
  const [createdToken, setCreatedToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    void loadInviteLinks(workspace.id).then(setInvites).catch(() => setInvites([]));
  }, [workspace.id]);

  const handleSaveDomains = React.useCallback(async () => {
    const allowed = domains
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    await updateSecurityDomains(workspace.id, allowed);
  }, [workspace.id, domains]);

  const handleCreateInvite = React.useCallback(async () => {
    const result = await createInviteLink({ workspaceId: workspace.id, label: 'Workspace invite' });
    setCreatedToken(result.token);
    setInvites((current) => [result.invite, ...current]);
  }, [workspace.id]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="security-settings-panel">
      <h2 className="mb-4 text-lg font-medium">Security (CAP-103)</h2>
      <label className="mb-4 block text-sm">
        <span className="mb-1 block text-muted-foreground">Allowed email domains (comma-separated)</span>
        <Input value={domains} onChange={(event) => setDomains(event.target.value)} data-testid="allowed-domains-input" />
      </label>
      <Button type="button" variant="secondary" onClick={() => void handleSaveDomains()} data-testid="allowed-domains-save">
        Save domains
      </Button>

      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-medium">Invite links</h3>
        <Button type="button" onClick={() => void handleCreateInvite()} data-testid="invite-link-create">
          Create invite link
        </Button>
        {createdToken ? (
          <p className="font-mono text-xs text-muted-foreground" data-testid="invite-link-token">
            Token (copy now): {createdToken}
          </p>
        ) : null}
        <ul className="divide-y divide-border rounded-md border border-border">
          {invites.map((invite) => (
            <li key={invite.id} className="flex items-center justify-between px-3 py-2 text-sm" data-testid="invite-link-row">
              <span>{invite.label ?? invite.id}</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={invite.revoked_at !== null}
                onClick={() => void revokeInviteLink(workspace.id, invite.id).then(() =>
                  setInvites((current) =>
                    current.map((row) =>
                      row.id === invite.id
                        ? { ...row, revoked_at: new Date().toISOString() }
                        : row,
                    ),
                  ),
                )}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function SlaRulesPanel({ className }: { className?: string }): React.ReactElement {
  const { workspace } = useWorkspace();
  const [rules, setRules] = React.useState<SlaRule[]>([]);
  const [name, setName] = React.useState('Standard response SLA');

  React.useEffect(() => {
    void loadSlaRules(workspace.id).then(setRules).catch(() => setRules([]));
  }, [workspace.id]);

  const handleCreate = React.useCallback(async () => {
    const sla = await createSlaRule({
      workspaceId: workspace.id,
      name,
      rules: { response_hours: 24, resolution_hours: 72 },
    });
    setRules((current) => [sla, ...current]);
  }, [workspace.id, name]);

  return (
    <section className={cn('rounded-lg border border-border bg-card p-6', className)} data-testid="sla-rules-panel">
      <h2 className="mb-4 text-lg font-medium">SLA rules (CAP-074)</h2>
      <ul className="mb-4 divide-y divide-border rounded-md border border-border">
        {rules.map((rule) => (
          <li key={rule.id} className="px-3 py-2 text-sm" data-testid="sla-rule-row">
            {rule.name}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={name} onChange={(event) => setName(event.target.value)} data-testid="sla-rule-name" />
        <Button type="button" onClick={() => void handleCreate()} data-testid="sla-rule-create">
          Add SLA rule
        </Button>
      </div>
    </section>
  );
}

/** Workspace billing summary — mock-friendly surface for CAP-082 / CAP-107. */
export function BillingSettingsPanel(): React.ReactElement {
  const { workspace } = useWorkspace();

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="billing-settings-panel">
      <h2 className="mb-4 text-lg font-medium">Billing (CAP-082)</h2>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Workspace</dt>
          <dd className="font-medium">{workspace.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Plan</dt>
          <dd className="font-medium" data-testid="billing-plan-label">
            Team (mock)
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Seats</dt>
          <dd className="font-medium">5 included</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium text-emerald-400">Active</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Stripe billing integration is configured at the controller layer. This panel surfaces plan metadata for
        workspace admins during mock-auth review.
      </p>
    </section>
  );
}

export function ImportExportPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const [csvText, setCsvText] = React.useState('title,description,priority\nImported story,From CSV,medium');
  const [result, setResult] = React.useState<string | null>(null);

  const handleImport = React.useCallback(async () => {
    const defaults = await loadContextDefaults(workspace.id);
    if (!defaults.team_id || !defaults.default_workflow_state_id) {
      setResult('Missing team/workflow defaults');
      return;
    }
    const imported = await importCsvStories({
      workspaceId: workspace.id,
      csvText,
      teamId: defaults.team_id,
      workflowStateId: defaults.default_workflow_state_id,
    });
    setResult(`Imported ${imported.created_count} stories`);
  }, [workspace.id, csvText]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="import-export-panel">
      <h2 className="mb-4 text-lg font-medium">Import / export (CAP-108)</h2>
      <textarea
        className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
        value={csvText}
        onChange={(event) => setCsvText(event.target.value)}
        data-testid="csv-import-textarea"
      />
      <Button type="button" className="mt-3" onClick={() => void handleImport()} data-testid="csv-import-submit">
        Import CSV
      </Button>
      {result ? <p className="mt-2 text-sm text-muted-foreground" data-testid="csv-import-result">{result}</p> : null}
    </section>
  );
}
