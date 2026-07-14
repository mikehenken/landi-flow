import { describe, expect, it } from 'vitest';
import { computeSubStoryProgress } from '@/lib/story-lifecycle/sub-story-progress';
import { DEMO_WORKFLOW_STATE_ROWS, SEED_STORIES } from '@/lib/seed-data';

describe('computeSubStoryProgress', () => {
  it('returns completion percent for parent with sub-stories', () => {
    const progress = computeSubStoryProgress('story-002', SEED_STORIES, DEMO_WORKFLOW_STATE_ROWS);
    expect(progress).not.toBeNull();
    expect(progress?.total).toBe(1);
    expect(progress?.percent).toBe(0);
  });
});
