/** Domain event topics — namespaced by clone nouns (Epic, Story, not Project). */
export const ENTITY_TOPICS = {
  STORY_CREATED: 'entity.story.created',
  STORY_UPDATED: 'entity.story.updated',
  STORY_STATUS_CHANGED: 'entity.story.status_changed',
  EPIC_CREATED: 'entity.epic.created',
  EPIC_UPDATED: 'entity.epic.updated',
  MILESTONE_COMPLETED: 'entity.milestone.completed',
  CYCLE_UPDATED: 'entity.cycle.updated',
  COMMENT_CREATED: 'entity.comment.created',
} as const;

export const AGENT_TOPICS = {
  SESSION_CREATED: 'agent.session.created',
  ACTIVITY_EMITTED: 'agent.activity.emitted',
  ACTION_PROPOSED: 'agent.action.proposed',
  ACTION_APPLIED: 'agent.action.applied',
} as const;

export type EntityTopic = (typeof ENTITY_TOPICS)[keyof typeof ENTITY_TOPICS];
export type AgentTopic = (typeof AGENT_TOPICS)[keyof typeof AGENT_TOPICS];
export type DomainTopic = EntityTopic | AgentTopic;

export interface OutboxEventPayload {
  workspace_id: string;
  correlation_id: string;
  causation_id?: string;
  [key: string]: unknown;
}
