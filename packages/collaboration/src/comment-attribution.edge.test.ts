import { describe, expect, it } from 'vitest';
import { deriveCommentAttribution } from './comment-attribution';

describe('deriveCommentAttribution edge cases', () => {
  it('handles non-uuid opaque human ids', () => {
    const attr = deriveCommentAttribution('opaque-user-id');
    expect(attr.actor_type).toBe('human');
    expect(attr.author_user_id).toBeNull();
  });

  it('handles empty agent prefix', () => {
    const attr = deriveCommentAttribution('agent:');
    expect(attr.actor_type).toBe('agent');
    expect(attr.author_agent_id).toBeNull();
  });
});
