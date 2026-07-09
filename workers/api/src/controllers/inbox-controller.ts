import type {
  ActivityEvent,
  ActorType,
  InboxNotification,
  InboxNotificationKind,
  Story,
} from '@landi-flow/core/types';
import type { DbClient } from '../lib/db.js';
import { BaseController } from './base-controller.js';

interface DbActivityRow {
  id: string;
  workspace_id: string;
  story_id: string | null;
  epic_id: string | null;
  actor_type: ActorType;
  actor_user_id: string | null;
  actor_agent_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  correlation_id: string | null;
  created_at: string;
}

interface StoryContextRow {
  id: string;
  identifier: string;
  title: string;
}

const DEFAULT_LIMIT = 50;

async function resolveActorNames(
  db: DbClient,
  workspaceId: string,
  rows: Array<{ actor_user_id: string | null; actor_agent_id: string | null }>,
): Promise<Map<string, string>> {
  const userIds = new Set<string>();
  const agentIds = new Set<string>();

  for (const row of rows) {
    if (row.actor_user_id) {
      userIds.add(row.actor_user_id);
    }
    if (row.actor_agent_id) {
      agentIds.add(row.actor_agent_id);
    }
  }

  const names = new Map<string, string>();

  if (userIds.size > 0) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, display_name, email')
      .in('id', [...userIds]);

    for (const profile of profiles ?? []) {
      const row = profile as { id: string; display_name: string | null; email: string | null };
      names.set(row.id, row.display_name?.trim() || row.email || 'Teammate');
    }
  }

  if (agentIds.size > 0) {
    const { data: agents } = await db
      .from('agents')
      .select('id, display_name')
      .eq('workspace_id', workspaceId)
      .in('id', [...agentIds]);

    for (const agent of agents ?? []) {
      const row = agent as { id: string; display_name: string };
      names.set(row.id, row.display_name);
    }
  }

  return names;
}

function resolveActorName(
  names: Map<string, string>,
  actorUserId: string | null,
  actorAgentId: string | null,
): string | null {
  if (actorUserId) {
    return names.get(actorUserId) ?? 'Teammate';
  }
  if (actorAgentId) {
    return names.get(actorAgentId) ?? 'Agent';
  }
  return null;
}

function buildAssignedNotification(story: Story, read: boolean): InboxNotification {
  return {
    id: `notif-assigned-${story.id}`,
    workspace_id: story.workspace_id,
    kind: 'assigned',
    story_id: story.id,
    epic_id: story.epic_id,
    story_identifier: story.identifier,
    story_title: story.title,
    actor_type: 'system',
    actor_user_id: null,
    actor_agent_id: null,
    actor_name: null,
    summary: `Assigned to you: ${story.identifier} — ${story.title}`,
    read,
    created_at: story.updated_at,
  };
}

function buildStatusNotification(story: Story, read: boolean): InboxNotification {
  return {
    id: `notif-status-${story.id}-${story.updated_at}`,
    workspace_id: story.workspace_id,
    kind: 'status_changed',
    story_id: story.id,
    epic_id: story.epic_id,
    story_identifier: story.identifier,
    story_title: story.title,
    actor_type: 'system',
    actor_user_id: null,
    actor_agent_id: null,
    actor_name: null,
    summary: `${story.identifier} was updated`,
    read,
    created_at: story.updated_at,
  };
}

function buildDelegateNotification(story: Story, read: boolean): InboxNotification {
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
    actor_name: null,
    summary: `Agent delegate active on ${story.identifier}`,
    read,
    created_at: story.updated_at,
  };
}

function notificationKindPriority(kind: InboxNotificationKind): number {
  switch (kind) {
    case 'assigned':
      return 0;
    case 'delegate':
      return 1;
    case 'status_changed':
      return 2;
    default:
      return 3;
  }
}

async function mapActivityRows(
  db: DbClient,
  workspaceId: string,
  rows: DbActivityRow[],
  storyContext?: StoryContextRow,
): Promise<ActivityEvent[]> {
  const storyIds = [...new Set(rows.map((row) => row.story_id).filter(Boolean))] as string[];

  let storiesById = new Map<string, StoryContextRow>();
  if (storyContext) {
    storiesById.set(storyContext.id, storyContext);
  }
  const unresolvedStoryIds = storyIds.filter((id) => !storiesById.has(id));
  if (unresolvedStoryIds.length > 0) {
    const { data: stories, error: storyError } = await db
      .from('stories')
      .select('id, identifier, title')
      .eq('workspace_id', workspaceId)
      .in('id', unresolvedStoryIds);

    if (storyError) {
      throw new Error(`Failed to resolve story context for activity: ${storyError.message}`);
    }

    for (const story of (stories ?? []) as StoryContextRow[]) {
      storiesById.set(story.id, story);
    }
  }

  const actorNames = await resolveActorNames(db, workspaceId, rows);

  return rows.map((row) => {
    const story = row.story_id ? storiesById.get(row.story_id) : undefined;
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      story_id: row.story_id,
      epic_id: row.epic_id,
      story_identifier: story?.identifier ?? null,
      story_title: story?.title ?? null,
      actor_type: row.actor_type,
      actor_user_id: row.actor_user_id,
      actor_agent_id: row.actor_agent_id,
      actor_name: resolveActorName(actorNames, row.actor_user_id, row.actor_agent_id),
      event_type: row.event_type,
      payload: row.payload ?? {},
      correlation_id: row.correlation_id,
      created_at: row.created_at,
    };
  });
}

export class InboxController extends BaseController {
  /** CAP-015: workspace-wide chronological activity feed. */
  async listActivity(workspaceId: string, limit = DEFAULT_LIMIT): Promise<ActivityEvent[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('activity_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list activity events: ${error.message}`);
    }

    return mapActivityRows(this.db, workspaceId, (data ?? []) as DbActivityRow[]);
  }

  /** MCP-IDE-003: story-scoped activity (includes engineering signals). */
  async listStoryActivity(
    workspaceId: string,
    storyId: string,
    limit = DEFAULT_LIMIT,
  ): Promise<ActivityEvent[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data: story, error: storyError } = await this.db
      .from('stories')
      .select('id, identifier, title')
      .eq('workspace_id', workspaceId)
      .eq('id', storyId)
      .maybeSingle();

    if (storyError) {
      throw new Error(`Failed to resolve story for activity: ${storyError.message}`);
    }
    if (!story) {
      throw new Error(`Story not found: ${storyId}`);
    }

    const { data, error } = await this.db
      .from('activity_events')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('story_id', storyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list story activity events: ${error.message}`);
    }

    return mapActivityRows(this.db, workspaceId, (data ?? []) as DbActivityRow[], story as StoryContextRow);
  }

  /** CAP-035: inbox notifications for the current user (assignments + updates). */
  async listNotifications(workspaceId: string, limit = DEFAULT_LIMIT): Promise<InboxNotification[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('stories')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('assignee_id', this.userId)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list inbox notifications: ${error.message}`);
    }

    const assignedStories = (data ?? []) as Story[];
    const notifications: InboxNotification[] = [];

    for (const story of assignedStories) {
      notifications.push(buildAssignedNotification(story, false));

      if (story.updated_at !== story.created_at) {
        notifications.push(buildStatusNotification(story, false));
      }

      if (story.delegate_agent_id) {
        notifications.push(buildDelegateNotification(story, false));
      }
    }

    notifications.sort((left, right) => {
      const timeDelta = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      if (timeDelta !== 0) {
        return timeDelta;
      }
      return notificationKindPriority(left.kind) - notificationKindPriority(right.kind);
    });

    return notifications.slice(0, limit);
  }
}
