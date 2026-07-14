import { describe, expect, it } from 'vitest';
import type { AssignableMember } from '@landi-flow/core/types';
import {
  formatAssigneeDisplayName,
  formatAssigneeInitials,
  isLikelyUserUuid,
} from '@/lib/assignee-display';

const member: AssignableMember = {
  kind: 'human',
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  name: 'Jane Doe',
  avatar_url: null,
  assignable: true,
  mentionable: true,
  presence: 'online',
  subtitle: 'member',
};

describe('assignee-display', () => {
  it('detects UUIDs', () => {
    expect(isLikelyUserUuid('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee')).toBe(true);
    expect(isLikelyUserUuid('user-jane')).toBe(false);
  });

  it('prefers roster display name', () => {
    expect(formatAssigneeDisplayName(member, member.id)).toBe('Jane Doe');
    expect(formatAssigneeInitials(member, member.id)).toBe('JD');
  });

  it('never shows first UUID hex digit as initials', () => {
    const uuid = '4aaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    expect(formatAssigneeDisplayName(undefined, uuid)).toBe('Unknown');
    expect(formatAssigneeInitials(undefined, uuid)).toBe('?');
    expect(formatAssigneeInitials(undefined, uuid)).not.toBe('4');
  });

  it('falls back to email-like ids', () => {
    expect(formatAssigneeDisplayName(undefined, 'jane@example.com')).toBe('jane@example.com');
    expect(formatAssigneeInitials(undefined, 'jane@example.com')).toBe('J');
  });
});
