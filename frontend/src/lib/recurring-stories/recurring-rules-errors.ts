/** Shared helpers for recurring-rules API error handling (P1-8). */

export function isRecoverableRecurringQueryError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('does not exist') ||
    lower.includes('relation') ||
    lower.includes('schema cache') ||
    lower.includes('pgrst') ||
    lower.includes('permission denied') ||
    lower.includes('not find the table') ||
    lower.includes('could not find the table')
  );
}

export function sanitizeRecurringError(message: string): string {
  const lower = message.toLowerCase();
  if (isRecoverableRecurringQueryError(message)) {
    return 'Recurring stories are not available yet for this workspace.';
  }
  if (lower.includes('jwt') || lower.includes('auth') || lower.includes('permission')) {
    return 'You do not have permission to manage recurring stories.';
  }
  return message
    .replace(/linear_clone\.\w+/gi, 'workspace data')
    .replace(/\brecurring_story_rules\b/gi, 'recurring rules')
    .replace(/\bworkspace_members\b/gi, 'workspace membership');
}
