import { describe, expect, it } from 'vitest';
import {
  assertValidInviteEmail,
  isMemberInviteError,
  MemberInviteError,
  normalizeInviteEmail,
} from './member-invite.js';

describe('member-invite', () => {
  it('normalizes email addresses', () => {
    expect(normalizeInviteEmail('  Jane.Doe@Example.COM ')).toBe('jane.doe@example.com');
  });

  it('rejects invalid emails', () => {
    expect(() => assertValidInviteEmail('not-an-email')).toThrow(MemberInviteError);
    try {
      assertValidInviteEmail('bad');
    } catch (error) {
      expect(isMemberInviteError(error)).toBe(true);
      if (isMemberInviteError(error)) {
        expect(error.code).toBe('invalid_email');
      }
    }
  });

  it('accepts valid emails', () => {
    expect(assertValidInviteEmail('member@landi.test')).toBe('member@landi.test');
  });
});
