import { describe, expect, it } from 'vitest';
import { resolveInspectorContent } from '@/lib/shell-inspector-content';

describe('resolveInspectorContent', () => {
  it('shows content when a custom inspector slot is provided', () => {
    const result = resolveInspectorContent({
      pathname: '/workspace/agents',
      hasInspectorSlot: true,
      selectedStoryId: null,
      selectedEpicId: null,
    });

    expect(result).toMatchObject({
      hasContent: true,
      variant: 'slot',
    });
  });

  it('hides content on inbox without a selected story', () => {
    const result = resolveInspectorContent({
      pathname: '/workspace/inbox',
      hasInspectorSlot: false,
      selectedStoryId: null,
      selectedEpicId: null,
    });

    expect(result).toMatchObject({
      hasContent: false,
      variant: 'none',
      showStoryInspector: true,
    });
  });

  it('shows story content on inbox when a story is selected', () => {
    const result = resolveInspectorContent({
      pathname: '/workspace/inbox',
      hasInspectorSlot: false,
      selectedStoryId: 'story-1',
      selectedEpicId: null,
    });

    expect(result).toMatchObject({
      hasContent: true,
      variant: 'story',
    });
  });

  it('hides content on stories list without selection', () => {
    const result = resolveInspectorContent({
      pathname: '/workspace/stories',
      hasInspectorSlot: false,
      selectedStoryId: null,
      selectedEpicId: null,
    });

    expect(result).toMatchObject({
      hasContent: false,
      variant: 'none',
      showStoryInspector: true,
    });
  });

  it('hides story inspector on stories routes when a story is selected', () => {
    const result = resolveInspectorContent({
      pathname: '/workspace/stories/board',
      hasInspectorSlot: false,
      selectedStoryId: 'story-1',
      selectedEpicId: null,
    });

    expect(result).toMatchObject({
      hasContent: false,
      variant: 'none',
      showStoryInspector: false,
    });
  });

  it('shows epic content on epic board when an epic is selected', () => {
    const result = resolveInspectorContent({
      pathname: '/workspace/epics',
      hasInspectorSlot: false,
      selectedStoryId: null,
      selectedEpicId: 'epic-1',
    });

    expect(result).toMatchObject({
      hasContent: true,
      variant: 'epic',
      showEpicInspector: true,
    });
  });

  it('hides content on settings-like routes', () => {
    const result = resolveInspectorContent({
      pathname: '/workspace/settings/general',
      hasInspectorSlot: false,
      selectedStoryId: null,
      selectedEpicId: null,
    });

    expect(result).toMatchObject({
      hasContent: false,
      variant: 'none',
    });
  });
});
