'use client';

import * as React from 'react';
import type { AnyExtension } from '@tiptap/core';
import { InstantMarkdownEditor } from '@landi-flow/ui';
import { buildEpicRoomId, buildStoryRoomId } from '@landi-flow/collaboration';
import { useLiveblocksExtension } from '@liveblocks/react-tiptap';
import { CollaborativeRoom } from '@/components/collaboration/collaboration-provider';
import { isMockAuthEnabled } from '@/lib/api/config';
import { isLiveblocksConfigured } from '@/lib/liveblocks/config';
import { isWorkspaceUuid } from '@/lib/workspace/is-workspace-uuid';

export interface CollaborativeDescriptionEditorProps {
  entityType: 'epic' | 'story';
  entityId: string;
  /** Resolved workspace UUID required for Liveblocks rooms; demo ids fall back to solo editor. */
  workspaceId?: string;
  value: string | null;
  onChange?: (markdown: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  variant?: 'default' | 'compact';
  className?: string;
  /** When true, parent already mounted `CollaborativeRoom` for this entity. */
  embedded?: boolean;
  /** Linear-style preview until click (story detail body). */
  previewWhenBlurred?: boolean;
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

/**
 * Liveblocks TipTap extension identity changes every render; keep the first instance
 * so metadata sidebar re-renders do not recreate the TipTap editor (Linear stability).
 */
function useStableLiveblocksExtension(): AnyExtension {
  const liveblocksExtension = useLiveblocksExtension({
    field: 'description',
    comments: false,
    mentions: false,
    // Never pass initialContent here — Liveblocks calls setContent without
    // contentType: 'markdown', which stores raw `#` / `**` as plain text (GEN-3 bug).
    // InstantMarkdownEditor seeds via markdown-aware setContent instead.
  });
  const stableExtensionRef = React.useRef<AnyExtension | null>(null);
  if (stableExtensionRef.current === null) {
    stableExtensionRef.current = liveblocksExtension;
  }
  return stableExtensionRef.current;
}

const CollaborativeEditorInner = React.memo(function CollaborativeEditorInner({
  value,
  onChange,
  placeholder,
  readOnly,
  variant,
  className,
  previewWhenBlurred,
  'aria-label': ariaLabel,
}: Omit<
  CollaborativeDescriptionEditorProps,
  'entityType' | 'entityId' | 'workspaceId' | 'embedded'
>): React.ReactElement {
  const liveblocksExtension = useStableLiveblocksExtension();

  const extraExtensions = React.useMemo(
    () => [liveblocksExtension],
    [liveblocksExtension],
  );

  return (
    <InstantMarkdownEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      variant={variant}
      className={className}
      collaborative
      previewWhenBlurred={previewWhenBlurred}
      extraExtensions={extraExtensions}
      aria-label={ariaLabel}
    />
  );
});

const SoloDescriptionEditor = React.memo(function SoloDescriptionEditor({
  value,
  onChange,
  placeholder,
  readOnly,
  variant,
  className,
  previewWhenBlurred,
  'aria-label': ariaLabel,
}: Omit<
  CollaborativeDescriptionEditorProps,
  'entityType' | 'entityId' | 'workspaceId' | 'embedded'
>): React.ReactElement {
  return (
    <InstantMarkdownEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      readOnly={readOnly}
      variant={variant}
      className={className}
      previewWhenBlurred={previewWhenBlurred}
      aria-label={ariaLabel}
    />
  );
});

/**
 * Description editor with optional Liveblocks co-editing (task-09h) when keys are configured.
 * Falls back to local-only instant markdown when Liveblocks is unavailable.
 *
 * Linear-inspired: editor state is keyed by entity only; sidebar metadata mutations must not
 * remount or re-seed the document.
 */
export const CollaborativeDescriptionEditor = React.memo(function CollaborativeDescriptionEditor({
  entityType,
  entityId,
  workspaceId,
  value,
  onChange,
  placeholder,
  readOnly,
  variant = 'default',
  className,
  embedded = false,
  previewWhenBlurred = false,
  'aria-label': ariaLabel,
}: CollaborativeDescriptionEditorProps): React.ReactElement {
  const resolvedWorkspaceId = isWorkspaceUuid(workspaceId) ? workspaceId : null;
  const useCollaboration =
    isLiveblocksConfigured() &&
    !readOnly &&
    !isMockAuthEnabled() &&
    resolvedWorkspaceId !== null;

  const editorProps = {
    value,
    onChange,
    placeholder,
    readOnly,
    variant,
    className,
    previewWhenBlurred,
    'aria-label': ariaLabel,
  };

  const editor = useCollaboration ? (
    <CollaborativeEditorInner {...editorProps} />
  ) : (
    <SoloDescriptionEditor {...editorProps} />
  );

  if (!useCollaboration || embedded || resolvedWorkspaceId === null) {
    return editor;
  }

  const roomId = buildDescriptionRoomId(entityType, entityId, resolvedWorkspaceId);

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
});
