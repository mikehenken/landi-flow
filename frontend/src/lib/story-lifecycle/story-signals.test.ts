import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '@landi-flow/core/types';
import {
  extractEngineeringSignal,
  extractEngineeringSignals,
  isSignalAttachedEvent,
  sortEngineeringSignalsNewestFirst,
  SIGNAL_ATTACHED_EVENT,
} from '@/lib/story-lifecycle/story-signals';

function makeSignalEvent(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: 'evt-signal-1',
    workspace_id: 'ws-1',
    story_id: 'story-1',
    epic_id: null,
    story_identifier: 'GEN-15',
    story_title: 'MCP probe',
    actor_type: 'agent',
    actor_user_id: null,
    actor_agent_id: 'agent-1',
    actor_name: 'Cursor Agent',
    event_type: SIGNAL_ATTACHED_EVENT,
    payload: {
      kind: 'ci',
      status: 'passed',
      source: 'github',
      correlation_id: 'corr-123',
      url: 'https://github.com/org/repo/actions/runs/1',
    },
    correlation_id: 'corr-123',
    created_at: '2026-07-09T07:29:02.912572+00:00',
    ...overrides,
  };
}

describe('story-signals', () => {
  it('detects signal.attached events', () => {
    const event = makeSignalEvent();
    expect(isSignalAttachedEvent(event)).toBe(true);
    expect(isSignalAttachedEvent({ ...event, event_type: 'story.updated' })).toBe(false);
  });

  it('extracts engineering signal view model', () => {
    const signal = extractEngineeringSignal(makeSignalEvent());
    expect(signal).not.toBeNull();
    expect(signal?.kind).toBe('ci');
    expect(signal?.status).toBe('passed');
    expect(signal?.correlationId).toBe('corr-123');
    expect(signal?.title).toContain('ci');
  });

  it('uses payload title for agent_trace signals', () => {
    const signal = extractEngineeringSignal(
      makeSignalEvent({
        payload: {
          kind: 'agent_trace',
          status: 'completed',
          title: 'P1 settings/product wiring',
          trace_id: 'b6c33c66-a802-4c53-abb2-082585f39831',
          correlation_id: '6a3121ea-bf9a-49bb-b283-f63829c6f3a5',
          content_preview: '## User query\nWire settings APIs',
        },
      }),
    );
    expect(signal?.title).toBe('P1 settings/product wiring');
    expect(signal?.traceId).toBe('b6c33c66-a802-4c53-abb2-082585f39831');
    expect(signal?.summary).toContain('Trace b6c33c66');
  });

  it('filters signal events from mixed activity', () => {
    const events = [
      makeSignalEvent(),
      makeSignalEvent({ id: 'evt-2', event_type: 'story.updated', payload: {} }),
    ];
    const signals = extractEngineeringSignals(events);
    expect(signals).toHaveLength(1);
    expect(signals[0]?.activityEventId).toBe('evt-signal-1');
  });

  it('sorts engineering signals newest first', () => {
    const older = extractEngineeringSignal(
      makeSignalEvent({
        id: 'evt-old',
        created_at: '2026-07-01T00:00:00.000Z',
      }),
    );
    const newer = extractEngineeringSignal(
      makeSignalEvent({
        id: 'evt-new',
        created_at: '2026-07-09T00:00:00.000Z',
      }),
    );
    expect(older).not.toBeNull();
    expect(newer).not.toBeNull();
    const sorted = sortEngineeringSignalsNewestFirst([older!, newer!]);
    expect(sorted.map((signal) => signal.id)).toEqual(['evt-new', 'evt-old']);
  });
});
