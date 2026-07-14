import { describe, expect, it } from 'vitest';
import { resolveTriageTeamId, triageHrefForTeam } from './resolve-triage-team-id';

describe('resolveTriageTeamId', () => {
  it('uses demo team under mock auth', () => {
    expect(
      resolveTriageTeamId({
        mockAuth: true,
        demoTeamId: 'demo-team',
        defaultTeamId: 'other',
      }),
    ).toBe('demo-team');
  });

  it('prefers defaultTeamId then context then first team', () => {
    expect(
      resolveTriageTeamId({
        mockAuth: false,
        demoTeamId: 'demo',
        defaultTeamId: 'default',
        contextTeamId: 'context',
        firstTeamId: 'first',
      }),
    ).toBe('default');

    expect(
      resolveTriageTeamId({
        mockAuth: false,
        demoTeamId: 'demo',
        defaultTeamId: null,
        contextTeamId: 'context',
        firstTeamId: 'first',
      }),
    ).toBe('context');

    expect(
      resolveTriageTeamId({
        mockAuth: false,
        demoTeamId: 'demo',
        defaultTeamId: '',
        contextTeamId: null,
        firstTeamId: 'first',
      }),
    ).toBe('first');
  });

  it('returns null when no team is available (avoids //triage)', () => {
    expect(
      resolveTriageTeamId({
        mockAuth: false,
        demoTeamId: 'demo',
        defaultTeamId: '',
        contextTeamId: null,
        firstTeamId: undefined,
      }),
    ).toBeNull();
  });
});

describe('triageHrefForTeam', () => {
  it('builds team triage path or stable workspace redirect', () => {
    expect(triageHrefForTeam('team-abc')).toBe('/workspace/team/team-abc/triage');
    expect(triageHrefForTeam(null)).toBe('/workspace/triage');
  });
});
