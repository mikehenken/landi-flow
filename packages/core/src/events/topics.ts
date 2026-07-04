/** Domain event topics — namespaced by clone nouns (Epic, Story; never Project). */
export const ENTITY_TOPICS = {
  STORY_CREATED: 'entity.story.created',
  STORY_UPDATED: 'entity.story.updated',
  STORY_STATUS_CHANGED: 'entity.story.status_changed',
  STORY_ASSIGNED: 'entity.story.assigned',
  STORY_DELETED: 'entity.story.deleted',
  EPIC_CREATED: 'entity.epic.created',
  EPIC_UPDATED: 'entity.epic.updated',
  EPIC_ASSIGNED: 'entity.epic.assigned',
  MILESTONE_COMPLETED: 'entity.milestone.completed',
  CYCLE_STARTED: 'entity.cycle.started',
  CYCLE_UPDATED: 'entity.cycle.updated',
  COMMENT_CREATED: 'entity.comment.created',
  WORKSPACE_CREATED: 'entity.workspace.created',
  WORKSPACE_UPDATED: 'entity.workspace.updated',
  VIEW_CREATED: 'entity.view.created',
  VIEW_UPDATED: 'entity.view.updated',
  VIEW_DELETED: 'entity.view.deleted',
} as const;

export const AGENT_TOPICS = {
  SESSION_CREATED: 'agent.session.created',
  SESSION_PROMPTED: 'agent.session.prompted',
  ACTIVITY_EMITTED: 'agent.activity.emitted',
  ACTION_PROPOSED: 'agent.action.proposed',
  ACTION_APPLIED: 'agent.action.applied',
} as const;

export const BILLING_TOPICS = {
  ENTITLEMENT_CHANGED: 'billing.entitlement_changed',
} as const;

export const EXTENSION_TOPICS = {
  INSTALLED: 'extension.installed',
  UNINSTALLED: 'extension.uninstalled',
} as const;

export const WEBHOOK_TOPICS = {
  REGISTERED: 'webhook.registered',
  UPDATED: 'webhook.updated',
  DELETED: 'webhook.deleted',
} as const;

export const SECURITY_TOPICS = {
  PERMISSION_CHANGED: 'security.permission_changed',
} as const;

export const SIGNAL_TOPICS = {
  ATTACHED: 'signal.attached',
} as const;

export const ALL_TOPICS = {
  ...ENTITY_TOPICS,
  ...AGENT_TOPICS,
  ...BILLING_TOPICS,
  ...EXTENSION_TOPICS,
  ...WEBHOOK_TOPICS,
  ...SECURITY_TOPICS,
  ...SIGNAL_TOPICS,
} as const;

export type EntityTopic = (typeof ENTITY_TOPICS)[keyof typeof ENTITY_TOPICS];
export type AgentTopic = (typeof AGENT_TOPICS)[keyof typeof AGENT_TOPICS];
export type DomainTopic =
  | EntityTopic
  | AgentTopic
  | (typeof BILLING_TOPICS)[keyof typeof BILLING_TOPICS]
  | (typeof EXTENSION_TOPICS)[keyof typeof EXTENSION_TOPICS]
  | (typeof WEBHOOK_TOPICS)[keyof typeof WEBHOOK_TOPICS]
  | (typeof SECURITY_TOPICS)[keyof typeof SECURITY_TOPICS]
  | (typeof SIGNAL_TOPICS)[keyof typeof SIGNAL_TOPICS];

export interface OutboxEventPayload {
  workspace_id: string;
  correlation_id: string;
  causation_id?: string;
  [key: string]: unknown;
}
