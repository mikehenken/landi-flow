// Server-only. Resolves agent workspace context for chat/apply routes.
import { isUuid, resolveTeamIdFromRoster } from '@landi-flow/core/mcp';
import { isMockAuthEnabled } from '@/lib/api/config';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';
import {
  buildMockAgentWorkspaceContext,
  loadAgentWorkspaceContext,
  type AgentWorkspaceContext,
} from './workspace-context';

export interface ResolveAgentWorkspaceContextInput {
  workspaceId?: string;
  teamId?: string;
  authToken?: string | null;
}

/**
 * Loads live workspace roster for agent enrichment. Mock context is used only when
 * NEXT_PUBLIC_MOCK_AUTH=true. Production never falls back to demo team-design slugs.
 */
export async function resolveAgentWorkspaceContext(
  input: ResolveAgentWorkspaceContextInput,
): Promise<AgentWorkspaceContext | null> {
  const { workspaceId, teamId, authToken } = input;

  if (!workspaceId) {
    return null;
  }

  if (isMockAuthEnabled()) {
    const mockContext = buildMockAgentWorkspaceContext(workspaceId);
    if (teamId) {
      const resolvedTeamId = resolveTeamIdFromRoster(mockContext.teams, teamId);
      const activeTeam =
        resolvedTeamId && isUuid(resolvedTeamId)
          ? (mockContext.teams.find((team) => team.id === resolvedTeamId) ?? null)
          : null;
      return {
        ...mockContext,
        teamId: activeTeam?.id ?? resolvedTeamId ?? teamId,
        teamName: activeTeam?.name ?? mockContext.teamName,
        teamKey: activeTeam?.key ?? mockContext.teamKey,
        teamSlug: activeTeam?.slug ?? mockContext.teamSlug,
      };
    }
    return mockContext;
  }

  if (!isWorkspaceUuid(workspaceId) || !authToken) {
    return null;
  }

  const liveContext = await loadAgentWorkspaceContext(workspaceId, authToken);
  if (!liveContext) {
    return null;
  }

  if (teamId) {
    const resolvedTeamId = resolveTeamIdFromRoster(liveContext.teams, teamId);
    if (resolvedTeamId && isUuid(resolvedTeamId)) {
      const activeTeam = liveContext.teams.find((team) => team.id === resolvedTeamId) ?? null;
      return {
        ...liveContext,
        teamId: resolvedTeamId,
        teamName: activeTeam?.name ?? liveContext.teamName,
        teamKey: activeTeam?.key ?? liveContext.teamKey,
        teamSlug: activeTeam?.slug ?? liveContext.teamSlug,
      };
    }
  }

  return liveContext;
}
