'use client';

import * as React from 'react';
import type { Story, StoryRelationType } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { Link2, Trash2 } from 'lucide-react';
import { useStoryStore } from '@/hooks/use-story-store';
import {
  addStoryRelation,
  listStoryRelations,
  removeStoryRelation,
} from '@/controllers/relation-controller';

const RELATION_TYPES: StoryRelationType[] = [
  'blocks',
  'blocked_by',
  'related',
  'duplicate',
];

export interface StoryRelationsPanelProps {
  story: Story;
  className?: string;
}

/** CAP-007: bidirectional issue relations on story detail. */
export function StoryRelationsPanel({
  story,
  className,
}: StoryRelationsPanelProps): React.ReactElement {
  const { stories } = useStoryStore();
  const [relations, setRelations] = React.useState(() => listStoryRelations(story));
  const [targetId, setTargetId] = React.useState('');
  const [relationType, setRelationType] = React.useState<StoryRelationType>('related');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setRelations(listStoryRelations(story));
  }, [story]);

  const otherStories = stories.filter(
    (candidate) => candidate.id !== story.id && !candidate.is_draft,
  );

  const resolveLabel = (storyId: string): string => {
    const match = stories.find((entry) => entry.id === storyId);
    return match ? `${match.identifier} — ${match.title}` : storyId;
  };

  const handleAdd = async (): Promise<void> => {
    if (!targetId) {
      return;
    }
    setBusy(true);
    try {
      const created = await addStoryRelation(story.workspace_id, story, {
        target_story_id: targetId,
        relation_type: relationType,
      });
      setRelations((prev) => [...prev, created]);
      setTargetId('');
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (relationId: string): Promise<void> => {
    setBusy(true);
    try {
      await removeStoryRelation(story.workspace_id, story, relationId);
      setRelations((prev) => prev.filter((relation) => relation.id !== relationId));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      id="relations"
      className={cn('space-y-3 scroll-mt-4', className)}
      data-testid="story-relations-panel"
      data-cap="CAP-007"
      data-story-section="relations"
    >
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Relations
        </h3>
      </div>

      {relations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No relations yet.</p>
      ) : (
        <ul className="space-y-2">
          {relations.map((relation) => {
            const peerId =
              relation.source_story_id === story.id
                ? relation.target_story_id
                : relation.source_story_id;
            const direction =
              relation.source_story_id === story.id
                ? relation.relation_type
                : invertRelationType(relation.relation_type);

            return (
              <li
                key={relation.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-surface-elevated/20 px-3 py-2"
                data-testid="story-relation-item"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-primary">
                    {direction.replace(/_/g, ' ')}
                  </p>
                  <p className="truncate text-sm text-foreground">{resolveLabel(peerId)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove relation"
                  disabled={busy}
                  onClick={() => void handleRemove(relation.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs text-muted-foreground">Story</span>
          <select
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            data-testid="story-relation-target"
          >
            <option value="">Select…</option>
            {otherStories.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.identifier} — {candidate.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:w-40">
          <span className="text-xs text-muted-foreground">Type</span>
          <select
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            value={relationType}
            onChange={(event) => setRelationType(event.target.value as StoryRelationType)}
            data-testid="story-relation-type"
          >
            {RELATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          disabled={!targetId || busy}
          onClick={() => void handleAdd()}
          data-testid="story-relation-add"
        >
          Add
        </Button>
      </div>
    </section>
  );
}

function invertRelationType(type: StoryRelationType): StoryRelationType {
  if (type === 'blocks') {
    return 'blocked_by';
  }
  if (type === 'blocked_by') {
    return 'blocks';
  }
  return type;
}
