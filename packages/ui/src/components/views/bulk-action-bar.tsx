import * as React from 'react';
import type { StoryPriority } from '@landi-flow/core/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface BulkActionBarLabels {
  selected: string;
  clearSelection: string;
  setStatus: string;
  setPriority: string;
  delete: string;
}

export interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkStatus: (workflowStateId: string) => void;
  onBulkPriority: (priority: StoryPriority) => void;
  onBulkDelete: () => void;
  statusOptions: Array<{ value: string; label: string }>;
  labels: BulkActionBarLabels;
  className?: string;
}

/** Bottom toolbar for multi-select bulk mutations (CAP-032). */
export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkStatus,
  onBulkPriority,
  onBulkDelete,
  statusOptions,
  labels,
  className,
}: BulkActionBarProps): React.ReactElement | null {
  const [statusId, setStatusId] = React.useState(statusOptions[0]?.value ?? '');
  const [priority, setPriority] = React.useState<StoryPriority>('medium');

  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div
      role="toolbar"
      aria-label={labels.selected}
      data-testid="bulk-action-bar"
      className={cn(
        'fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[min(100vw-2rem,720px)] flex-wrap items-center gap-2 rounded-lg border border-border bg-surface-overlay px-4 py-3 shadow-xl',
        className,
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {selectedCount} {labels.selected}
      </span>

      <select
        value={statusId}
        onChange={(event) => setStatusId(event.target.value)}
        className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
        aria-label={labels.setStatus}
        data-testid="bulk-action-status-select"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => onBulkStatus(statusId)}
        data-testid="bulk-action-apply-status"
      >
        {labels.setStatus}
      </Button>

      <select
        value={priority}
        onChange={(event) => setPriority(event.target.value as StoryPriority)}
        className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
        aria-label={labels.setPriority}
        data-testid="bulk-action-priority-select"
      >
        <option value="none">none</option>
        <option value="low">low</option>
        <option value="medium">medium</option>
        <option value="high">high</option>
        <option value="urgent">urgent</option>
      </select>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => onBulkPriority(priority)}
        data-testid="bulk-action-apply-priority"
      >
        {labels.setPriority}
      </Button>

      <Button
        type="button"
        size="sm"
        variant="destructive"
        onClick={onBulkDelete}
        data-testid="bulk-action-delete"
      >
        {labels.delete}
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="ms-auto"
        onClick={onClearSelection}
        data-testid="bulk-action-clear"
      >
        {labels.clearSelection}
      </Button>
    </div>
  );
}
