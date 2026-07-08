'use client';

import * as React from 'react';
import { InstantMarkdownEditor } from '@landi-flow/ui';
import { buildEpicRoomId, buildStoryRoomId } from '@landi-flow/collaboration';
import { useLiveblocksExtension } from '@liveblocks/react-tiptap';
import { CollaborativeRoom } from '@/components/collaboration/collaboration-provider';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';

export interface CollaborativeDescriptionEditorProps {
  entityType: 'epic' | 'story';
  entityId: string;
  workspaceId?: string;
  value: string | null;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
  /** When true, parent already mounted `CollaborativeRoom` for this entity. */
  embedded?: boolean;
  'aria-label'?: string;
}

function buildDescriptionRoomId(
  entityType: 'epic' | 'story',
  entityId: string,
  workspaceId: string,
): string {
  return entityType === 'epic'
    ? buildEpicRoomId(workspaceId, entityId)
    : buildStoryRoomId(workspaceId, entityId);
}

function CollaborativeEditorInner({
  value,
  onChange,
  placeholder,
  readOnly,
  variant,
  className,
  'aria-label': ariaLabel,
}: Omit<
  CollaborativeDescriptionEditorProps,
  'entityType' | 'entityId' | 'workspaceId'
>): React.ReactElement {
  const liveblocksExtension = useLiveblocksExtension({
    field: 'description',
    comments: false,
    mentions: false,
  });

  return (
    <InstantMarkdownEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      variant={variant}
      className={className}
      collaborative
      extraExtensions={[liveblocksExtension]}
      aria-label={ariaLabel}
    />
  );
}

/**
 * Description editor with optional Liveblocks co-editing (task-09h) when keys are configured.
 * Falls back to local-only instant markdown when Liveblocks is unavailable.
 */
export function CollaborativeDescriptionEditor({
  entityType,
  entityId,
  workspaceId = DEMO_WORKSPACE_ID,
  value,
  onChange,
  placeholder,
  readOnly,
  variant = 'default',
  className,
  embedded = false,
  'aria-label': ariaLabel,
}: CollaborativeDescriptionEditorProps): React.ReactElement {
  const useCollaboration = isLiveblocksConfigured() && !readOnly;
  const roomId = buildDescriptionRoomId(entityType, entityId, workspaceId);

  const editor = (
    <CollaborativeEditorInner
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      variant={variant}
      className={className}
      aria-label={ariaLabel}
    />
  );

  if (!useCollaboration) {
    return (
      <InstantMarkdownEditor
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        variant={variant}
        className={className}
        aria-label={ariaLabel}
      />
    );
  }

  if (embedded) {
    return editor;
  }

  return (
    <CollaborativeRoom
      roomId={roomId}
      initialPresence={{
        editingSurface: 'description',
        editingTarget: entityId,
      }}
    >
      {editor}
    </CollaborativeRoom>
  );
}
