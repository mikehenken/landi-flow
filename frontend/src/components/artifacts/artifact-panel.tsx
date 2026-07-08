'use client';

import * as React from 'react';
import type { StoryArtifact } from '@landi-flow/core/types';
import { Button, cn } from '@landi-flow/ui';
import { ChevronDown, ChevronRight, FileText, Upload } from 'lucide-react';
import {
  buildArtifactTree,
  listArtifactsForEpic,
  listArtifactsForStory,
  uploadUserArtifact,
} from '@/lib/artifacts/artifact-store';

export interface ArtifactPanelProps {
  storyId?: string | null;
  epicId?: string | null;
  className?: string;
}

const KIND_ICONS: Record<string, string> = {
  plan: '📋',
  engineering_signal: '✅',
  user_upload: '📎',
  orchestration_log: '🔄',
  agent_chat_log: '💬',
};

function ArtifactRow({
  artifact,
  nestedArtifacts,
  depth = 0,
}: {
  artifact: StoryArtifact;
  nestedArtifacts?: StoryArtifact[];
  depth?: number;
}): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);
  const [drillDown, setDrillDown] = React.useState(false);

  return (
    <li
      className={cn('rounded-md border border-border bg-surface-elevated/20', depth > 0 && 'ml-4')}
      data-testid="artifact-summary-row"
      data-artifact-kind={artifact.artifact_kind}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2 p-3 text-left"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="text-base" aria-hidden="true">
          {KIND_ICONS[artifact.artifact_kind] ?? <FileText className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{artifact.title}</p>
          <p className="text-xs text-muted-foreground truncate">{artifact.summary}</p>
          <p className="mt-1 text-[10px] uppercase text-foreground-subtle">{artifact.source}</p>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
      </button>

      {expanded ? (
        <div className="border-t border-border px-3 pb-3" data-testid="artifact-expand-panel">
          <p className="text-xs text-muted-foreground mt-2">{artifact.summary}</p>
          {artifact.correlation_id ? (
            <p className="mt-1 font-mono text-[10px] text-foreground-subtle">
              correlation: {artifact.correlation_id}
            </p>
          ) : null}
          {artifact.session_id ? (
            <p className="font-mono text-[10px] text-foreground-subtle">
              session: {artifact.session_id}
            </p>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-2"
            onClick={() => setDrillDown((value) => !value)}
            data-testid="artifact-view-full"
          >
            View full
          </Button>
          {drillDown && artifact.inline_body ? (
            <pre
              className="mt-2 max-h-48 overflow-auto rounded bg-black/30 p-2 text-xs"
              data-testid="artifact-drill-down-body"
            >
              {artifact.inline_body}
            </pre>
          ) : null}
        </div>
      ) : null}

      {nestedArtifacts && nestedArtifacts.length > 0 ? (
        <ul className="space-y-2 pb-2">
          {nestedArtifacts.map((child) => (
            <ArtifactRow key={child.id} artifact={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** ART-001 + IDEA-001 — progressive disclosure artifact panel. */
export function ArtifactPanel({
  storyId,
  epicId,
  className,
}: ArtifactPanelProps): React.ReactElement {
  const [artifacts, setArtifacts] = React.useState<StoryArtifact[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const reload = React.useCallback(() => {
    if (storyId) {
      setArtifacts(listArtifactsForStory(storyId));
    } else if (epicId) {
      setArtifacts(listArtifactsForEpic(epicId));
    } else {
      setArtifacts([]);
    }
  }, [storyId, epicId]);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const tree = React.useMemo(() => buildArtifactTree(artifacts), [artifacts]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await uploadUserArtifact({ storyId: storyId ?? undefined, epicId: epicId ?? undefined }, file);
    reload();
    event.target.value = '';
  };

  return (
    <section
      className={cn('space-y-3', className)}
      data-testid="artifact-panel"
      aria-label="Artifacts"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Artifacts</h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => void handleUpload(event)}
            data-testid="artifact-upload-input"
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            data-testid="artifact-upload-trigger"
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            Upload
          </Button>
        </div>
      </div>

      {tree.length === 0 ? (
        <p className="text-xs text-muted-foreground" data-testid="artifact-empty-state">
          No artifacts yet — agents attach logs automatically when configured.
        </p>
      ) : (
        <ul className="space-y-2">
          {tree.map((node) => (
            <ArtifactRow key={node.id} artifact={node} nestedArtifacts={node.children} />
          ))}
        </ul>
      )}
    </section>
  );
}
