import type { WorkflowState } from '@landi-flow/core/types';
import { EPIC_STATUS_IDS } from '@/lib/epic-status';
import { DEMO_TEAM_ID, DEMO_WORKFLOW_STATE_ROWS } from '@/lib/seed-data';
import { WORKFLOW_STATES } from '@/lib/workflow-states';
import type {
  CustomEmoji,
  DocumentTemplate,
  EpicStatusGroup,
  EpicTemplate,
  ReleaseRecord,
  StoryTemplate,
  TaxonomyLabel,
} from '@/lib/taxonomy/taxonomy-types';

export const TAXONOMY_STORAGE_KEY = 'landi-flow:taxonomy-settings';

export interface TaxonomySettings {
  workflow_states: WorkflowState[];
  story_labels: TaxonomyLabel[];
  epic_labels: TaxonomyLabel[];
  story_templates: StoryTemplate[];
  epic_templates: EpicTemplate[];
  document_templates: DocumentTemplate[];
  epic_status_groups: EpicStatusGroup[];
  releases: ReleaseRecord[];
  custom_emojis: CustomEmoji[];
}

const SEED_TAXONOMY: TaxonomySettings = {
  workflow_states: DEMO_WORKFLOW_STATE_ROWS,
  story_labels: [
    { id: 'label-bug', name: 'Bug', color: '#ef4444', scope: 'story' },
    { id: 'label-feature', name: 'Feature', color: '#3b82f6', scope: 'story' },
    { id: 'label-polish', name: 'Polish', color: '#a855f7', scope: 'story' },
  ],
  epic_labels: [
    { id: 'label-epic-platform', name: 'Platform', color: '#22c55e', scope: 'epic' },
    { id: 'label-epic-research', name: 'Research', color: '#f59e0b', scope: 'epic' },
  ],
  story_templates: [
    {
      id: 'tpl-story-bug',
      name: 'Bug report',
      title_template: 'Bug: ',
      description_md: '## Steps to reproduce\n\n## Expected\n\n## Actual\n',
      default_priority: 'high',
      default_workflow_state_id: WORKFLOW_STATES.triage,
      label_ids: ['label-bug'],
    },
    {
      id: 'tpl-story-feature',
      name: 'Feature request',
      title_template: 'Feature: ',
      description_md: '## Problem\n\n## Proposed solution\n',
      default_priority: 'medium',
      default_workflow_state_id: WORKFLOW_STATES.todo,
      label_ids: ['label-feature'],
    },
  ],
  epic_templates: [
    {
      id: 'tpl-epic-standard',
      name: 'Standard Epic',
      name_template: 'Epic: ',
      description_md: '## Goals\n\n## Success metrics\n',
      default_status_id: EPIC_STATUS_IDS.planned,
    },
  ],
  document_templates: [
    {
      id: 'tpl-doc-spec',
      name: 'Technical spec',
      body_md: '# Overview\n\n## Requirements\n\n## Out of scope\n',
    },
    {
      id: 'tpl-doc-retro',
      name: 'Retrospective',
      body_md: '# Retro\n\n## Went well\n\n## Improve\n\n## Actions\n',
    },
  ],
  epic_status_groups: [
    { id: EPIC_STATUS_IDS.backlog, name: 'Backlog', category: 'backlog', position: 0 },
    { id: EPIC_STATUS_IDS.planned, name: 'Planned', category: 'planned', position: 1 },
    { id: EPIC_STATUS_IDS.in_progress, name: 'In Progress', category: 'in_progress', position: 2 },
    { id: EPIC_STATUS_IDS.completed, name: 'Completed', category: 'completed', position: 3 },
    { id: EPIC_STATUS_IDS.cancelled, name: 'Cancelled', category: 'cancelled', position: 4 },
  ],
  releases: [
    {
      id: 'release-v0-1',
      name: 'v0.1 Alpha',
      version: '0.1.0',
      released_at: '2026-06-01T00:00:00.000Z',
      description: 'Initial open-source alpha.',
    },
    {
      id: 'release-v0-2',
      name: 'v0.2 Beta',
      version: '0.2.0',
      released_at: null,
      description: 'Functional completion milestone.',
    },
  ],
  custom_emojis: [
    {
      id: 'emoji-ship',
      name: 'Ship it',
      shortcode: ':ship:',
      image_url: '/assets/brand/logo-mark.png',
    },
    {
      id: 'emoji-triage',
      name: 'Triage',
      shortcode: ':triage:',
      image_url: '/assets/brand/logo-mark.png',
    },
  ],
};

