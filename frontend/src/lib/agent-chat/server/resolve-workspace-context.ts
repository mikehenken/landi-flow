// Server-only. Resolves agent workspace context for chat/apply routes.
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
      return { ...mockContext, teamId };
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

  if (teamId && !liveContext.teamId) {
    return { ...liveContext, teamId };
  }

  return liveContext;
}
