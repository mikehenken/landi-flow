import type {
  CustomerRequest,
  SlaRule,
  Story,
  Team,
} from '@landi-flow/core/types';
import {
  DEMO_TEAM_ID,
  DEMO_WORKSPACE_ID,
  SEED_CUSTOMER_REQUESTS,
} from '@/lib/seed-data';
import { WORKFLOW_STATES } from '@/lib/workflow-states';
import { persistMockStoryAddition } from '@/lib/story-mock-persistence';
import { storyStore } from '@/stores/story-store';

const STORAGE_KEY = 'landi-flow:settings-completion-mock';

export interface MockProfile {
  display_name: string;
  settings: Record<string, unknown>;
}

export interface MockApiKey {
  id: string;
  name: string;
  key_prefix: string;
  plaintext?: string;
}

export interface MockWorkspacePatch {
  name?: string;
  icon_url?: string | null;
}

interface MockSettingsState {
  customerRequests: CustomerRequest[];
  teams: Team[];
  slaRules: SlaRule[];
  profile: MockProfile;
  apiKeys: MockApiKey[];
  workspace: MockWorkspacePatch;
}

const DEFAULT_TEAMS: Team[] = [
  {
    id: DEMO_TEAM_ID,
    workspace_id: DEMO_WORKSPACE_ID,
    slug: 'design',
    name: 'Design',
    key: 'LAN',
    visibility: 'public',
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-01T10:00:00.000Z',
  },
];

const DEFAULT_PROFILE: MockProfile = {
  display_name: 'Demo User',
  settings: {
    connected_accounts: ['github', 'google'],
  },
};

function defaultState(): MockSettingsState {
  return {
    customerRequests: SEED_CUSTOMER_REQUESTS.map((request) => ({ ...request, story_ids: [...request.story_ids] })),
    teams: DEFAULT_TEAMS.map((team) => ({ ...team })),
    slaRules: [],
    profile: { ...DEFAULT_PROFILE, settings: { ...DEFAULT_PROFILE.settings } },
    apiKeys: [],
    workspace: {},
  };
}

function readState(): MockSettingsState {
  if (typeof window === 'undefined') {
    return defaultState();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw) as Partial<MockSettingsState>;
    const base = defaultState();
    return {
      customerRequests: Array.isArray(parsed.customerRequests)
        ? (parsed.customerRequests as CustomerRequest[])
        : base.customerRequests,
      teams: Array.isArray(parsed.teams) ? (parsed.teams as Team[]) : base.teams,
      slaRules: Array.isArray(parsed.slaRules) ? (parsed.slaRules as SlaRule[]) : base.slaRules,
      profile:
        parsed.profile && typeof parsed.profile === 'object'
          ? {
              display_name:
                typeof parsed.profile.display_name === 'string'
                  ? parsed.profile.display_name
                  : base.profile.display_name,
              settings:
                typeof parsed.profile.settings === 'object' && parsed.profile.settings !== null
                  ? (parsed.profile.settings as Record<string, unknown>)
                  : base.profile.settings,
            }
          : base.profile,
      apiKeys: Array.isArray(parsed.apiKeys) ? (parsed.apiKeys as MockApiKey[]) : base.apiKeys,
      workspace:
        parsed.workspace && typeof parsed.workspace === 'object'
          ? (parsed.workspace as MockWorkspacePatch)
          : base.workspace,
    };
  } catch {
    return defaultState();
  }
}

function writeState(state: MockSettingsState): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors in mock mode
  }
}

function mutate(mutator: (state: MockSettingsState) => void): MockSettingsState {
  const next = readState();
  mutator(next);
  writeState(next);
  return next;
}

