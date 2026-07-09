'use client';

import * as React from 'react';
import type { ActivityEvent, Story } from '@landi-flow/core/types';
import { loadStoryActivity } from '@/controllers/story-activity-controller';

export interface StoryActivityState {
  activity: ActivityEvent[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useStoryActivity(story: Story): StoryActivityState {
  const [activity, setActivity] = React.useState<ActivityEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  const reload = React.useCallback((): void => {
    setReloadToken((value) => value + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadStoryActivity(story)
      .then((events) => {
        if (!cancelled) {
          setActivity(events);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load story activity';
          setError(message);
          setActivity([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [story, reloadToken]);

  return { activity, loading, error, reload };
}
