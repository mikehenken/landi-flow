import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '@landi-flow/core/types';
import {
  activitySignalDedupeKey,
  dedupeActivityEvents,
} from '@/lib/inbox/dedupe-activity-events';

function makeEvent(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: 'evt-1',
    workspace_id: 'ws-1',
    story_id: 'story-gen-3',
    epic_id: null,
    story_identifier: 'GEN-3',
    story_title: 'Signal spam',
    actor_type: 'agent',
    actor_user_id: null,
    actor_agent_id: 'agent-1',
    actor_name: 'Cursor',
    event_type: 'signal.attached',
    payload: {
      kind: 'agent_lifecycle',
      status: 'started',
      source: 'assignment',
    },
    correlation_id: 'corr-1',
    created_at: '2026-07-13T12:00:00.000Z',
    ...overrides,
  };
}

describe('dedupeActivityEvents', () => {
  it('collapses duplicate signal.attached rows for the same story fingerprint', () => {
    const events = [
      makeEvent({ id: 'evt-new', created_at: '2026-07-13T13:00:00.000Z' }),
      makeEvent({ id: 'evt-old', created_at: '2026-07-13T12:00:00.000Z' }),
      makeEvent({
        id: 'evt-other',
        story_id: 'story-other',
        story_identifier: 'GEN-1',
        correlation_id: 'corr-2',
      }),
    ];

    const deduped = dedupeActivityEvents(events);
    expect(deduped.map((e) => e.id)).toEqual(['evt-new', 'evt-other']);
    expect(activitySignalDedupeKey(events[0]!)).toBe(
      activitySignalDedupeKey(events[1]!),
    );
  });

  it('dedupes by correlation_id when present', () => {
    const events = [
      makeEvent({
        id: 'a',
        correlation_id: 'same-corr',
        payload: { kind: 'ci', status: 'passed', correlation_id: 'same-corr' },
      }),
      makeEvent({
        id: 'b',
        correlation_id: 'same-corr',
        payload: { kind: 'ci', status: 'passed', correlation_id: 'same-corr' },
      }),
    ];
    expect(dedupeActivityEvents(events)).toHaveLength(1);
  });

  it('keeps distinct non-signal events', () => {
    const events = [
      makeEvent({ id: 's1', event_type: 'story.updated', payload: {} }),
      makeEvent({ id: 's2', event_type: 'story.updated', payload: {} }),
    ];
    expect(dedupeActivityEvents(events)).toHaveLength(2);
  });
});
