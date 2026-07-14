import { describe, expect, it } from 'vitest';
import { cn } from './utils';
import { createInstantMarkdownExtensions } from '../components/editor/create-instant-markdown-extensions';

describe('cn', () => {
  it('merges class names with tailwind conflict resolution', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
    expect(cn('text-sm', false && 'hidden', 'font-medium')).toBe('text-sm font-medium');
  });
});

describe('createInstantMarkdownExtensions', () => {
  it('returns StarterKit + Markdown stack', () => {
    const extensions = createInstantMarkdownExtensions();
    expect(extensions.length).toBeGreaterThanOrEqual(5);
  });

  it('disables undo/redo in collaborative mode', () => {
    const solo = createInstantMarkdownExtensions({ collaborative: false });
    const collab = createInstantMarkdownExtensions({ collaborative: true });
    expect(collab.length).toBe(solo.length);
  });

  it('appends extra extensions', () => {
    const extra = createInstantMarkdownExtensions({
      extraExtensions: [],
      placeholder: 'Type markdown…',
    });
    expect(extra.length).toBeGreaterThan(0);
  });
});
