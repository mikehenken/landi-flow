import { describe, expect, it } from 'vitest';
import {
  isRecoverableRecurringQueryError,
  sanitizeRecurringError,
} from '@/lib/recurring-stories/recurring-rules-errors';

describe('recurring rules recoverable empty', () => {
  it('maps missing table / schema cache errors as recoverable', () => {
    expect(
      isRecoverableRecurringQueryError(
        "Could not find the table 'linear_clone.recurring_story_rules' in the schema cache",
      ),
    ).toBe(true);
    expect(isRecoverableRecurringQueryError('relation does not exist')).toBe(true);
  });

  it('sanitizes schema names from user-facing errors', () => {
    expect(sanitizeRecurringError('permission denied for table workspace_members')).toBe(
      'Recurring stories are not available yet for this workspace.',
    );
    expect(sanitizeRecurringError('timeout talking to linear_clone.recurring_story_rules')).toBe(
      'timeout talking to workspace data',
    );
  });

  it('documents UUID team ids are required in live mode (not team-design)', () => {
    const demoTeamId = 'team-design';
    const uuidTeamId = '11111111-2222-4333-8444-555555555555';
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uuidRe.test(demoTeamId)).toBe(false);
    expect(uuidRe.test(uuidTeamId)).toBe(true);
  });
});
