import type { Story } from '@landi-flow/core/types';
import { storyStore, type StoryDetailFocus } from '@/stores/story-store';
import type { StoryDetailSectionId } from '@/lib/story/story-detail-sections';

export interface OpenStoryModalOptions {
  section?: StoryDetailSectionId;
  highlightedSignalId?: string | null;
}

export function openStoryModal(storyId: string, options?: OpenStoryModalOptions): void {
  const focus: StoryDetailFocus = {
    section: options?.section ?? null,
    highlightedSignalId: options?.highlightedSignalId ?? null,
  };
  storyStore.openStoryDetail(storyId, focus);
}

export function buildStoryModalQueryString(
  story: Pick<Story, 'identifier'>,
  options?: OpenStoryModalOptions,
): string {
  const params = new URLSearchParams();
  params.set('story', story.identifier);
  if (options?.section) {
    params.set('section', options.section);
  }
  if (options?.highlightedSignalId) {
    params.set('signal', options.highlightedSignalId);
  }
  return params.toString();
}

export function resolveStoryIdFromQuery(
  storyParam: string,
  stories: Story[],
): string | null {
  const byId = stories.find((story) => story.id === storyParam);
  if (byId) {
    return byId.id;
  }
  const byIdentifier = stories.find(
    (story) => story.identifier.toLowerCase() === storyParam.toLowerCase(),
  );
  return byIdentifier?.id ?? null;
}
