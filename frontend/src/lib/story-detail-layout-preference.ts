/** User preference for story detail surface: inline sidebar vs overlay modal. */
export type StoryDetailLayoutMode = 'sidebar' | 'modal';

export const STORY_DETAIL_LAYOUT_STORAGE_KEY = 'landi-flow:story-detail-layout';

export const DEFAULT_STORY_DETAIL_LAYOUT: StoryDetailLayoutMode = 'modal';

export function isStoryDetailLayoutMode(value: string): value is StoryDetailLayoutMode {
  return value === 'sidebar' || value === 'modal';
}

export function readStoryDetailLayoutPreference(): StoryDetailLayoutMode {
  if (typeof window === 'undefined') {
    return DEFAULT_STORY_DETAIL_LAYOUT;
  }

  try {
    const stored = window.localStorage.getItem(STORY_DETAIL_LAYOUT_STORAGE_KEY);
    if (stored && isStoryDetailLayoutMode(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable (private mode, SSR hydration guard)
  }

  return DEFAULT_STORY_DETAIL_LAYOUT;
}

export function writeStoryDetailLayoutPreference(mode: StoryDetailLayoutMode): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORY_DETAIL_LAYOUT_STORAGE_KEY, mode);
  } catch {
    // Ignore quota / privacy errors
  }
}
