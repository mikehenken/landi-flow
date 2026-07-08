import type { Story } from '@landi-flow/core/types';

export const MOCK_STORY_PATCHES_STORAGE_KEY = 'landi-flow:mock-story-patches';
export const MOCK_STORY_ADDITIONS_STORAGE_KEY = 'landi-flow:mock-story-additions';

type StoryPatchMap = Record<
  string,
  Partial<Pick<Story, 'sort_order' | 'priority' | 'workflow_state_id' | 'milestone_id' | 'cycle_id'>>
>;

function readPatchMap(): StoryPatchMap {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(MOCK_STORY_PATCHES_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as StoryPatchMap;
  } catch {
    return {};
  }
}

function writePatchMap(map: StoryPatchMap): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(MOCK_STORY_PATCHES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

export function applyMockStoryPatches(stories: Story[]): Story[] {
  const patches = readPatchMap();
  const additions = readStoryAdditions();
  const merged = additions.length > 0 ? [...stories, ...additions] : stories;
  if (Object.keys(patches).length === 0) {
    return merged;
  }

  return merged.map((story) => {
    const patch = patches[story.id];
    if (!patch) {
      return story;
    }
    return {
      ...story,
      ...patch,
      updated_at: new Date().toISOString(),
    };
  });
}

export function persistMockStoryPatch(
  storyId: string,
  patch: Partial<Pick<Story, 'sort_order' | 'priority' | 'workflow_state_id' | 'milestone_id' | 'cycle_id'>>,
): void {
  const map = readPatchMap();
  map[storyId] = { ...map[storyId], ...patch };
  writePatchMap(map);
}

export function clearMockStoryPatches(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(MOCK_STORY_PATCHES_STORAGE_KEY);
    window.localStorage.removeItem(MOCK_STORY_ADDITIONS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function readStoryAdditions(): Story[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(MOCK_STORY_ADDITIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Story[]) : [];
  } catch {
    return [];
  }
}

function writeStoryAdditions(stories: Story[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(MOCK_STORY_ADDITIONS_STORAGE_KEY, JSON.stringify(stories));
  } catch {
    // ignore
  }
}

export function persistMockStoryAddition(story: Story): void {
  const additions = readStoryAdditions().filter((row) => row.id !== story.id);
  writeStoryAdditions([...additions, story]);
}
