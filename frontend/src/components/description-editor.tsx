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
  className?: string;
  label?: string;
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
  className,
  label = 'Description',
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
    <section className={className} aria-label={label}>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-foreground-subtle">
        {label}
      </h4>
      <CollaborativeDescriptionEditor
        workspaceId={workspaceId}
        entityType={entityType}
        entityId={entityId}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        variant={variant}
        aria-label={`${label} editor`}
      />
    </section>
  );
}
