'use client';

import * as React from 'react';
import type { AnyExtension, Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { cn } from '../../lib/utils';
import { createInstantMarkdownExtensions } from './create-instant-markdown-extensions';
import {
  resolveInstantMarkdownInitialContent,
  shouldApplyExternalMarkdownValue,
  shouldSeedCollaborativeMarkdown,
} from './instant-markdown-sync';

/** Route plain-text clipboard paste through markdown parser (input rules do not fire on paste). */
function createMarkdownPasteHandler(
  editorRef: React.RefObject<Editor | null>,
  readOnlyRef: React.RefObject<boolean>,
): NonNullable<Editor['options']['editorProps']>['handlePaste'] {
  return (_view, event) => {
    if (readOnlyRef.current) {
      return false;
    }

    const clipboard = event.clipboardData;
    if (!clipboard) {
      return false;
    }

    const text = clipboard.getData('text/plain');
    const html = clipboard.getData('text/html');
    if (!text || html) {
      return false;
    }

    const editor = editorRef.current;
    if (!editor) {
      return false;
    }

    editor.commands.insertContent(text, { contentType: 'markdown' });
    return true;
  };
}

export interface InstantMarkdownEditorProps {
  /** Markdown source persisted in `description_md`. */
  value: string | null;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  /** Compact layout for inspector panels. */
  variant?: 'default' | 'compact';
  /** When true, disables local undo/redo (Liveblocks owns history). */
  collaborative?: boolean;
  /** Optional extensions injected by the host (e.g. `@liveblocks/react-tiptap`). */
  extraExtensions?: AnyExtension[];
  'aria-label'?: string;
}

/**
 * In-place markdown ↔ rich-text editor.
 * Typing or pasting markdown converts to formatted content instantly (Linear-style).
 */
export function InstantMarkdownEditor({
  value,
  onChange,
  placeholder,
  readOnly = false,
  className,
  variant = 'default',
  collaborative = false,
  extraExtensions,
  'aria-label': ariaLabel = 'Description editor',
}: InstantMarkdownEditorProps): React.ReactElement {
  const lastEmittedRef = React.useRef<string>(value ?? '');
  const persistedMarkdownRef = React.useRef<string>(value ?? '');
  const collaborativeEmitReadyRef = React.useRef<boolean>(!collaborative);
  const collaborativeSeededRef = React.useRef(false);
  const isExternalUpdateRef = React.useRef(false);
  const editorRef = React.useRef<Editor | null>(null);
  const readOnlyRef = React.useRef(readOnly);
  readOnlyRef.current = readOnly;

  React.useEffect(() => {
    persistedMarkdownRef.current = value ?? '';
  }, [value]);

  const extensions = React.useMemo(
    () =>
      createInstantMarkdownExtensions({
        placeholder,
        collaborative,
        extraExtensions,
      }),
    [placeholder, collaborative, extraExtensions],
  );

  const initialContent = resolveInstantMarkdownInitialContent(collaborative, value);

  const editor = useEditor({
    extensions,
    ...(initialContent !== undefined
      ? { content: initialContent, contentType: 'markdown' as const }
      : {}),
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'instant-md-content focus:outline-none',
        'aria-label': ariaLabel,
        spellcheck: 'true',
      },
      handlePaste: createMarkdownPasteHandler(editorRef, readOnlyRef),
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (readOnly || !onChange) {
        return;
      }
      const markdown = currentEditor.getMarkdown();

      if (collaborative && !collaborativeEmitReadyRef.current) {
        const persisted = persistedMarkdownRef.current;
        if (shouldSeedCollaborativeMarkdown(persisted, markdown)) {
          return;
        }
        collaborativeEmitReadyRef.current = true;
      }

      lastEmittedRef.current = markdown;
      onChange(markdown);
    },
  });

  React.useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  React.useEffect(() => {
    if (!editor) {
      return;
    }
    const nextValue = value ?? '';
    if (
      !shouldApplyExternalMarkdownValue(
        collaborative,
        nextValue,
        lastEmittedRef.current,
      )
    ) {
      return;
    }
    isExternalUpdateRef.current = true;
    editor.commands.setContent(nextValue, { contentType: 'markdown', emitUpdate: false });
    lastEmittedRef.current = nextValue;
    isExternalUpdateRef.current = false;
  }, [collaborative, editor, value]);

  React.useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  React.useEffect(() => {
    if (!editor || !collaborative || collaborativeSeededRef.current) {
      return;
    }

    const persisted = persistedMarkdownRef.current;
    const currentMarkdown = editor.getMarkdown();
    if (!shouldSeedCollaborativeMarkdown(persisted, currentMarkdown)) {
      if (currentMarkdown.trim().length > 0) {
        collaborativeEmitReadyRef.current = true;
      }
      return;
    }

    collaborativeSeededRef.current = true;
    editor.commands.setContent(persisted, { contentType: 'markdown', emitUpdate: false });
    lastEmittedRef.current = persisted;
    collaborativeEmitReadyRef.current = true;
  }, [collaborative, editor, value]);

  return (
    <div
      data-testid="instant-markdown-editor"
      className={cn(
        'instant-md-editor rounded-md border border-transparent transition-colors',
        'focus-within:border-border focus-within:bg-surface/40',
        variant === 'compact' && 'instant-md-editor--compact',
        readOnly && 'instant-md-editor--readonly',
        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
