'use client';

import * as React from 'react';
import type { Epic, Milestone, Story } from '@landi-flow/core/types';
import { Button, cn, Input } from '@landi-flow/ui';
import { ArrowRightLeft } from 'lucide-react';
import {
  assignStoryToMilestone,
  convertMilestoneToEpic,
  createMilestone,
  enrichMilestonesForEpic,
  reorderMilestones,
} from '@/lib/milestones/milestone-store';

export interface EpicMilestonesPanelProps {
  epic: Epic;
  stories: Story[];
  className?: string;
}

/** CAP-050–053,054: epic sidebar milestones with CRUD and convert. */
export function EpicMilestonesPanel({
  epic,
  stories,
  className,
}: EpicMilestonesPanelProps): React.ReactElement {
  const [milestones, setMilestones] = React.useState<Milestone[]>([]);
  const [newName, setNewName] = React.useState('');

  const refresh = React.useCallback((): void => {
    setMilestones(enrichMilestonesForEpic(epic.id, stories));
  }, [epic.id, stories]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = (): void => {
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    createMilestone(epic.id, trimmed);
    setNewName('');
    refresh();
  };

  const handleConvert = (milestoneId: string): void => {
    const epicId = convertMilestoneToEpic(milestoneId, stories);
    if (epicId) {
      refresh();
    }
  };

  const handleMoveUp = (milestoneId: string): void => {
    const ids = milestones.map((m) => m.id);
    const index = ids.indexOf(milestoneId);
    if (index <= 0) {
      return;
    }
    const next = [...ids];
    [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
    reorderMilestones(epic.id, next);
    refresh();
  };

  return (
    <section
      className={cn('flex flex-col gap-3', className)}
      data-testid="epic-milestones-panel"
      data-cap="CAP-050"
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Milestones
      </h3>

      <ul className="flex flex-col gap-2" data-testid="milestone-list">
        {milestones.map((milestone) => (
          <li
            key={milestone.id}
            className="rounded-md border border-border px-3 py-2"
            data-testid="milestone-item"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{milestone.name}</p>
                {milestone.target_date ? (
                  <p className="text-xs text-muted-foreground">{milestone.target_date}</p>
                ) : null}
                <p
                  className="mt-1 font-mono text-xs text-primary"
                  data-cap="CAP-053"
                >
                  {milestone.progress_pct}% ({milestone.completed_issue_count}/
                  {milestone.issue_count})
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  data-testid="milestone-reorder-up"
                  data-cap="CAP-052"
                  onClick={() => handleMoveUp(milestone.id)}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  data-testid="milestone-convert-epic"
                  data-cap="CAP-054"
                  onClick={() => handleConvert(milestone.id)}
                  title="Convert to Epic"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New milestone"
          data-testid="milestone-create-input"
          className="h-8 text-sm"
        />
        <Button type="button" size="sm" data-testid="milestone-create" onClick={handleCreate}>
          Add
        </Button>
      </div>
    </section>
  );
}

export interface StoryMilestonePickerProps {
  story: Story;
  milestones: Milestone[];
}

/** CAP-051: assign story to milestone (Shift+M UX surfaced as picker). */
export function StoryMilestonePicker({
  story,
  milestones,
}: StoryMilestonePickerProps): React.ReactElement {
  return (
    <select
      className="rounded-md border border-border bg-transparent px-2 py-1 text-sm"
      value={story.milestone_id ?? ''}
      data-testid="story-milestone-picker"
      data-cap="CAP-051"
      onChange={(event) => {
        const value = event.target.value;
        assignStoryToMilestone(story, value || null);
      }}
    >
      <option value="">No milestone</option>
      {milestones.map((m) => (
        <option key={m.id} value={m.id}>
          {m.name}
        </option>
      ))}
    </select>
  );
}
