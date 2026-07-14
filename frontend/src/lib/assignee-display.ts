import type { AssignableMember } from '@landi-flow/core/types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLikelyUserUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Initials from a display name; never from a raw UUID. */
export function initialsFromDisplayName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0 && !isLikelyUserUuid(part));
  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    const single = parts[0]!;
    if (single.includes('@')) {
      return single.charAt(0).toUpperCase();
    }
    return single.slice(0, 2).toUpperCase();
  }
  const first = parts[0]!.charAt(0);
  const last = parts[parts.length - 1]!.charAt(0);
  return `${first}${last}`.toUpperCase();
}

/**
 * Human-readable assignee label from roster — never a raw UUID.
 * Prefer display name, then email-like id, then "Unknown".
 */
export function formatAssigneeDisplayName(
  member: AssignableMember | undefined,
  userId: string | null | undefined,
): string {
  if (!userId) {
    return 'Unassigned';
  }
  const rosterName = member?.name?.trim();
  if (rosterName && !isLikelyUserUuid(rosterName)) {
    return rosterName;
  }
  if (userId.includes('@')) {
    return userId;
  }
  if (isLikelyUserUuid(userId)) {
    return 'Unknown';
  }
  return userId;
}

/** Avatar initials for an assignee — never the first hex digit of a UUID. */
export function formatAssigneeInitials(
  member: AssignableMember | undefined,
  userId: string | null | undefined,
): string {
  if (!userId) {
    return '?';
  }
  const label = formatAssigneeDisplayName(member, userId);
  if (label === 'Unassigned' || label === 'Unknown') {
    return '?';
  }
  return initialsFromDisplayName(label);
}