function readTaxonomy(): TaxonomySettings {
  if (typeof window === 'undefined') {
    return SEED_TAXONOMY;
  }
  try {
    const raw = window.localStorage.getItem(TAXONOMY_STORAGE_KEY);
    if (!raw) {
      return SEED_TAXONOMY;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return SEED_TAXONOMY;
    }
    const record = parsed as Partial<TaxonomySettings>;
    return {
      workflow_states: record.workflow_states ?? SEED_TAXONOMY.workflow_states,
      story_labels: record.story_labels ?? SEED_TAXONOMY.story_labels,
      epic_labels: record.epic_labels ?? SEED_TAXONOMY.epic_labels,
      story_templates: record.story_templates ?? SEED_TAXONOMY.story_templates,
      epic_templates: record.epic_templates ?? SEED_TAXONOMY.epic_templates,
      document_templates: record.document_templates ?? SEED_TAXONOMY.document_templates,
      epic_status_groups: record.epic_status_groups ?? SEED_TAXONOMY.epic_status_groups,
      releases: record.releases ?? SEED_TAXONOMY.releases,
      custom_emojis: record.custom_emojis ?? SEED_TAXONOMY.custom_emojis,
    };
  } catch {
    return SEED_TAXONOMY;
  }
}

function writeTaxonomy(settings: TaxonomySettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(TAXONOMY_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function getTaxonomySettings(): TaxonomySettings {
  return readTaxonomy();
}

export function getWorkflowStatesForTeamSettings(teamId: string = DEMO_TEAM_ID): WorkflowState[] {
  return readTaxonomy()
    .workflow_states.filter((state) => state.team_id === teamId)
    .sort((a, b) => a.position - b.position);
}

export function upsertStoryTemplate(template: StoryTemplate): void {
  const settings = readTaxonomy();
  const index = settings.story_templates.findIndex((row) => row.id === template.id);
  const story_templates =
    index >= 0
      ? settings.story_templates.map((row, i) => (i === index ? template : row))
      : [...settings.story_templates, template];
  writeTaxonomy({ ...settings, story_templates });
}

export function deleteStoryTemplate(templateId: string): void {
  const settings = readTaxonomy();
  writeTaxonomy({
    ...settings,
    story_templates: settings.story_templates.filter((row) => row.id !== templateId),
  });
}

export function upsertStoryLabel(label: TaxonomyLabel): void {
  const settings = readTaxonomy();
  const index = settings.story_labels.findIndex((row) => row.id === label.id);
  const story_labels =
    index >= 0
      ? settings.story_labels.map((row, i) => (i === index ? label : row))
      : [...settings.story_labels, label];
  writeTaxonomy({ ...settings, story_labels });
}

export function upsertCustomEmoji(emoji: CustomEmoji): void {
  const settings = readTaxonomy();
  const index = settings.custom_emojis.findIndex((row) => row.id === emoji.id);
  const custom_emojis =
    index >= 0
      ? settings.custom_emojis.map((row, i) => (i === index ? emoji : row))
      : [...settings.custom_emojis, emoji];
  writeTaxonomy({ ...settings, custom_emojis });
}

export function upsertRelease(release: ReleaseRecord): void {
  const settings = readTaxonomy();
  const index = settings.releases.findIndex((row) => row.id === release.id);
  const releases =
    index >= 0
      ? settings.releases.map((row, i) => (i === index ? release : row))
      : [...settings.releases, release];
  writeTaxonomy({ ...settings, releases });
}

export function getStoryTemplateById(templateId: string): StoryTemplate | undefined {
  return readTaxonomy().story_templates.find((row) => row.id === templateId);
}
