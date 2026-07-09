import { isEpicDetailRoute } from '@/lib/route-matchers';

export type InspectorContentVariant = 'slot' | 'story' | 'epic' | 'none';

export interface InspectorContentContext {
  pathname: string;
  hasInspectorSlot: boolean;
  selectedStoryId: string | null;
  selectedEpicId: string | null;
}

export interface InspectorContentResolution {
  hasContent: boolean;
  variant: InspectorContentVariant;
  showStoryInspector: boolean;
  showEpicInspector: boolean;
}

/** Derives whether the right properties pane has engaging content for the current route. */
export function resolveInspectorContent(
  context: InspectorContentContext,
): InspectorContentResolution {
  const onStoriesRoute = context.pathname.includes('/stories');
  const showStoryInspector =
    context.pathname.includes('/inbox') ||
    (onStoriesRoute && !context.selectedStoryId) ||
    (Boolean(context.selectedStoryId) && !onStoriesRoute);

  const showEpicInspector =
    context.pathname.startsWith('/workspace/epics') &&
    !isEpicDetailRoute(context.pathname) &&
    !showStoryInspector;

  if (context.hasInspectorSlot) {
    return {
      hasContent: true,
      variant: 'slot',
      showStoryInspector,
      showEpicInspector,
    };
  }

  if (showStoryInspector && context.selectedStoryId) {
    return {
      hasContent: true,
      variant: 'story',
      showStoryInspector,
      showEpicInspector,
    };
  }

  if (showEpicInspector && context.selectedEpicId) {
    return {
      hasContent: true,
      variant: 'epic',
      showStoryInspector,
      showEpicInspector,
    };
  }

  return {
    hasContent: false,
    variant: 'none',
    showStoryInspector,
    showEpicInspector,
  };
}
