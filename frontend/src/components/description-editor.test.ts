import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { shouldPersistDescriptionMarkdownChange } from '../../../packages/ui/src/components/editor/instant-markdown-sync';

/**
 * DescriptionEditor debounce + persist guard behavior (unit-level).
 * Full TipTap rendering is covered by instant-markdown-sync tests and e2e.
 */
describe('DescriptionEditor persist guard integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounced handler respects shouldPersistDescriptionMarkdownChange', () => {
    const onChange = vi.fn();
    const valueRef = { current: '# Session summary' as string | null };
    const lastEmittedRef = { current: '# Session summary' };
    const debounceRef: { current: ReturnType<typeof setTimeout> | null } = {
      current: null,
    };

    const handleChange = (markdown: string): void => {
      if (
        !shouldPersistDescriptionMarkdownChange(
          valueRef.current,
          markdown,
          lastEmittedRef.current,
        )
      ) {
        return;
      }
      lastEmittedRef.current = markdown;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(markdown);
      }, 350);
    };

    handleChange('');
    vi.advanceTimersByTime(400);
    expect(onChange).not.toHaveBeenCalled();

    handleChange('Edited');
    vi.advanceTimersByTime(400);
    expect(onChange).toHaveBeenCalledWith('Edited');
  });
});
