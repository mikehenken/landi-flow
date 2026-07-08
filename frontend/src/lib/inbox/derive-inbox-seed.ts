import type {
  ActivityEvent,
  InboxNotification,
  Story,
} from '@landi-flow/core/types';
import { CURRENT_USER } from '@/lib/agent-roster';
import { SEED_STORIES } from '@/lib/seed-data';

function buildAssignedNotification(story: Story): InboxNotification {
  return {
    id: `notif-assigned-${story.id}`,
    workspace_id: story.workspace_id,
    kind: 'assigned',
    story_id: story.id,
    epic_id: story.epic_id,
    story_identifier: story.identifier,
    story_title: story.title,
    actor_type: 'human',
    actor_user_id: story.creator_id,
    actor_agent_id: null,
    actor_name: story.creator_id === CURRENT_USER.id ? 'You' : 'Alex Chen',
    summary: `Assigned to you: ${story.identifier} — ${story.title}`,
    read: false,
    created_at: story.updated_at,
  };
}

function buildFollowedNotification(story: Story): InboxNotification {
  return {
    id: `notif-followed-${story.id}`,
    workspace_id: story.workspace_id,
    kind: 'followed_update',
    story_id: story.id,
    epic_id: story.epic_id,
    story_identifier: story.identifier,
    story_title: story.title,
    actor_type: 'human',
    actor_user_id: story.creator_id,
    actor_agent_id: null,
    actor_name: story.creator_id === CURRENT_USER.id ? 'You' : 'Alex Chen',
    summary: `${story.identifier} updated on a Story you follow`,
    read: false,
    created_at: story.updated_at,
  };
}

function buildDelegateNotification(story: Story): InboxNotification {
  return {
    id: `notif-delegate-${story.id}`,
    workspace_id: story.workspace_id,
    kind: 'delegate',
    story_id: story.id,
    epic_id: story.epic_id,
    story_identifier: story.identifier,
    story_title: story.title,
    actor_type: 'agent',
    actor_user_id: null,
    actor_agent_id: story.delegate_agent_id,
    actor_name: 'Cursor Agent',
    summary: `Agent delegate active on ${story.identifier}`,
    read: true,
    created_at: story.updated_at,
  };
}

function buildActivityFromStory(story: Story): ActivityEvent[] {
  const events: ActivityEvent[] = [
    {
      id: `activity-created-${story.id}`,
      workspace_id: story.workspace_id,
      story_id: story.id,
      epic_id: story.epic_id,
      story_identifier: story.identifier,
      story_title: story.title,
      actor_type: 'human',
      actor_user_id: story.creator_id,
      actor_agent_id: null,
      actor_name: story.creator_id === CURRENT_USER.id ? 'You' : 'Alex Chen',
      event_type: 'story.created',
      payload: { identifier: story.identifier },
      correlation_id: story.correlation_id,
      created_at: story.created_at,
    },
  ];

  if (story.updated_at !== story.created_at) {
    events.push({
      id: `activity-updated-${story.id}`,
      workspace_id: story.workspace_id,
      story_id: story.id,
      epic_id: story.epic_id,
      story_identifier: story.identifier,
      story_title: story.title,
      actor_type: story.delegate_agent_id ? 'agent' : 'human',
      actor_user_id: story.delegate_agent_id ? null : story.assignee_id,
      actor_agent_id: story.delegate_agent_id,
      actor_name: story.delegate_agent_id ? 'Cursor Agent' : 'You',
      event_type: 'story.updated',
      payload: {
        identifier: story.identifier,
        workflow_state_id: story.workflow_state_id,
        ...(story.id === 'story-002'
          ? {
              previous_description_md:
                'Cmd+K palette shows contextual suggested actions when query is empty.',
            }
          : {}),
      },
      correlation_id: story.correlation_id,
      created_at: story.updated_at,
    });
  }

  if (story.delegate_agent_id) {
    events.push({
      id: `activity-delegate-${story.id}`,
      workspace_id: story.workspace_id,
      story_id: story.id,
      epic_id: story.epic_id,
      story_identifier: story.identifier,
      story_title: story.title,
      actor_type: 'agent',
      actor_user_id: null,
      actor_agent_id: story.delegate_agent_id,
      actor_name: 'Cursor Agent',
      event_type: 'agent.delegate_assigned',
      payload: { identifier: story.identifier },
      correlation_id: story.correlation_id,
      created_at: story.updated_at,
    });
  }

  return events;
}

export function deriveSeedNotifications(stories: Story[] = SEED_STORIES): InboxNotification[] {
  const notifications: InboxNotification[] = [];

  for (const story of stories) {
    if (story.assignee_id === CURRENT_USER.id) {
      notifications.push(buildAssignedNotification(story));
      if (story.delegate_agent_id) {
        notifications.push(buildDelegateNotification(story));
      }
    }

    if (
      story.follower_ids.includes(CURRENT_USER.id) &&
      story.assignee_id !== CURRENT_USER.id
    ) {
      notifications.push(buildFollowedNotification(story));
    }
  }

  return notifications.sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}

export function deriveSeedActivity(stories: Story[] = SEED_STORIES): ActivityEvent[] {
  const events = stories.flatMap((story) => buildActivityFromStory(story));
  return events.sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  );
}
