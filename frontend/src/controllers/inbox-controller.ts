import type { ActivityEvent, InboxNotification } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { apiList } from '@/lib/api/client';
import { deriveSeedActivity, deriveSeedNotifications } from '@/lib/inbox/derive-inbox-seed';
import { storyStore } from '@/stores/story-store';
import { inboxStore } from '@/stores/inbox-store';

export async function loadInboxNotifications(workspaceId: string): Promise<InboxNotification[]> {
  if (isMockAuthEnabled()) {
    return deriveSeedNotifications(storyStore.getServerSnapshot().stories);
  }

  return apiList<InboxNotification>(`workspaces/${workspaceId}/inbox/notifications`);
}

export async function loadInboxActivity(workspaceId: string): Promise<ActivityEvent[]> {
  if (isMockAuthEnabled()) {
    return deriveSeedActivity(storyStore.getServerSnapshot().stories);
  }

  return apiList<ActivityEvent>(`workspaces/${workspaceId}/inbox/activity`);
}

export async function hydrateInbox(workspaceId: string): Promise<void> {
  inboxStore.setLoading(true);

  try {
    const [notifications, activity] = await Promise.all([
      loadInboxNotifications(workspaceId),
      loadInboxActivity(workspaceId),
    ]);
    inboxStore.hydrate(notifications, activity);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load inbox';
    inboxStore.setError(message);
    throw error;
  }
}

export function markInboxNotificationRead(notificationId: string): void {
  inboxStore.markNotificationRead(notificationId);
}
