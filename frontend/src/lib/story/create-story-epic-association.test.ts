import { describe, expect, it } from 'vitest';
import type { CreateStoryInput } from '@/stores/story-store';
import { buildCreateStoryInput } from './build-create-story-input';

/**
 * Epic Stories "Create story" must pass epicId through CreateStoryInput so
 * persistCreateStory associates the new story with the current epic.
 */
describe('create story epic association', () => {
  it('CreateStoryInput accepts epicId for epic-scoped create', () => {
    const input: CreateStoryInput = {
      title: 'From epic',
      workspaceId: 'ws-1',
      teamId: 'team-1',
      workflowStateId: 'state-todo',
      epicId: 'epic-abc',
    };
    expect(input.epicId).toBe('epic-abc');
  });

  it('omitting epicId leaves association unset', () => {
    const input: CreateStoryInput = {
      title: 'Standalone',
      workspaceId: 'ws-1',
      teamId: 'team-1',
      workflowStateId: 'state-todo',
    };
    expect(input.epicId).toBeUndefined();
  });

  it('buildCreateStoryInput normalizes missing epicId to null for persistence', () => {
    const withEpic = buildCreateStoryInput({
      title: 'From epic',
      workspaceId: 'ws-1',
      teamId: 'team-1',
      workflowStateId: 'state-todo',
      epicId: 'epic-abc',
    });
    expect(withEpic.epicId).toBe('epic-abc');

    const withoutEpic = buildCreateStoryInput({
      title: 'Standalone',
      workspaceId: 'ws-1',
      teamId: 'team-1',
      workflowStateId: 'state-todo',
    });
    expect(withoutEpic.epicId).toBeNull();
  });
});
