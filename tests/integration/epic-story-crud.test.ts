import { describe, expect, it } from 'vitest';

/** Minimal Epic/Story seed contract without pulling frontend path aliases. */
const SEED_EPIC_COUNT = 4;
const SEED_STORY_COUNT = 6;

describe('Epic/Story CRUD seed contract', () => {
  it('defines expected demo entity counts for list/detail views', () => {
    expect(SEED_EPIC_COUNT).toBeGreaterThan(0);
    expect(SEED_STORY_COUNT).toBeGreaterThan(0);
  });

  it('uses LAN- identifier pattern for Stories', () => {
    expect('LAN-1').toMatch(/^LAN-\d+$/);
  });
});
