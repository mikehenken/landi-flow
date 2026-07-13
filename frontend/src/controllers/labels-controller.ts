import type { EpicLabelCatalogEntry, StoryLabel } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { apiFetch, apiList } from '@/lib/api/client';
import { createCorrelationContext } from '@/lib/correlation';
import {
  deleteEpicLabel,
  deleteStoryLabel,
  getTaxonomySettings,
  upsertEpicLabel,
  upsertStoryLabel,
} from '@/lib/taxonomy/taxonomy-store';
import type { TaxonomyLabel } from '@/lib/taxonomy/taxonomy-types';

const DEFAULT_LABEL_COLOR = '#3b82f6';

function storyLabelToTaxonomy(row: StoryLabel): TaxonomyLabel {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? DEFAULT_LABEL_COLOR,
    description: row.description,
    scope: 'story',
  };
}

function epicLabelToTaxonomy(row: EpicLabelCatalogEntry): TaxonomyLabel {
  return {
    id: row.id,
    name: row.name,
    color: row.color ?? DEFAULT_LABEL_COLOR,
    scope: 'epic',
  };
}

export async function loadStoryLabels(workspaceId: string): Promise<TaxonomyLabel[]> {
  if (isMockAuthEnabled()) {
    void workspaceId;
    return getTaxonomySettings().story_labels;
  }

  const rows = await apiList<StoryLabel>(`workspaces/${workspaceId}/labels`);
  return rows.map(storyLabelToTaxonomy);
}

export async function createStoryLabel(input: {
  workspaceId: string;
  name: string;
  color?: string;
}): Promise<TaxonomyLabel> {
  if (isMockAuthEnabled()) {
    const label: TaxonomyLabel = {
      id: `label-${Date.now()}`,
      name: input.name.trim(),
      color: input.color ?? DEFAULT_LABEL_COLOR,
      scope: 'story',
    };
    upsertStoryLabel(label);
    return label;
  }

  const result = await apiFetch<{ label: StoryLabel }>(
    `workspaces/${input.workspaceId}/labels`,
    {
      method: 'POST',
      body: {
        name: input.name.trim(),
        color: input.color ?? DEFAULT_LABEL_COLOR,
      },
      correlationId: createCorrelationContext().correlation_id,
    },
  );
  return storyLabelToTaxonomy(result.label);
}

export async function updateStoryLabel(input: {
  workspaceId: string;
  labelId: string;
  name?: string;
  color?: string;
}): Promise<TaxonomyLabel> {
  if (isMockAuthEnabled()) {
    const settings = getTaxonomySettings();
    const existing = settings.story_labels.find((row) => row.id === input.labelId);
    if (!existing) {
      throw new Error('Label not found');
    }
    const label: TaxonomyLabel = {
      ...existing,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    };
    upsertStoryLabel(label);
    return label;
  }

  const result = await apiFetch<{ label: StoryLabel }>(
    `workspaces/${input.workspaceId}/labels/${input.labelId}`,
    {
      method: 'PATCH',
      body: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      },
      correlationId: createCorrelationContext().correlation_id,
    },
  );
  return storyLabelToTaxonomy(result.label);
}

export async function removeStoryLabel(workspaceId: string, labelId: string): Promise<void> {
  if (isMockAuthEnabled()) {
    void workspaceId;
    deleteStoryLabel(labelId);
    return;
  }

  await apiFetch<{ ok: true }>(`workspaces/${workspaceId}/labels/${labelId}`, {
    method: 'DELETE',
    correlationId: createCorrelationContext().correlation_id,
  });
}

export async function loadEpicLabels(workspaceId: string): Promise<TaxonomyLabel[]> {
  if (isMockAuthEnabled()) {
    void workspaceId;
    return getTaxonomySettings().epic_labels;
  }

  const rows = await apiList<EpicLabelCatalogEntry>(`workspaces/${workspaceId}/epic-labels`);
  return rows.map(epicLabelToTaxonomy);
}

export async function createEpicLabel(input: {
  workspaceId: string;
  name: string;
  color?: string;
}): Promise<TaxonomyLabel> {
  if (isMockAuthEnabled()) {
    const label: TaxonomyLabel = {
      id: `label-epic-${Date.now()}`,
      name: input.name.trim(),
      color: input.color ?? DEFAULT_LABEL_COLOR,
      scope: 'epic',
    };
    upsertEpicLabel(label);
    return label;
  }

  const result = await apiFetch<{ label: EpicLabelCatalogEntry }>(
    `workspaces/${input.workspaceId}/epic-labels`,
    {
      method: 'POST',
      body: {
        name: input.name.trim(),
        color: input.color ?? DEFAULT_LABEL_COLOR,
      },
      correlationId: createCorrelationContext().correlation_id,
    },
  );
  return epicLabelToTaxonomy(result.label);
}

export async function removeEpicLabel(workspaceId: string, labelId: string): Promise<void> {
  if (isMockAuthEnabled()) {
    void workspaceId;
    deleteEpicLabel(labelId);
    return;
  }

  await apiFetch<{ ok: true }>(`workspaces/${workspaceId}/epic-labels/${labelId}`, {
    method: 'DELETE',
    correlationId: createCorrelationContext().correlation_id,
  });
}
