import type {
  ApplicationMember,
  AuthorizedOAuthApp,
  CustomerRequest,
  SlaRule,
  Team,
  UserNotificationPrefs,
  WorkspaceInviteLink,
} from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { apiFetch, apiList } from '@/lib/api/client';
import {
  createMockApiKey,
  createMockCustomerRequest,
  createMockSlaRule,
  createMockTeam,
  getMockContextDefaults,
  getMockProfile,
  getMockStorySlaStatus,
  getMockWorkspacePatch,
  importMockCsvStories,
  listMockApiKeys,
  listMockSlaRules,
  listMockTeams,
  patchMockProfile,
  patchMockWorkspace,
} from '@/lib/mock/settings-completion-store';
import { storyStore } from '@/stores/story-store';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';

export async function loadCustomerRequests(workspaceId: string): Promise<CustomerRequest[]> {
  if (isMockAuthEnabled()) {
    const response = await fetch(
      `/api/mock/customer-requests?workspace_id=${encodeURIComponent(workspaceId)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) {
      throw new Error(`Failed to load mock customer requests (${response.status})`);
    }
    const payload = (await response.json()) as { data: CustomerRequest[] };
    return payload.data ?? [];
  }
  return apiList<CustomerRequest>(`workspaces/${workspaceId}/customer-requests`);
}

export async function createCustomerRequest(input: {
  workspaceId: string;
  customerId: string;
  quote: string;
  requesterName?: string;
}): Promise<CustomerRequest> {
  if (isMockAuthEnabled()) {
    return createMockCustomerRequest({
      workspaceId: input.workspaceId,
      customerId: input.customerId,
      quote: input.quote,
      requesterName: input.requesterName ?? null,
      source: 'web',
    });
  }

  const result = await apiFetch<{ request: CustomerRequest }>(
    `workspaces/${input.workspaceId}/customer-requests`,
    {
      method: 'POST',
      body: {
        customer_id: input.customerId,
        quote: input.quote,
        requester_name: input.requesterName ?? null,
        source: 'web',
      },
    },
  );
  return result.request;
}

export async function linkCustomerRequest(input: {
  workspaceId: string;
  requestId: string;
  storyId?: string;
  epicId?: string;
}): Promise<CustomerRequest> {
  if (isMockAuthEnabled()) {
    const response = await fetch('/api/mock/customer-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: input.workspaceId,
        request_id: input.requestId,
        story_id: input.storyId,
        epic_id: input.epicId,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to link customer request');
    }
    const payload = (await response.json()) as { request: CustomerRequest };
    return payload.request;
  }

  const result = await apiFetch<{ request: CustomerRequest }>(
    `workspaces/${input.workspaceId}/customer-requests/${input.requestId}/link`,
    {
      method: 'POST',
      body: {
        ...(input.storyId ? { story_id: input.storyId } : {}),
        ...(input.epicId ? { epic_id: input.epicId } : {}),
      },
    },
  );
  return result.request;
}

export async function loadSlaRules(workspaceId: string): Promise<SlaRule[]> {
  if (isMockAuthEnabled()) {
    return listMockSlaRules(workspaceId);
  }
  return apiList<SlaRule>(`workspaces/${workspaceId}/slas`);
}

export async function createSlaRule(input: {
  workspaceId: string;
  name: string;
  rules: SlaRule['rules'];
  teamId?: string | null;
}): Promise<SlaRule> {
  if (isMockAuthEnabled()) {
    return createMockSlaRule(input);
  }

  const result = await apiFetch<{ sla: SlaRule }>(`workspaces/${input.workspaceId}/slas`, {
    method: 'POST',
    body: {
      name: input.name,
      rules: input.rules,
      team_id: input.teamId ?? null,
    },
  });
  return result.sla;
}

export interface StorySlaStatus {
  story_id: string;
  sla_id: string | null;
  sla_due_at: string | null;
  breached: boolean;
  due_in_hours: number | null;
}

export async function loadStorySlaStatus(input: {
  workspaceId: string;
  teamId: string;
  storyId: string;
}): Promise<StorySlaStatus> {
  if (isMockAuthEnabled()) {
    const story = storyStore
      .getServerSnapshot()
      .stories.find((row) => row.id === input.storyId);
    if (!story) {
      throw new Error('Story not found');
    }
    return getMockStorySlaStatus(story);
  }

  const result = await apiFetch<{ status: StorySlaStatus }>(
    `workspaces/${input.workspaceId}/teams/${input.teamId}/stories/${input.storyId}/sla`,
    { method: 'GET' },
  );
  return result.status;
}

export async function updateWorkspaceGeneral(input: {
  workspaceId: string;
  name?: string;
  iconUrl?: string | null;
}): Promise<void> {
  if (isMockAuthEnabled()) {
    patchMockWorkspace({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.iconUrl !== undefined ? { icon_url: input.iconUrl } : {}),
    });
    return;
  }

  await apiFetch(`workspaces/${input.workspaceId}`, {
    method: 'PATCH',
    body: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.iconUrl !== undefined ? { icon_url: input.iconUrl } : {}),
    },
  });
}

export function readMockWorkspacePatch(): ReturnType<typeof getMockWorkspacePatch> {
  return getMockWorkspacePatch();
}

export async function loadTeams(workspaceId: string): Promise<Team[]> {
  if (isMockAuthEnabled()) {
    return listMockTeams(workspaceId);
  }
  return apiList<Team>(`workspaces/${workspaceId}/teams`);
}

export async function createTeam(input: {
  workspaceId: string;
  name: string;
  slug: string;
  key: string;
}): Promise<Team> {
  if (isMockAuthEnabled()) {
    return createMockTeam(input);
  }

  const result = await apiFetch<{ team: Team }>(`workspaces/${input.workspaceId}/settings/teams`, {
    method: 'POST',
    body: {
      name: input.name,
      slug: input.slug,
      key: input.key,
    },
  });
  return result.team;
}

export async function loadInviteLinks(workspaceId: string): Promise<WorkspaceInviteLink[]> {
  if (isMockAuthEnabled()) {
    return [];
  }
  return apiList<WorkspaceInviteLink>(`workspaces/${workspaceId}/settings/invite-links`);
}

export async function createInviteLink(input: {
  workspaceId: string;
  label?: string;
}): Promise<{ invite: WorkspaceInviteLink; token: string }> {
  if (isMockAuthEnabled()) {
    const now = new Date().toISOString();
    const token = `invite_${crypto.randomUUID().replace(/-/g, '')}`;
    return {
      invite: {
        id: `invite-${crypto.randomUUID()}`,
        workspace_id: input.workspaceId,
        label: input.label ?? 'Workspace invite',
        role: 'member',
        max_uses: null,
        use_count: 0,
        revoked_at: null,
        expires_at: null,
        created_at: now,
      },
      token,
    };
  }

  return apiFetch<{ invite: WorkspaceInviteLink; token: string }>(
    `workspaces/${input.workspaceId}/settings/invite-links`,
    {
      method: 'POST',
      body: { label: input.label ?? null },
    },
  );
}

export async function revokeInviteLink(workspaceId: string, inviteId: string): Promise<void> {
  if (isMockAuthEnabled()) {
    return;
  }
  await apiFetch(`workspaces/${workspaceId}/settings/invite-links/${inviteId}/revoke`, {
    method: 'POST',
  });
}

export async function updateSecurityDomains(
  workspaceId: string,
  allowedDomains: string[],
): Promise<void> {
  if (isMockAuthEnabled()) {
    patchMockProfile({ settings: { allowed_domains: allowedDomains } });
    return;
  }
  await apiFetch(`workspaces/${workspaceId}/settings/security`, {
    method: 'PATCH',
    body: { allowed_domains: allowedDomains },
  });
}

export async function loadApplicationMembers(workspaceId: string): Promise<ApplicationMember[]> {
  if (isMockAuthEnabled()) {
    return [];
  }
  return apiList<ApplicationMember>(`workspaces/${workspaceId}/settings/application-members`);
}

export async function loadAuthorizedApps(workspaceId: string): Promise<AuthorizedOAuthApp[]> {
  if (isMockAuthEnabled()) {
    return [];
  }
  return apiList<AuthorizedOAuthApp>(`workspaces/${workspaceId}/settings/authorized-apps`);
}

export async function revokeAuthorizedApp(workspaceId: string, tokenId: string): Promise<void> {
  if (isMockAuthEnabled()) {
    return;
  }
  await apiFetch(`workspaces/${workspaceId}/settings/authorized-apps/${tokenId}/revoke`, {
    method: 'POST',
  });
}

export async function loadContextDefaults(workspaceId: string): Promise<{
  team_id: string;
  default_workflow_state_id: string;
  default_epic_status_id: string;
}> {
  if (isMockAuthEnabled()) {
    void workspaceId;
    return getMockContextDefaults();
  }

  return apiFetch<{
    team_id: string;
    default_workflow_state_id: string;
    default_epic_status_id: string;
  }>(`workspaces/${workspaceId}/context/defaults`, { method: 'GET' });
}

export async function importCsvStories(input: {
  workspaceId: string;
  csvText: string;
  teamId: string;
  workflowStateId: string;
}): Promise<{ created_count: number }> {
  if (isMockAuthEnabled()) {
    const created_count = importMockCsvStories(input);
    return { created_count };
  }

  const result = await apiFetch<{ created_count: number }>(
    `workspaces/${input.workspaceId}/settings/import/csv`,
    {
      method: 'POST',
      body: {
        csv_text: input.csvText,
        team_id: input.teamId,
        workflow_state_id: input.workflowStateId,
      },
    },
  );
  return { created_count: result.created_count };
}

export async function loadProfile(): Promise<Record<string, unknown>> {
  if (isMockAuthEnabled()) {
    const profile = getMockProfile();
    return {
      display_name: profile.display_name,
      settings: profile.settings,
    };
  }

  const result = await apiFetch<{ profile: Record<string, unknown> }>('me/profile', {
    method: 'GET',
  });
  return result.profile;
}

export async function updateProfile(input: {
  displayName?: string;
  settings?: Record<string, unknown>;
}): Promise<void> {
  if (isMockAuthEnabled()) {
    patchMockProfile({
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.settings !== undefined ? { settings: input.settings } : {}),
    });
    return;
  }

  await apiFetch('me/profile', {
    method: 'PATCH',
    body: {
      ...(input.displayName !== undefined ? { display_name: input.displayName } : {}),
      ...(input.settings !== undefined ? { settings: input.settings } : {}),
    },
  });
}

export async function loadNotificationPrefs(workspaceId: string): Promise<UserNotificationPrefs> {
  if (isMockAuthEnabled()) {
    void workspaceId;
    return {
      user_id: 'user-demo',
      workspace_id: workspaceId,
      email_enabled: true,
      slack_enabled: false,
      in_app_enabled: true,
      digest: 'immediate',
      updated_at: new Date().toISOString(),
    };
  }

  const result = await apiFetch<{ prefs: UserNotificationPrefs }>(
    `workspaces/${workspaceId}/profile/notifications`,
    { method: 'GET' },
  );
  return result.prefs;
}

export async function updateNotificationPrefs(
  workspaceId: string,
  prefs: Partial<UserNotificationPrefs>,
): Promise<UserNotificationPrefs> {
  if (isMockAuthEnabled()) {
    return {
      user_id: 'user-demo',
      workspace_id: workspaceId,
      email_enabled: prefs.email_enabled ?? true,
      slack_enabled: prefs.slack_enabled ?? false,
      in_app_enabled: prefs.in_app_enabled ?? true,
      digest: prefs.digest ?? 'immediate',
      updated_at: new Date().toISOString(),
    };
  }

  const result = await apiFetch<{ prefs: UserNotificationPrefs }>(
    `workspaces/${workspaceId}/profile/notifications`,
    {
      method: 'PATCH',
      body: prefs,
    },
  );
  return result.prefs;
}

export async function leaveWorkspace(workspaceId: string): Promise<void> {
  if (isMockAuthEnabled()) {
    void workspaceId;
    return;
  }
  await apiFetch(`workspaces/${workspaceId}/profile/leave`, { method: 'POST' });
}

export async function loadPersonalApiKeys(): Promise<
  Array<{ id: string; name: string; key_prefix: string }>
> {
  if (isMockAuthEnabled()) {
    return listMockApiKeys();
  }
  return [];
}

export async function createPersonalApiKey(
  workspaceId: string,
  name: string,
): Promise<{ api_key: string; key: { id: string; name: string; key_prefix: string } }> {
  if (isMockAuthEnabled()) {
    void workspaceId;
    const created = createMockApiKey(name);
    return {
      api_key: created.plaintext,
      key: created.key,
    };
  }

  const response = await fetch('/api/mcp/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workspace_id: workspaceId, name }),
  });
  if (!response.ok) {
    throw new Error('Failed to create API key');
  }
  const payload = (await response.json()) as {
    api_key?: string;
    plaintext_key?: string;
    key?: { id: string; name: string; key_prefix: string };
  };
  return {
    api_key: payload.api_key ?? payload.plaintext_key ?? '',
    key: payload.key ?? { id: 'unknown', name, key_prefix: 'lfk' },
  };
}

export const MOCK_E2E_WORKSPACE_ID = DEMO_WORKSPACE_ID;
