'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button, cn } from '@landi-flow/ui';
import { Link } from '@/i18n/navigation';
import { getTaxonomySettings } from '@/lib/taxonomy/taxonomy-store';

export interface TaxonomySettingsPanelProps {
  className?: string;
}

/** Settings taxonomy overview with CTAs to editable routes. */
export function TaxonomySettingsPanel({
  className,
}: TaxonomySettingsPanelProps): React.ReactElement {
  const [settings, setSettings] = React.useState(getTaxonomySettings);

  React.useEffect(() => {
    setSettings(getTaxonomySettings());
  }, []);

  return (
    <div
      className={cn('flex flex-col gap-8 p-6', className)}
      data-testid="taxonomy-settings-panel"
      data-cap="CAP-008"
    >
      <p className="text-sm text-muted-foreground">
        Read-only overview of workspace taxonomy. Story labels are editable under{' '}
        <Link href="/workspace/settings/labels" className="text-primary underline underline-offset-2">
          Workspace settings → Labels
        </Link>
        .
      </p>

      <section data-cap="CAP-008">
        <h2 className="text-base font-semibold">Workflow states</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-team workflow states are managed on each team&apos;s settings page.
        </p>
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

      <section data-cap="CAP-090">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Story labels</h2>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/workspace/settings/labels" data-testid="taxonomy-labels-cta">
              Manage story labels
            </Link>
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Create, rename, and delete story labels on the dedicated labels settings page.
        </p>
        <ul className="mt-2 flex flex-wrap gap-2" data-testid="story-labels-list">
          {settings.story_labels.map((label) => (
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

      <section data-cap="CAP-091">
        <h2 className="text-base font-semibold">Epic labels</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Epic label editing is available under{' '}
          <Link href="/workspace/settings/epic-labels" className="text-primary underline underline-offset-2">
            Epic labels
          </Link>
          .
        </p>
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

      <section data-cap="CAP-009">
        <h2 className="text-base font-semibold">Story templates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Template CRUD is available under{' '}
          <Link href="/workspace/settings/issue-templates" className="text-primary underline underline-offset-2">
            Issue templates
          </Link>
          .
        </p>
        <ul className="mt-2 flex flex-col gap-2" data-testid="story-templates-list">
          {settings.story_templates.map((tpl) => (
            <li key={tpl.id} className="rounded-md border border-border px-3 py-2 text-sm">
              {tpl.name}
            </li>
          ))}
        </ul>
      </section>

      <section data-cap="CAP-094">
        <h2 className="text-base font-semibold">Epic templates</h2>
        <ul className="mt-2 flex flex-col gap-2" data-testid="epic-templates-list">
          {settings.epic_templates.map((tpl) => (
            <li key={tpl.id} className="rounded-md border border-border px-3 py-2 text-sm">
              {tpl.name}
            </li>
          ))}
        </ul>
      </section>

      <section data-cap="CAP-095">
        <h2 className="text-base font-semibold">Document templates</h2>
        <ul className="mt-2 flex flex-col gap-2" data-testid="document-templates-list">
          {settings.document_templates.map((tpl) => (
            <li key={tpl.id} className="rounded-md border border-border px-3 py-2 text-sm">
              {tpl.name}
            </li>
          ))}
        </ul>
      </section>

      <section data-cap="CAP-092">
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

      <section data-cap="CAP-097">
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

      <section data-cap="CAP-098">
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
    </div>
  );
}
