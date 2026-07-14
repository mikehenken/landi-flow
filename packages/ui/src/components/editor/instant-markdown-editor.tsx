'use client';

import * as React from 'react';
import type { AnyExtension, Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { cn } from '../../lib/utils';
import { createInstantMarkdownExtensions } from './create-instant-markdown-extensions';
import {
  resolveInstantMarkdownInitialContent,
  shouldApplyExternalMarkdownValue,
  shouldReparseCollaborativePlaintext,
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
  /**
   * Linear-style: show formatted preview until click; blur returns to preview.
   * Metadata sidebar edits do not toggle this — only focus does.
   */
  previewWhenBlurred?: boolean;
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
  previewWhenBlurred = false,
  'aria-label': ariaLabel = 'Description editor',
}: InstantMarkdownEditorProps): React.ReactElement {
  const lastEmittedRef = React.useRef<string>(value ?? '');
  const persistedMarkdownRef = React.useRef<string>(value ?? '');
  const collaborativeEmitReadyRef = React.useRef<boolean>(!collaborative);
  const collaborativeSeededRef = React.useRef(false);
  const collaborativeReparsedRef = React.useRef(false);
  const editorRef = React.useRef<Editor | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const readOnlyRef = React.useRef(readOnly);
  const isEditingRef = React.useRef(isEditing);
  const previewWhenBlurredRef = React.useRef(previewWhenBlurred);
  const extraExtensionsRef = React.useRef<AnyExtension[] | undefined>(extraExtensions);

  readOnlyRef.current = readOnly;
  isEditingRef.current = isEditing;
  previewWhenBlurredRef.current = previewWhenBlurred;

  React.useEffect(() => {
    persistedMarkdownRef.current = value ?? '';
  }, [value]);

  if (extraExtensions !== undefined) {
    extraExtensionsRef.current = extraExtensions;
  }

  const extensions = React.useMemo(
    () =>
      createInstantMarkdownExtensions({
        placeholder,
        collaborative,
        extraExtensions: extraExtensionsRef.current,
      }),
    // Liveblocks extension identity changes every render; ref keeps TipTap stable (Linear-style).
    [placeholder, collaborative],
  );

  const initialContent = resolveInstantMarkdownInitialContent(collaborative, value);
  const effectiveReadOnly = readOnly || (previewWhenBlurred && !isEditing);

  const editor = useEditor({
    extensions,
    ...(initialContent !== undefined
      ? { content: initialContent, contentType: 'markdown' as const }
      : {}),
    editable: !effectiveReadOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'instant-md-content focus:outline-none',
        'aria-label': ariaLabel,
        spellcheck: 'true',
      },
      handlePaste: createMarkdownPasteHandler(editorRef, readOnlyRef),
      handleDOMEvents: {
        blur: () => {
          if (previewWhenBlurred && !readOnly) {
            setIsEditing(false);
          }
          return false;
        },
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const isReadOnly =
        readOnlyRef.current ||
        (previewWhenBlurredRef.current && !isEditingRef.current);
      if (isReadOnly || !onChange) {
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
    editor.commands.setContent(nextValue, { contentType: 'markdown', emitUpdate: false });
    lastEmittedRef.current = nextValue;
  }, [collaborative, editor, value]);

  React.useEffect(() => {
    if (!editor) {
      return;
    }
    editor.setEditable(!effectiveReadOnly);
  }, [editor, effectiveReadOnly]);

  const applyCollaborativeMarkdown = React.useCallback(
    (markdown: string): void => {
      if (!editor) {
        return;
      }
      editor.commands.setContent(markdown, { contentType: 'markdown', emitUpdate: false });
      lastEmittedRef.current = markdown;
      collaborativeEmitReadyRef.current = true;
    },
    [editor],
  );

  React.useEffect(() => {
    if (!editor || !collaborative) {
      return;
    }

    const persisted = persistedMarkdownRef.current;
    const currentMarkdown = editor.getMarkdown();

    if (
      !collaborativeReparsedRef.current &&
      shouldReparseCollaborativePlaintext(persisted, currentMarkdown)
    ) {
      collaborativeReparsedRef.current = true;
      collaborativeSeededRef.current = true;
      applyCollaborativeMarkdown(persisted);
      return;
    }

    if (collaborativeSeededRef.current) {
      return;
    }

    if (!shouldSeedCollaborativeMarkdown(persisted, currentMarkdown)) {
      if (currentMarkdown.trim().length > 0) {
        collaborativeEmitReadyRef.current = true;
      }
      return;
    }

    collaborativeSeededRef.current = true;
    applyCollaborativeMarkdown(persisted);
  }, [applyCollaborativeMarkdown, collaborative, editor, value]);

  const handlePreviewActivate = React.useCallback((): void => {
    if (!previewWhenBlurred || readOnly || isEditing) {
      return;
    }
    setIsEditing(true);
    queueMicrotask(() => {
      editorRef.current?.commands.focus('end');
    });
  }, [isEditing, previewWhenBlurred, readOnly]);

  return (
    <div
      data-testid="instant-markdown-editor"
      data-editing={isEditing ? 'true' : 'false'}
      className={cn(
        'instant-md-editor rounded-md border border-transparent transition-colors',
        'focus-within:border-border focus-within:bg-surface/40',
        variant === 'compact' && 'instant-md-editor--compact',
        effectiveReadOnly && 'instant-md-editor--readonly',
        previewWhenBlurred && !isEditing && 'instant-md-editor--preview cursor-text',
        className,
      )}
      onMouseDown={(event) => {
        if (event.button !== 0) {
          return;
        }
        handlePreviewActivate();
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
