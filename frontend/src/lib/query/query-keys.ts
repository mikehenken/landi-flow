/** Central query keys for workspace list caches (stale-while-revalidate). */
export const queryKeys = {
  workspaces: {
    memberships: ['workspaces', 'memberships'] as const,
  },
  teams: {
    list: (workspaceId: string) => ['workspaces', workspaceId, 'teams'] as const,
  },
  workflowStates: {
    team: (workspaceId: string, teamId: string) =>
      ['workspaces', workspaceId, 'workflow-states', teamId] as const,
  },
  epicStatuses: {
    workspace: (workspaceId: string) =>
      ['workspaces', workspaceId, 'epic-statuses'] as const,
  },
  stories: {
    list: (workspaceId: string) => ['workspaces', workspaceId, 'stories'] as const,
  },
  epics: {
    list: (workspaceId: string) => ['workspaces', workspaceId, 'epics'] as const,
  },
  inbox: {
    workspace: (workspaceId: string) => ['workspaces', workspaceId, 'inbox'] as const,
  },
} as const;
