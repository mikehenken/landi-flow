import { describe, expect, it } from 'vitest';
import { ENTITY_TOPICS } from '../../../../packages/core/src/events/topics';
import {
  extractRoomFromWebhook,
  extractStoryIdFromPayload,
  shouldFanOutTopic,
} from './collaboration-fanout';

describe('shouldFanOutTopic', () => {
  it('fans out story lifecycle topics', () => {
    expect(shouldFanOutTopic(ENTITY_TOPICS.STORY_CREATED)).toBe(true);
    expect(shouldFanOutTopic(ENTITY_TOPICS.STORY_UPDATED)).toBe(true);
    expect(shouldFanOutTopic(ENTITY_TOPICS.STORY_STATUS_CHANGED)).toBe(true);
    expect(shouldFanOutTopic(ENTITY_TOPICS.EPIC_UPDATED)).toBe(false);
  });
});

describe('extractStoryIdFromPayload', () => {
  it('reads story_id or id', () => {
    expect(extractStoryIdFromPayload({ story_id: 's-1' })).toBe('s-1');
    expect(extractStoryIdFromPayload({ id: 's-2' })).toBe('s-2');
    expect(extractStoryIdFromPayload({})).toBeNull();
  });
});

describe('extractRoomFromWebhook', () => {
  it('parses Liveblocks room id', () => {
    const parsed = extractRoomFromWebhook('linear_clone:ws-1:story:story-42');
    expect(parsed?.entityType).toBe('story');
    expect(parsed?.entityId).toBe('story-42');
  });
});
