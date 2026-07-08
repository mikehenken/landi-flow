import { describe, expect, it } from 'vitest';
import {
  ALL_TOPICS,
  AGENT_TOPICS,
  ENTITY_TOPICS,
  EXTENSION_TOPICS,
  WEBHOOK_TOPICS,
} from './topics';

describe('ENTITY_TOPICS', () => {
  it('uses Story/Epic nomenclature (never Project/Issue in UI topics)', () => {
    expect(ENTITY_TOPICS.STORY_CREATED).toBe('entity.story.created');
    expect(ENTITY_TOPICS.EPIC_CREATED).toBe('entity.epic.created');
    expect(Object.values(ENTITY_TOPICS).every((t) => !t.includes('project'))).toBe(true);
  });

  it('includes CRUD lifecycle topics for Stories and Epics', () => {
    expect(ENTITY_TOPICS.STORY_UPDATED).toBeDefined();
    expect(ENTITY_TOPICS.STORY_DELETED).toBeDefined();
    expect(ENTITY_TOPICS.EPIC_UPDATED).toBeDefined();
    expect(ENTITY_TOPICS.EPIC_ASSIGNED).toBeDefined();
  });
});

describe('AGENT_TOPICS', () => {
  it('covers Action Bus lifecycle', () => {
    expect(AGENT_TOPICS.ACTION_PROPOSED).toBe('agent.action.proposed');
    expect(AGENT_TOPICS.ACTION_APPLIED).toBe('agent.action.applied');
  });
});

describe('integration topics', () => {
  it('includes extensions and webhooks', () => {
    expect(EXTENSION_TOPICS.INSTALLED).toBe('extension.installed');
    expect(WEBHOOK_TOPICS.REGISTERED).toBe('webhook.registered');
  });

  it('merges all topic namespaces', () => {
    expect(Object.keys(ALL_TOPICS).length).toBeGreaterThan(20);
  });
});
