'use client';

import * as React from 'react';
import { Check, GitPullRequestArrow, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import type { ApprovalState, ToolFieldDiff } from './types';

export interface ConfirmationProps {
  /** Human-readable summary of what the agent proposes to do. */
  summary: string;
  diff?: ToolFieldDiff[];
  state?: ApprovalState;
  onApprove?: () => void;
  onReject?: () => void;
  approveLabel?: string;
  rejectLabel?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Agent Handoff Queue gate (IDEA-003, the headline governance moat). Every
 * write-capable MCP tool renders inside a Confirmation: the agent's write is a
 * *proposal* with a field-level diff that a human must approve before the Agent
 * Action Bus applies it. No silent agent writes.
 */
export function Confirmation({
  summary,
  diff,
  state = 'pending',
  onApprove,
  onReject,
  approveLabel = 'Approve & apply',
  rejectLabel = 'Reject',
  disabled = false,
  className,
}: ConfirmationProps): React.ReactElement {
  const resolved = state !== 'pending';

  return (
    <div
      className={cn(
        'rounded-md border border-status-warning/30 bg-status-warning/5 p-3',
        state === 'approved' && 'border-status-done/30 bg-status-done/5',
        state === 'rejected' && 'border-status-error/30 bg-status-error/5',
        className,
      )}
      role="group"
      aria-label="Agent handoff approval"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <GitPullRequestArrow className="h-3.5 w-3.5 text-status-warning" />
        <span>Agent proposal — approval required</span>
      </div>
      <p className="mt-1.5 text-sm text-foreground">{summary}</p>

      {diff && diff.length > 0 ? (
        <dl className="mt-2 space-y-1 rounded border border-border bg-background/40 p-2">
          {diff.map((entry) => (
            <div key={entry.field} className="grid grid-cols-[80px_1fr] gap-2 text-xs">
              <dt className="truncate font-medium text-foreground-subtle">{entry.field}</dt>
              <dd className="flex flex-wrap items-center gap-1">
                {entry.before ? (
                  <span className="rounded bg-status-error/10 px-1 py-0.5 font-mono text-status-error line-through">
                    {entry.before}
                  </span>
                ) : (
                  <span className="text-foreground-subtle">—</span>
                )}
                <span aria-hidden className="text-foreground-subtle">
                  →
                </span>
                <span className="rounded bg-status-done/10 px-1 py-0.5 font-mono text-status-done">
                  {entry.after ?? '—'}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {resolved ? (
        <p
          className={cn(
            'mt-2 flex items-center gap-1 text-xs font-medium',
            state === 'approved' ? 'text-status-done' : 'text-status-error',
          )}
        >
          {state === 'approved' ? (
            <>
              <Check className="h-3.5 w-3.5" /> Approved — applied via Agent Action Bus
            </>
          ) : (
            <>
              <X className="h-3.5 w-3.5" /> Rejected — no write was applied
            </>
          )}
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={onApprove} disabled={disabled}>
            <Check className="mr-1 h-3.5 w-3.5" />
            {approveLabel}
          </Button>
          <Button size="sm" variant="ghost" onClick={onReject} disabled={disabled}>
            <X className="mr-1 h-3.5 w-3.5" />
            {rejectLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
