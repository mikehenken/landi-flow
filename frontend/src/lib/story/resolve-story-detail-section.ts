import type { ActivityEvent, InboxNotification } from '@landi-flow/core/types';
import { SIGNAL_ATTACHED_EVENT } from '@/lib/story-lifecycle/story-signals';
import type { StoryDetailSectionId } from '@/lib/story/story-detail-sections';

export interface StoryDetailSectionFocus {
  section?: StoryDetailSectionId;
  highlightedSignalId?: string | null;
}

export function resolveSectionFromNotification(
  notification: InboxNotification,
): StoryDetailSectionFocus {
  switch (notification.kind) {
    case 'comment':
    case 'mention':
      return { section: 'comments' };
    case 'delegate':
      return { section: 'signals' };
    case 'followed_update':
    case 'status_changed':
      return { section: 'history' };
    case 'assigned':
    default:
      return {};
  }
}

export function resolveSectionFromActivity(event: ActivityEvent): StoryDetailSectionFocus {
  if (event.event_type === SIGNAL_ATTACHED_EVENT) {
    return { section: 'signals', highlightedSignalId: event.id };
  }

  if (
    event.event_type === 'entity.comment.created' ||
    event.event_type.includes('comment')
  ) {
    return { section: 'comments' };
  }

  if (
    event.event_type.includes('relation') ||
    event.event_type === 'story.relation_added'
  ) {
    return { section: 'relations' };
  }

  if (
    event.event_type.includes('artifact') ||
    event.event_type.includes('attachment')
  ) {
    return { section: 'artifacts' };
  }

  if (event.event_type === 'agent.delegate_assigned') {
    return { section: 'signals' };
  }

  if (
    event.event_type.startsWith('story.') ||
    event.event_type.startsWith('entity.story.')
  ) {
    return { section: 'history' };
  }

  return {};
}
