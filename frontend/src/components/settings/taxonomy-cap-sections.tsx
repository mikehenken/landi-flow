'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button, Input, cn } from '@landi-flow/ui';
import {
  deleteStoryLabel,
  getTaxonomySettings,
  upsertStoryLabel,
} from '@/lib/taxonomy/taxonomy-store';
import type { TaxonomyLabel } from '@/lib/taxonomy/taxonomy-types';

function useTaxonomySettings() {
  const [settings, setSettings] = React.useState(getTaxonomySettings);

  React.useEffect(() => {
    setSettings(getTaxonomySettings());
  }, []);

  return settings;
}

export function WorkflowStatesSection({ className }: { className?: string }): React.ReactElement {
  const settings = useTaxonomySettings();

  return (
    <section className={cn('rounded-lg border border-border bg-card p-6', className)} data-cap="CAP-008">
      <h2 className="text-base font-semibold">Workflow states</h2>
      <ul className="mt-2 flex flex-wrap gap-2" data-testid="workflow-states-list">
        {settings.workflow_states.map((state) => (
          <li
            key={state.id}
            className="rounded-md border border-border px-2 py-1 text-sm"
          >
            {state.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

const STORY_LABEL_COLORS = ['#ef4444', '#3b82f6', '#a855f7', '#22c55e', '#f59e0b'] as const;

export function StoryLabelsSection({ className }: { className?: string }): React.ReactElement {
  const [settings, setSettings] = React.useState(getTaxonomySettings);
  const [name, setName] = React.useState('');
  const [color, setColor] = React.useState<string>(STORY_LABEL_COLORS[0]);

  const refreshSettings = React.useCallback((): void => {
    setSettings(getTaxonomySettings());
  }, []);

  const handleAddLabel = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) {
        return;
      }
      const label: TaxonomyLabel = {
        id: `label-${Date.now()}`,
        name: trimmedName,
        color,
        scope: 'story',
      };
      upsertStoryLabel(label);
      setName('');
      refreshSettings();
    },
    [color, name, refreshSettings],
  );

  const handleDeleteLabel = React.useCallback(
    (labelId: string): void => {
      deleteStoryLabel(labelId);
      refreshSettings();
    },
    [refreshSettings],
  );

  return (
    <section className={cn('rounded-lg border border-border bg-card p-6', className)} data-cap="CAP-090">
      <h2 className="text-base font-semibold">Story labels</h2>
      <form className="mt-4 flex flex-wrap items-end gap-2" onSubmit={handleAddLabel}>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label htmlFor="story-label-name" className="text-sm text-muted-foreground">
            Label name
          </label>
          <Input
            id="story-label-name"
            data-testid="story-label-name-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Regression"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">Color</span>
          <div className="flex gap-1" data-testid="story-label-color-picker">
            {STORY_LABEL_COLORS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`Color ${option}`}
                aria-pressed={color === option ? 'true' : 'false'}
                className={cn(
                  'h-7 w-7 rounded-full border-2',
                  color === option ? 'border-foreground' : 'border-transparent',
                )}
                style={{ backgroundColor: option }}
                onClick={() => setColor(option)}
              />
            ))}
          </div>
        </div>
        <Button type="submit" data-testid="story-label-add-button">
          Add label
        </Button>
      </form>
      <ul className="mt-4 flex flex-wrap gap-2" data-testid="story-labels-list">
        {settings.story_labels.map((label) => (
          <li
            key={label.id}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-white"
            style={{ backgroundColor: label.color }}
            data-testid="story-label-chip"
          >
            <span>{label.name}</span>
            <button
              type="button"
              aria-label={`Remove ${label.name}`}
              data-testid="story-label-delete"
              className="rounded px-1 text-xs opacity-80 hover:opacity-100"
              onClick={() => handleDeleteLabel(label.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EpicLabelsSection({ className }: { className?: string }): React.ReactElement {
  const settings = useTaxonomySettings();

  return (
    <section className={cn('rounded-lg border border-border bg-card p-6', className)} data-cap="CAP-091">
      <h2 className="text-base font-semibold">Epic labels</h2>
      <ul className="mt-2 flex flex-wrap gap-2" data-testid="epic-labels-list">
        {settings.epic_labels.map((label) => (
          <li
            key={label.id}
            className="rounded-md px-2 py-1 text-sm text-white"
            style={{ backgroundColor: label.color }}
          >
            {label.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StoryTemplatesSection({ className }: { className?: string }): React.ReactElement {
  const settings = useTaxonomySettings();

  return (
    <section className={cn('rounded-lg border border-border bg-card p-6', className)} data-cap="CAP-009">
      <h2 className="text-base font-semibold">Story templates</h2>
      <ul className="mt-2 flex flex-col gap-2" data-testid="story-templates-list">
        {settings.story_templates.map((tpl) => (
          <li key={tpl.id} className="rounded-md border border-border px-3 py-2 text-sm">
            {tpl.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EpicTemplatesSection({ className }: { className?: string }): React.ReactElement {
  const settings = useTaxonomySettings();

  return (
    <section className={cn('rounded-lg border border-border bg-card p-6', className)} data-cap="CAP-094">
      <h2 className="text-base font-semibold">Epic templates</h2>
      <ul className="mt-2 flex flex-col gap-2" data-testid="epic-templates-list">
        {settings.epic_templates.map((tpl) => (
          <li key={tpl.id} className="rounded-md border border-border px-3 py-2 text-sm">
            {tpl.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DocumentTemplatesSection({ className }: { className?: string }): React.ReactElement {
  const settings = useTaxonomySettings();

  return (
    <section className={cn('rounded-lg border border-border bg-card p-6', className)} data-cap="CAP-095">
      <h2 className="text-base font-semibold">Document templates</h2>
      <ul className="mt-2 flex flex-col gap-2" data-testid="document-templates-list">
        {settings.document_templates.map((tpl) => (
          <li key={tpl.id} className="rounded-md border border-border px-3 py-2 text-sm">
            {tpl.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EpicStatusGroupsSection({ className }: { className?: string }): React.ReactElement {
  const settings = useTaxonomySettings();

  return (
    <section className={cn('rounded-lg border border-border bg-card p-6', className)} data-cap="CAP-092">
      <h2 className="text-base font-semibold">Epic status groups</h2>
      <ul className="mt-2 flex flex-wrap gap-2" data-testid="epic-status-groups-list">
        {settings.epic_status_groups.map((group) => (
          <li
            key={group.id}
            className="rounded-md border border-border px-2 py-1 text-sm"
          >
            {group.name}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReleasesSection({ className }: { className?: string }): React.ReactElement {
  const settings = useTaxonomySettings();

  return (
    <section className={cn('rounded-lg border border-border bg-card p-6', className)} data-cap="CAP-097">
      <h2 className="text-base font-semibold">Releases</h2>
      <ul className="mt-2 flex flex-col gap-2" data-testid="releases-list">
        {settings.releases.map((release) => (
          <li key={release.id} className="rounded-md border border-border px-3 py-2 text-sm">
            <span className="font-medium">{release.name}</span>
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {release.version}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CustomEmojiSection({ className }: { className?: string }): React.ReactElement {
  const settings = useTaxonomySettings();

  return (
    <section className={cn('rounded-lg border border-border bg-card p-6', className)} data-cap="CAP-098">
      <h2 className="text-base font-semibold">Custom emoji</h2>
      <ul className="mt-2 flex flex-wrap gap-3" data-testid="custom-emoji-list">
        {settings.custom_emojis.map((emoji) => (
          <li key={emoji.id} className="flex items-center gap-2 text-sm">
            <Image
              src={emoji.image_url}
              alt={emoji.name}
              width={24}
              height={24}
              className="h-6 w-6 rounded"
            />
            <span>{emoji.shortcode}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
