import type { Epic, EpicPriority } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { apiFetch, apiList } from '@/lib/api/client';
import { mapEpicRow, type DbEpicRow } from '@/lib/api/mappers';
import { getDefaultEpicStatusId, loadWorkspaceRuntimeContext } from '@/lib/api/workspace-context';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';
import { persistMockEpicAddition } from '@/lib/epic-mock-persistence';
import { epicStore } from '@/stores/epic-store';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export interface CreateEpicInput {
  workspaceId: string;
  name: string;
  descriptionMd?: string | null;
  statusId?: string;
  priority?: EpicPriority;
}

export async function loadEpics(workspaceId: string): Promise<Epic[]> {
  if (isMockAuthEnabled()) {
    return epicStore.getServerSnapshot().epics;
  }
  const rows = await apiList<DbEpicRow>(`workspaces/${workspaceId}/epics`);
  return rows.map(mapEpicRow);
}

export async function createEpic(input: CreateEpicInput): Promise<Epic> {
  if (isMockAuthEnabled()) {
    const now = new Date().toISOString();
    const epic: Epic = {
      id: `epic-${Date.now()}`,
      workspace_id: input.workspaceId,
      name: input.name,
      slug: slugify(input.name),
      description_json: null,
      description_md: input.descriptionMd ?? null,
      status_id: input.statusId ?? EPIC_STATUS_IDS.backlog,
      priority: input.priority ?? 'none',
      lead_id: null,
      delegate_agent_id: null,
      start_date: null,
      target_date: null,
      progress_cache: null,
      correlation_id: null,
      archived_at: null,
      created_at: now,
      updated_at: now,
    };
    epicStore.upsertEpic(epic);
    epicStore.selectEpic(epic.id);
    persistMockEpicAddition(epic);
    return epic;
  }

  await loadWorkspaceRuntimeContext(input.workspaceId);
  const statusId = input.statusId ?? getDefaultEpicStatusId() ?? EPIC_STATUS_IDS.backlog;

  const response = await apiFetch<{ epic: DbEpicRow }>(`workspaces/${input.workspaceId}/epics`, {
    method: 'POST',
    body: {
      name: input.name,
      slug: slugify(input.name),
      status_id: statusId,
      description_md: input.descriptionMd ?? null,
      priority: input.priority ?? 'none',
    },
  });

  const epic = mapEpicRow(response.epic);
  epicStore.upsertEpic(epic);
  epicStore.selectEpic(epic.id);
  return epic;
}

export async function updateEpicDescription(
  workspaceId: string,
  epic: Epic,
  descriptionMd: string,
): Promise<void> {
  const previous = epic.description_md;
  epicStore.updateEpicDescription(epic.id, descriptionMd);
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    const response = await apiFetch<{ epic: DbEpicRow }>(
      `workspaces/${workspaceId}/epics/${epic.id}`,
      { method: 'PATCH', body: { description_md: descriptionMd } },
    );
    epicStore.upsertEpic(mapEpicRow(response.epic));
  } catch (error) {
    epicStore.updateEpicDescription(epic.id, previous ?? '');
    throw error;
  }
}

export async function updateEpicLead(
  workspaceId: string,
  epic: Epic,
  leadId: string | null,
): Promise<void> {
  const previous = epic.lead_id;
  epicStore.assignEpic(epic.id, { leadId });
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    const response = await apiFetch<{ epic: DbEpicRow }>(
      `workspaces/${workspaceId}/epics/${epic.id}`,
      { method: 'PATCH', body: { lead_id: leadId } },
    );
    epicStore.upsertEpic(mapEpicRow(response.epic));
  } catch (error) {
    epicStore.assignEpic(epic.id, { leadId: previous });
    throw error;
  }
}

export async function updateEpicDelegateAgent(
  workspaceId: string,
  epic: Epic,
  delegateAgentId: string | null,
): Promise<void> {
  const previous = epic.delegate_agent_id;
  epicStore.assignEpic(epic.id, { delegateAgentId });
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    const response = await apiFetch<{ epic: DbEpicRow }>(
      `workspaces/${workspaceId}/epics/${epic.id}`,
      { method: 'PATCH', body: { delegate_agent_id: delegateAgentId } },
    );
    epicStore.upsertEpic(mapEpicRow(response.epic));
  } catch (error) {
    epicStore.assignEpic(epic.id, { delegateAgentId: previous });
    throw error;
  }
}

export async function deleteEpic(workspaceId: string, epic: Epic): Promise<void> {
  epicStore.removeEpic(epic.id);
  if (isMockAuthEnabled()) {
    return;
  }
  try {
    await apiFetch(`workspaces/${workspaceId}/epics/${epic.id}`, { method: 'DELETE' });
  } catch (error) {
    epicStore.upsertEpic(epic);
    throw error;
  }
}
