'use client';

import * as React from 'react';
import type { PulseSchedule, WorkflowCategory, WorkflowState } from '@landi-flow/core/types';
import { Button, Input } from '@landi-flow/ui';
import { McpIdeToolsPanel } from '@/components/mcp/mcp-ide-tools-panel';
import { SlaRulesPanel } from '@/components/settings/admin-settings-panels';
import {
  ApplicationMembersPanel,
  AuthorizedAppsPanel,
} from '@/components/settings/personal-settings-panels';
import {
  createPulseSchedule,
  listPulseSchedules,
  runPulseSchedule,
} from '@/lib/pulse/pulse-store';
import { DEMO_TEAM_ID } from '@/lib/seed-data';
import { useWorkspace } from '@/lib/workspace';
import { isMockAuthEnabled } from '@/lib/api/config';
import { getDefaultTeamId } from '@/lib/api/workspace-context';
import {
  createPersonalApiKey,
  loadPersonalApiKeys,
} from '@/controllers/settings-completion-controller';
import {
  createWorkflowState,
  loadWorkflowStates,
} from '@/controllers/workflow-states-controller';

function resolveTeamIdForSettings(teamId: string): string {
  if (isMockAuthEnabled()) {
    if (teamId === 'default' || teamId === 'team-default') {
      return DEMO_TEAM_ID;
    }
    return teamId;
  }

  if (teamId === 'default' || teamId === 'team-default') {
    return getDefaultTeamId() ?? teamId;
  }
  return teamId;
}

const WORKFLOW_CATEGORY_OPTIONS: Array<{ value: WorkflowCategory; label: string }> = [
  { value: 'triage', label: 'Triage' },
  { value: 'unstarted', label: 'Unstarted' },
  { value: 'started', label: 'Started' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
];

export function TeamWorkflowStatesPanel({
  teamId,
}: {
  teamId: string;
}): React.ReactElement {
  const { workspace } = useWorkspace();
  const resolvedTeamId = resolveTeamIdForSettings(teamId);
  const [states, setStates] = React.useState<WorkflowState[]>([]);
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState<WorkflowCategory>('unstarted');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const refresh = React.useCallback(() => {
    setLoading(true);
    setError(null);
    void loadWorkflowStates(workspace.id, resolvedTeamId)
      .then((rows) => setStates(rows))
      .catch((err: unknown) => {
        setStates([]);
        setError(err instanceof Error ? err.message : 'Failed to load workflow states');
      })
      .finally(() => setLoading(false));
  }, [workspace.id, resolvedTeamId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = React.useCallback(async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createWorkflowState({
        workspaceId: workspace.id,
        teamId: resolvedTeamId,
        name: trimmed,
        category,
        position: states.length,
      });
      setName('');
      refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow state');
    } finally {
      setBusy(false);
    }
  }, [name, category, states.length, workspace.id, resolvedTeamId, refresh]);

  return (
    <section
      className="rounded-lg border border-border bg-card p-6"
      data-testid="team-settings-panel"
      data-cap="CAP-008"
    >
      <h2 className="mb-4 text-lg font-medium">Team workflow states</h2>
      <p className="mb-4 text-sm text-muted-foreground">Team: {teamId}</p>
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading workflow states…</p>
      ) : (
        <ul className="flex flex-wrap gap-2" data-testid="workflow-states-list">
          {states.map((state) => (
            <li
              key={state.id}
              className="rounded-md border border-border px-2 py-1 text-sm"
            >
              {state.name}
            </li>
          ))}
        </ul>
      )}
      {!isMockAuthEnabled() ? (
        <div className="mt-4 flex flex-wrap items-end gap-2" data-testid="workflow-state-create">
          <label className="flex min-w-[160px] flex-col gap-1 text-sm">
            <span className="text-muted-foreground">State name</span>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. In review"
              data-testid="workflow-state-name-input"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as WorkflowCategory)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              data-testid="workflow-state-category-select"
            >
              {WORKFLOW_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" size="sm" disabled={busy} onClick={() => void handleCreate()}>
            Add state
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Workflow state creation is available when connected to the live API.
        </p>
      )}
    </section>
  );
}

export function PulseSchedulesSettingsPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const mock = isMockAuthEnabled();
  const [schedules, setSchedules] = React.useState<PulseSchedule[]>([]);

  const reload = React.useCallback((): void => {
    setSchedules(mock ? listPulseSchedules(workspace.id) : []);
  }, [mock, workspace.id]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  return (
    <section
      className="rounded-lg border border-border bg-card p-6"
      data-testid="pulse-schedules-settings"
    >
      <h2 className="mb-4 text-lg font-medium">Pulse schedules</h2>
      {schedules.length === 0 ? (
        <p className="mb-3 text-sm text-muted-foreground" data-testid="pulse-schedules-empty">
          {mock
            ? 'No schedules yet.'
            : 'Pulse schedules are not available in live mode yet.'}
        </p>
      ) : (
        <ul className="mb-3 space-y-2">
          {schedules.map((schedule) => (
            <li
              key={schedule.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              data-testid="pulse-schedule-row"
            >
              <span>
                {schedule.label} · {schedule.cadence}
              </span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                data-testid="pulse-schedule-run"
                onClick={() => {
                  runPulseSchedule(schedule.id);
                  reload();
                }}
              >
                Run
              </Button>
            </li>
          ))}
        </ul>
      )}
      {mock ? (
        <Button
          type="button"
          size="sm"
          data-testid="pulse-schedule-create"
          onClick={() => {
            createPulseSchedule('Weekly digest', 'weekly', workspace.id);
            reload();
          }}
        >
          Add schedule
        </Button>
      ) : null}
    </section>
  );
}

export function AsksSettingsPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/inbound/asks`;

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="asks-settings-panel" data-cap="CAP-073">
      <h2 className="mb-4 text-lg font-medium">Customer asks intake</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Configure inbound webhook endpoints for Slack, email, and web forms.
      </p>
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Webhook URL</span>
        <Input readOnly value={webhookUrl} data-testid="asks-webhook-url" />
      </label>
      <p className="mt-3 text-xs text-muted-foreground">
        Workspace: {workspace.name} · POST creates persisted customer requests.
      </p>
    </section>
  );
}

export function AiSettingsPanel(): React.ReactElement {
  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="ai-settings-panel" data-cap="CAP-075">
      <h2 className="mb-4 text-lg font-medium">AI settings</h2>
      <p className="text-sm text-muted-foreground">
        Workspace AI provider routing via Cloudflare AI Gateway. Model overrides and usage limits
        apply per workspace.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Default model</dt>
          <dd className="font-medium font-mono">gemini-2.5-flash</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Gateway</dt>
          <dd className="font-medium">Cloudflare AI Gateway</dd>
        </div>
      </dl>
    </section>
  );
}

export function AiGuidancePanel(): React.ReactElement {
  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="ai-guidance-panel" data-cap="CAP-076">
      <h2 className="mb-4 text-lg font-medium">AI guidance</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        System prompts and guardrails injected into agent workflows.
      </p>
      <textarea
        className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        defaultValue="Prefer concise issue titles. Link epics when scope spans multiple teams."
        data-testid="ai-guidance-textarea"
        readOnly
      />
    </section>
  );
}

export function AiLoopsPanel(): React.ReactElement {
  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="ai-loops-panel" data-cap="CAP-077">
      <h2 className="mb-4 text-lg font-medium">AI loops</h2>
      <ul className="divide-y divide-border rounded-md border border-border">
        <li className="px-3 py-2 text-sm" data-testid="ai-loop-row">
          Triage assistant · active
        </li>
        <li className="px-3 py-2 text-sm" data-testid="ai-loop-row">
          Release notes draft · paused
        </li>
      </ul>
    </section>
  );
}

export function McpSettingsPanel(): React.ReactElement {
  return (
    <div data-cap="CAP-079">
      <McpIdeToolsPanel />
    </div>
  );
}

export function IntegrationSettingsPanel({
  provider,
}: {
  provider: 'github' | 'slack';
}): React.ReactElement {
  const capId = provider === 'github' ? 'CAP-085' : 'CAP-087';
  const title = provider === 'github' ? 'GitHub' : 'Slack';

  return (
    <section
      className="rounded-lg border border-border bg-card p-6"
      data-testid={`${provider}-integration-panel`}
      data-cap={capId}
    >
      <h2 className="mb-4 text-lg font-medium">{title} integration</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Connect {title} to sync issues, pull requests, and notifications.
      </p>
      <Button type="button" data-testid={`${provider}-connect-button`}>
        Connect {title}
      </Button>
      <p className="mt-3 text-xs text-muted-foreground">Status: Not connected (mock-auth review)</p>
    </section>
  );
}

export function UpdatesSettingsPanel(): React.ReactElement {
  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="updates-settings-panel" data-cap="CAP-096">
      <h2 className="mb-4 text-lg font-medium">Project updates</h2>
      <p className="text-sm text-muted-foreground">
        Configure default cadence and notification channels for initiative and epic updates.
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        <li className="rounded-md border border-border px-3 py-2">Weekly initiative digest · email + in-app</li>
        <li className="rounded-md border border-border px-3 py-2">Epic milestone alerts · in-app only</li>
      </ul>
    </section>
  );
}

export function WorkspaceApiSettingsPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const [keys, setKeys] = React.useState<Array<{ id: string; name: string; key_prefix: string }>>([]);
  const [issuedKey, setIssuedKey] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const rows = await loadPersonalApiKeys();
    setKeys(rows);
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = React.useCallback(async () => {
    const created = await createPersonalApiKey(workspace.id, 'Workspace API key');
    setIssuedKey(created.api_key || 'issued');
    await refresh();
  }, [workspace.id, refresh]);

  return (
    <section className="rounded-lg border border-border bg-card p-6" data-testid="workspace-api-settings-panel" data-cap="CAP-105">
      <h2 className="mb-4 text-lg font-medium">Workspace API</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Programmatic access for {workspace.name} via REST API keys.
      </p>
      <Button type="button" data-testid="workspace-api-key-create" onClick={() => void handleCreate()}>
        Create workspace API key
      </Button>
      {issuedKey ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground" data-testid="workspace-api-key-issued">
          Issued (copy now): {issuedKey}
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-border rounded-md border border-border">
        {keys.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">No workspace API keys yet.</li>
        ) : (
          keys.map((key) => (
            <li key={key.id} className="px-3 py-2 text-sm" data-testid="workspace-api-key-row">
              {key.name} · {key.key_prefix}…
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export function ApplicationsSettingsPanel(): React.ReactElement {
  return (
    <div className="space-y-6" data-cap="CAP-102">
      <ApplicationMembersPanel />
      <AuthorizedAppsPanel />
    </div>
  );
}

export function McpCredentialVaultPanel(): React.ReactElement {
  const { workspace } = useWorkspace();
  const [credentials, setCredentials] = React.useState<
    Array<{ id: string; name: string; key_prefix: string; scopes: string[] }>
  >([]);
  const [issuedKey, setIssuedKey] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const keys = await loadPersonalApiKeys();
    setCredentials(
      keys.map((key) => ({
        id: key.id,
        name: key.name,
        key_prefix: key.key_prefix,
        scopes: ['mcp:read', 'mcp:write'],
      })),
    );
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleCreate = React.useCallback(async () => {
    const created = await createPersonalApiKey(workspace.id, 'MCP IDE credential');
    setIssuedKey(created.api_key || 'issued');
    await refresh();
  }, [workspace.id, refresh]);

  return (
    <section
      className="rounded-lg border border-border bg-card p-6"
      data-testid="mcp-credential-vault-panel"
      data-cap="IDEA-007"
    >
      <h2 className="mb-4 text-lg font-medium">MCP credential vault</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Scoped, revocable tokens for IDE MCP clients. Raw secrets shown once on create.
      </p>
      <Button type="button" onClick={() => void handleCreate()} data-testid="mcp-vault-create">
        Create scoped credential
      </Button>
      {issuedKey ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground" data-testid="mcp-vault-issued">
          Issued token (copy now): {issuedKey}
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-border rounded-md border border-border">
        {credentials.length === 0 ? (
          <li className="px-3 py-2 text-sm text-muted-foreground">No MCP credentials yet.</li>
        ) : (
          credentials.map((credential) => (
            <li key={credential.id} className="px-3 py-2 text-sm" data-testid="mcp-vault-row">
              {credential.name} · {credential.key_prefix}… · {credential.scopes.join(', ')}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

export { SlaRulesPanel };
