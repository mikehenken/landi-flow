'use client';

import * as React from 'react';
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
}

/** Wired description field for Epic/Story detail surfaces. */
export function DescriptionEditor({
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
}: DescriptionEditorProps): React.ReactElement {
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = React.useCallback(
    (markdown: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(markdown);
      }, 350);
    },
    [onChange],
  );

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
        aria-label={`${label} editor`}
      />
    </section>
  );
}
