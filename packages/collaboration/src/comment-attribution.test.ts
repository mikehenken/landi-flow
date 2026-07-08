import { describe, expect, it } from 'vitest';
import { deriveCommentAttribution } from './comment-attribution';

const HUMAN_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('deriveCommentAttribution', () => {
  it('attributes human UUID authors', () => {
    const attr = deriveCommentAttribution(HUMAN_UUID);
    expect(attr.actor_type).toBe('human');
    expect(attr.author_user_id).toBe(HUMAN_UUID);
    expect(attr.author_agent_id).toBeNull();
  });

  it('attributes agent: prefixed ids', () => {
    const attr = deriveCommentAttribution('agent:agent-triage');
    expect(attr.actor_type).toBe('agent');
    expect(attr.author_agent_id).toBe('agent-triage');
  });

  it('attributes system: prefixed ids', () => {
    const attr = deriveCommentAttribution('system:outbox');
    expect(attr.actor_type).toBe('system');
  });

  it('reads on_behalf_of_user_id from metadata', () => {
    const attr = deriveCommentAttribution('agent:cursor', {
      on_behalf_of_user_id: HUMAN_UUID,
    });
    expect(attr.on_behalf_of_user_id).toBe(HUMAN_UUID);
  });

  it('handles missing createdBy', () => {
    const attr = deriveCommentAttribution(undefined);
    expect(attr.author_user_id).toBeNull();
  });
});