export function resetMockSettingsCompletionStore(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function listMockCustomerRequests(workspaceId: string): CustomerRequest[] {
  return readState().customerRequests.filter((request) => request.workspace_id === workspaceId);
}

export function createMockCustomerRequest(input: {
  workspaceId: string;
  customerId: string;
  quote: string;
  requesterName?: string | null;
  source?: CustomerRequest['source'];
  correlationId?: string | null;
}): CustomerRequest {
  const now = new Date().toISOString();
  const request: CustomerRequest = {
    id: `request-${crypto.randomUUID()}`,
    workspace_id: input.workspaceId,
    customer_id: input.customerId,
    quote: input.quote.trim(),
    source: input.source ?? 'api',
    source_url: null,
    requester_name: input.requesterName ?? null,
    is_important: false,
    correlation_id: input.correlationId ?? null,
    story_ids: [],
    epic_ids: [],
    created_at: now,
    updated_at: now,
  };
  mutate((state) => {
    state.customerRequests = [request, ...state.customerRequests];
  });
  return request;
}

export function linkMockCustomerRequest(input: {
  workspaceId: string;
  requestId: string;
  storyId?: string;
  epicId?: string;
}): CustomerRequest | null {
  let updated: CustomerRequest | null = null;
  mutate((state) => {
    const index = state.customerRequests.findIndex(
      (request) => request.id === input.requestId && request.workspace_id === input.workspaceId,
    );
    if (index < 0) {
      return;
    }
    const current = state.customerRequests[index]!;
    const storyIds = input.storyId && !current.story_ids.includes(input.storyId)
      ? [...current.story_ids, input.storyId]
      : current.story_ids;
    const epicIds = input.epicId && !current.epic_ids.includes(input.epicId)
      ? [...current.epic_ids, input.epicId]
      : current.epic_ids;
    updated = {
      ...current,
      story_ids: storyIds,
      epic_ids: epicIds,
      updated_at: new Date().toISOString(),
    };
    state.customerRequests = state.customerRequests.map((row, rowIndex) =>
      rowIndex === index ? updated! : row,
    );
  });
  return updated;
}

export function listMockSlaRules(workspaceId: string): SlaRule[] {
  return readState().slaRules.filter((rule) => rule.workspace_id === workspaceId);
}

export function createMockSlaRule(input: {
  workspaceId: string;
  name: string;
  rules: SlaRule['rules'];
  teamId?: string | null;
}): SlaRule {
  const now = new Date().toISOString();
  const sla: SlaRule = {
    id: `sla-${crypto.randomUUID()}`,
    workspace_id: input.workspaceId,
    team_id: input.teamId ?? null,
    name: input.name.trim(),
    rules: input.rules,
    created_at: now,
    updated_at: now,
  };
  mutate((state) => {
    state.slaRules = [sla, ...state.slaRules];
  });
  return sla;
}

export function getMockStorySlaStatus(story: Story): {
  story_id: string;
  sla_id: string | null;
  sla_due_at: string | null;
  breached: boolean;
  due_in_hours: number | null;
} {
  const seededDue = story.sla_due_at;
  const breached =
    seededDue !== null && seededDue !== undefined
      ? new Date(seededDue).getTime() < Date.now()
      : story.id === 'story-005';
  return {
    story_id: story.id,
    sla_id: story.sla_id ?? null,
    sla_due_at:
      seededDue ?? (story.id === 'story-005' ? new Date(Date.now() - 3600_000).toISOString() : null),
    breached,
    due_in_hours: breached ? -2 : 24,
  };
}

export function patchMockWorkspace(patch: MockWorkspacePatch): MockWorkspacePatch {
  mutate((state) => {
    state.workspace = { ...state.workspace, ...patch };
  });
  return readState().workspace;
}

export function getMockWorkspacePatch(): MockWorkspacePatch {
  return readState().workspace;
}

export function listMockTeams(workspaceId: string): Team[] {
  return readState().teams.filter((team) => team.workspace_id === workspaceId);
}

export function createMockTeam(input: {
  workspaceId: string;
  name: string;
  slug: string;
  key: string;
}): Team {
  const now = new Date().toISOString();
  const team: Team = {
    id: `team-${crypto.randomUUID()}`,
    workspace_id: input.workspaceId,
    slug: input.slug.trim(),
    name: input.name.trim(),
    key: input.key.trim().toUpperCase(),
    visibility: 'public',
    created_at: now,
    updated_at: now,
  };
  mutate((state) => {
    state.teams = [...state.teams, team];
  });
  return team;
}

export function getMockProfile(): MockProfile {
  const profile = readState().profile;
  return {
    display_name: profile.display_name,
    settings: { ...profile.settings },
  };
}

export function patchMockProfile(patch: {
  displayName?: string;
  settings?: Record<string, unknown>;
}): MockProfile {
  mutate((state) => {
    if (patch.displayName !== undefined) {
      state.profile.display_name = patch.displayName;
    }
    if (patch.settings !== undefined) {
      state.profile.settings = { ...state.profile.settings, ...patch.settings };
    }
  });
  return getMockProfile();
}

export function listMockApiKeys(): MockApiKey[] {
  return readState().apiKeys.map((key) => ({
    id: key.id,
    name: key.name,
    key_prefix: key.key_prefix,
  }));
}

export function createMockApiKey(name: string): { key: MockApiKey; plaintext: string } {
  const plaintext = `lfk_${crypto.randomUUID().replace(/-/g, '')}`;
  const record: MockApiKey = {
    id: `key-${crypto.randomUUID()}`,
    name: name.trim() || 'Personal API key',
    key_prefix: plaintext.slice(0, 12),
    plaintext,
  };
  mutate((state) => {
    state.apiKeys = [record, ...state.apiKeys];
  });
  return {
    key: {
      id: record.id,
      name: record.name,
      key_prefix: record.key_prefix,
    },
    plaintext,
  };
}

export function importMockCsvStories(input: {
  workspaceId: string;
  csvText: string;
  teamId: string;
  workflowStateId: string;
}): number {
  const lines = input.csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) {
    return 0;
  }

  const headers = lines[0]!.split(',').map((value) => value.trim().toLowerCase());
  const titleIndex = headers.indexOf('title');
  const descriptionIndex = headers.indexOf('description');
  const priorityIndex = headers.indexOf('priority');
  if (titleIndex < 0) {
    return 0;
  }

  let created = 0;
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map((value) => value.trim());
    const title = cells[titleIndex]?.trim();
    if (!title) {
      continue;
    }
    const description = descriptionIndex >= 0 ? cells[descriptionIndex]?.trim() ?? null : null;
    const priorityRaw = priorityIndex >= 0 ? cells[priorityIndex]?.trim() ?? 'medium' : 'medium';
    const priority =
      priorityRaw === 'urgent' ||
      priorityRaw === 'high' ||
      priorityRaw === 'low' ||
      priorityRaw === 'medium'
        ? priorityRaw
        : 'medium';

    const createdStory = storyStore.createStory({
      title,
      descriptionMd: description,
      workspaceId: input.workspaceId,
      teamId: input.teamId,
      workflowStateId: input.workflowStateId || WORKFLOW_STATES.todo,
      priority,
    });
    persistMockStoryAddition(createdStory);
    created += 1;
  }

  return created;
}

export function getMockContextDefaults(): {
  team_id: string;
  default_workflow_state_id: string;
  default_epic_status_id: string;
} {
  return {
    team_id: DEMO_TEAM_ID,
    default_workflow_state_id: WORKFLOW_STATES.todo,
    default_epic_status_id: 'epic-status-planned',
  };
}
