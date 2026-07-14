import type { CreateStoryInput } from '@/stores/story-store';

/**
 * Builds CreateStoryInput for persistCreateStory / createStory.
 * Keeps epic association explicit for epic-scoped create CTAs.
 */
export function buildCreateStoryInput(
  input: CreateStoryInput,
): CreateStoryInput & { epicId: string | null } {
  return {
    ...input,
    epicId: input.epicId ?? null,
  };
}
