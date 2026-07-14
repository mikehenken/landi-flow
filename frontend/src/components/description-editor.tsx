'use client';

import * as React from 'react';
import { shouldPersistDescriptionMarkdownChange } from '@landi-flow/ui';
import { CollaborativeDescriptionEditor } from '@/components/collaborative-description-editor';

export interface DescriptionEditorProps {
  workspaceId: string;
  entityType: 'epic' | 'story';
  entityId: string;
  value: string | null;
  onChange: (markdown: string) => void;
  placeholder?: string;
  variant?: 'default' | 'compact';
  sectionClassName?: string;
  editorClassName?: string;
  label?: string;
  showLabel?: boolean;
  embeddedCollaboration?: boolean;
  /** Linear-style formatted preview until the field is clicked. */
  previewWhenBlurred?: boolean;
}

/**
 * Wired description field for Epic/Story detail surfaces.
 * Debounced save + persist guard isolate the body from spurious Liveblocks hydration.
 */
export const DescriptionEditor = React.memo(function DescriptionEditor({
  workspaceId,
  entityType,
  entityId,
  value,
  onChange,
  placeholder,
  variant = 'default',
  sectionClassName,
  editorClassName,
  label = 'Description',
  showLabel = true,
  embeddedCollaboration = false,
  previewWhenBlurred = false,
}: DescriptionEditorProps): React.ReactElement {
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = React.useRef(onChange);
  const valueRef = React.useRef(value);
  const lastEmittedRef = React.useRef(value ?? '');

  onChangeRef.current = onChange;
  valueRef.current = value;

  const handleChange = React.useCallback((markdown: string) => {
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
      onChangeRef.current(markdown);
    }, 350);
  }, []);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <section className={sectionClassName} aria-label={label}>
      {showLabel ? (
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
          {label}
        </h4>
      ) : null}
      <CollaborativeDescriptionEditor
        key={`${entityType}:${entityId}`}
        workspaceId={workspaceId}
        entityType={entityType}
        entityId={entityId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        variant={variant}
        className={editorClassName}
        embedded={embeddedCollaboration}
        previewWhenBlurred={previewWhenBlurred}
        aria-label={`${label} editor`}
      />
    </section>
  );
});
