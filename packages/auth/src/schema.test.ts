import { describe, expect, it } from 'vitest';
import { LINEAR_CLONE_SCHEMA } from './schema';

describe('LINEAR_CLONE_SCHEMA', () => {
  it('is linear_clone', () => {
    expect(LINEAR_CLONE_SCHEMA).toBe('linear_clone');
  });
});
