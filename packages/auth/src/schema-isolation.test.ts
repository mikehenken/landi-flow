import { describe, expect, it } from 'vitest';
import { LINEAR_CLONE_SCHEMA } from './schema';

describe('schema isolation (task-09u)', () => {
  it('exports linear_clone as the sole application schema constant', () => {
    expect(LINEAR_CLONE_SCHEMA).toBe('linear_clone');
    expect(LINEAR_CLONE_SCHEMA).not.toBe('public');
  });
});
