import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '@landi-flow/core/types';
import {
  resolveSectionFromActivity,
  resolveSectionFromNotification,
} from '@/lib/story/resolve-story-detail-section';

const baseNotification = {
  id: 'n1',
  workspace_id: 'ws-1',
  story_id: 'story-1',
  epic_id: null,
  story_identifier: 'LAN-1',
  story_title: 'Test',
  actor_type: 'human' as const,
  actor_user_id: 'user-1',
  actor_agent_id: null,
  actor_name: 'Alex',
  summary: 'test',
  read: false,
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('resolveSectionFromNotification', () => {
  it('maps comment and mention notifications to comments', () => {
    expect(
      resolveSectionFromNotification({ ...baseNotification, kind: 'comment' }),
    ).toEqual({ section: 'comments' });
    expect(
      resolveSectionFromNotification({ ...baseNotification, kind: 'mention' }),
    ).toEqual({ section: 'comments' });
  });

  it('maps delegate notifications to signals', () => {
    expect(
      resolveSectionFromNotification({ ...baseNotification, kind: 'delegate' }),
    ).toEqual({ section: 'signals' });
  });
});

describe('resolveSectionFromActivity', () => {
  const baseEvent: ActivityEvent = {
    id: 'evt-signal-1',
    workspace_id: 'ws-1',
    story_id: 'story-1',
    epic_id: null,
    story_identifier: 'LAN-1',
    story_title: 'Test',
    actor_type: 'agent',
    actor_user_id: null,
    actor_agent_id: 'agent-1',
    actor_name: 'Cursor Agent',
    event_type: 'signal.attached',
    payload: { kind: 'ci' },
    correlation_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  it('maps signal.attached to signals with highlight id', () => {
    expect(resolveSectionFromActivity(baseEvent)).toEqual({
      section: 'signals',
      highlightedSignalId: 'evt-signal-1',
    });
  });

  it('maps comment events to comments section', () => {
    expect(
      resolveSectionFromActivity({
        ...baseEvent,
        id: 'evt-comment-1',
        event_type: 'entity.comment.created',
      }),
    ).toEqual({ section: 'comments' });
  });
});
