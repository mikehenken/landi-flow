/**
 * Resolves the team id for Triage nav / redirect.
 * Never returns an empty string — callers must fall back to `/workspace/triage`
 * when null so hrefs never become `/workspace/team//triage`.
 */

export interface ResolveTriageTeamIdInput {
  mockAuth: boolean;
  demoTeamId: string;
  defaultTeamId?: string | null;
  contextTeamId?: string | null;
  firstTeamId?: string | null;
}

export function resolveTriageTeamId(input: ResolveTriageTeamIdInput): string | null {
  if (input.mockAuth) {
    const demo = input.demoTeamId.trim();
    return demo.length > 0 ? demo : null;
  }

  const candidates: Array<string | null | undefined> = [
    input.defaultTeamId,
    input.contextTeamId,
    input.firstTeamId,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

export function triageHrefForTeam(teamId: string | null): string {
  if (!teamId) {
    return '/workspace/triage';
  }
  return `/workspace/team/${teamId}/triage`;
}
