/** Stable anchor ids for story detail modal sections (deep links from inbox / activity). */
export type StoryDetailSectionId =
  | 'signals'
  | 'comments'
  | 'artifacts'
  | 'relations'
  | 'history';

export const STORY_DETAIL_SECTION_IDS: readonly StoryDetailSectionId[] = [
  'signals',
  'comments',
  'artifacts',
  'relations',
  'history',
] as const;

export function isStoryDetailSectionId(value: string): value is StoryDetailSectionId {
  return (STORY_DETAIL_SECTION_IDS as readonly string[]).includes(value);
}

export function scrollToStoryDetailSection(sectionId: StoryDetailSectionId): void {
  if (typeof document === 'undefined') {
    return;
  }
  const element = document.getElementById(sectionId);
  element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
