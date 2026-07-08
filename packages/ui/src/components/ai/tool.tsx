'use client';

import * as React from 'react';
import {
  AlertTriangle,
  ChevronRight,
  CircleCheck,
  Loader2,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolState } from './types';

export interface ToolProps {
  toolName: string;
  title?: string;
  state: ToolState;
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
  /** Marks an MCP write tool (renders a governance hint). */
  isWrite?: boolean;
  defaultOpen?: boolean;
  className?: string;
  /** Slot rendered below the output — used to inject the Confirmation gate. */
  children?: React.ReactNode;
}

const STATE_META: Record<
  ToolState,
  { label: string; className: string; icon: React.ReactNode }
> = {
  'input-streaming': {
    label: 'Preparing',
    className: 'text-status-warning',
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  'input-available': {
    label: 'Ready',
    className: 'text-status-inProgress',
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  'output-available': {
    label: 'Completed',
    className: 'text-status-done',
    icon: <CircleCheck className="h-3.5 w-3.5" />,
  },
  'output-error': {
    label: 'Errored',
    className: 'text-status-error',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

/**
 * Renders an MCP tool invocation in-thread, driven by the AI SDK `ToolUIPart`
 * state machine (input-streaming → input-available → output-available |
 * output-error). Because MCP tools surface as ordinary `tool-*` message parts,
 * this one component renders every MCP call with no per-tool glue.
 */
export function Tool({
  toolName,
  title,
  state,
  input,
  output,
  errorText,
  isWrite = false,
  defaultOpen,
  className,
  children,
}: ToolProps): React.ReactElement {
  const [open, setOpen] = React.useState(
    defaultOpen ?? state === 'output-error' ? true : false,
  );
  const meta = STATE_META[state];

  return (
    <div className={cn('rounded-md border border-border bg-surface/60', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs"
      >
        <Wrench className="h-3.5 w-3.5 text-foreground-subtle" />
        <span className="font-mono font-medium text-foreground">{title ?? toolName}</span>
        {isWrite ? (
          <span className="rounded-sm bg-status-warning/15 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-status-warning">
            Write
          </span>
        ) : null}
        <span className={cn('ml-auto flex items-center gap-1', meta.className)}>
          {meta.icon}
          <span>{meta.label}</span>
        </span>
        <ChevronRight
          className={cn('h-3.5 w-3.5 text-foreground-subtle transition-transform', open && 'rotate-90')}
        />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border px-3 py-2">
          {input && Object.keys(input).length > 0 ? (
            <ToolBlock label="Input">
              <CodeJson value={input} />
            </ToolBlock>
          ) : null}
          {state === 'output-available' && output !== undefined ? (
            <ToolBlock label="Output">
              <CodeJson value={output} />
            </ToolBlock>
          ) : null}
          {state === 'output-error' ? (
            <ToolBlock label="Error">
              <p className="font-mono text-xs text-status-error">
                {errorText ?? 'Tool execution failed.'}
              </p>
            </ToolBlock>
          ) : null}
          {children}
        </div>
      ) : null}
    </div>
  );
}

function ToolBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-foreground-subtle">
        {label}
      </p>
      {children}
    </div>
  );
}

function CodeJson({ value }: { value: unknown }): React.ReactElement {
  const text = React.useMemo(() => {
    try {
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <pre className="overflow-x-auto rounded bg-black/30 p-2 font-mono text-[11px] leading-relaxed text-foreground">
      <code>{text}</code>
    </pre>
  );
}
