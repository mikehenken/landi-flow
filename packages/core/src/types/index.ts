/** HITM nomenclature: Epic (never Project), Story (UI), Issue (API alias only). */

export type ActorType = 'human' | 'agent' | 'system';

export type StoryPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

export interface Story {
  id: string;
  workspace_id: string;
  team_id: string;
  epic_id: string | null;
  identifier: string;
  title: string;
  description_md: string | null;
  priority: StoryPriority;
  workflow_state_id: string;
  assignee_user_id: string | null;
  delegate_agent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Epic {
  id: string;
  workspace_id: string;
  name: string;
  description_md: string | null;
  status_category: 'backlog' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CorrelationContext {
  correlation_id: string;
  causation_id?: string;
}
