import type { AnyExtension } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Underline from '@tiptap/extension-underline';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

export interface CreateInstantMarkdownExtensionsOptions {
  placeholder?: string;
  /** Disable local undo/redo when Liveblocks owns history. */
  collaborative?: boolean;
  /** Additional extensions (e.g. Liveblocks). */
  extraExtensions?: AnyExtension[];
}

/** Shared Tiptap extension stack for instant markdown ↔ rich-text editing. */
export function createInstantMarkdownExtensions(
  options: CreateInstantMarkdownExtensionsOptions = {},
): AnyExtension[] {
  const { placeholder, collaborative = false, extraExtensions = [] } = options;

  return [
    StarterKit.configure({
      undoRedo: collaborative ? false : undefined,
      link: false,
      underline: false,
    }),
    Markdown,
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        class: 'instant-md-link',
      },
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure({
      placeholder: placeholder ?? 'Write markdown or paste it — it renders instantly…',
      emptyEditorClass: 'instant-md-empty',
    }),
    ...extraExtensions,
  ];
}
