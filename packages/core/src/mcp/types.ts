import type { AssignableMember, EpicStatusCategory, WorkflowCategory, WorkflowState } from '../types/index.js';

export interface McpWorkspaceTeam {
  id: string;
  name: string;
  key: string;
  slug: string;
}

export interface McpWorkflowStateRef {
  id: string;
  name: string;
  category: WorkflowCategory;
  team_id: string;
}

export interface McpEpicStatusRef {
  id: string;
  name: string;
  category: EpicStatusCategory;
  slug: string;
}

export interface McpLabelRef {
  id: string;
  name: string;
  color: string | null;
}

export interface McpTeamWorkflowDefaults {
  backlog: string | null;
  unstarted: string | null;
  done: string | null;
  complete: string | null;
}

export interface McpTeamContext extends McpWorkspaceTeam {
  workflow_states: McpWorkflowStateRef[];
  default_workflow_state_id: string | null;
  completed_workflow_state_id: string | null;
  workflow_defaults: McpTeamWorkflowDefaults;
}

/** Everything an MCP agent needs in one call — no UUID hunting. */
export interface McpWorkspaceContext {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  teams: McpTeamContext[];
  default_team_id: string | null;
  epic_statuses: McpEpicStatusRef[];
  default_epic_status_id: string | null;
  completed_epic_status_id: string | null;
  labels: McpLabelRef[];
  member_id: string | null;
  members: AssignableMember[];
}

/** Slimmer shape used by the frontend agent chat hydrator. */
export interface AgentWorkspaceContext {
  workspaceId: string;
  teamId: string | null;
  teamName: string | null;
  teamKey: string | null;
  teamSlug: string | null;
  defaultWorkflowStateId: string | null;
  defaultEpicStatusId: string | null;
  completedWorkflowStateId: string | null;
  completedEpicStatusId: string | null;
  teams: McpWorkspaceTeam[];
  workflowStates: WorkflowState[];
  epicStatuses: Array<{ id: string; name: string; category: EpicStatusCategory }>;
}
