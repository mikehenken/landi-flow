'use client';

import * as React from 'react';
import { Circle, CircleCheck, CircleDot, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TaskStatus = 'pending' | 'active' | 'done';

export interface TaskItem {
  id: string;
  label: string;
  status: TaskStatus;
}

export interface PlanProps {
  title?: string;
  tasks: TaskItem[];
  className?: string;
}

/**
 * Multi-step agent plan (AI Elements `Plan` / `Task`). Visualizes a delegated
 * agent run as an ordered checklist so a human can watch the agent work in
 * real time.
 */
export function Plan({
  title = 'Agent plan',
  tasks,
  className,
}: PlanProps): React.ReactElement {
  const done = tasks.filter((task) => task.status === 'done').length;
  return (
    <div className={cn('rounded-md border border-border bg-surface/60 p-3', className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <ListChecks className="h-3.5 w-3.5 text-primary" />
        <span>{title}</span>
        <span className="ml-auto font-mono text-foreground-subtle">
          {done}/{tasks.length}
        </span>
      </div>
      <ol className="mt-2 space-y-1.5">
        {tasks.map((task) => (
          <Task key={task.id} item={task} />
        ))}
      </ol>
    </div>
  );
}

export function Task({ item }: { item: TaskItem }): React.ReactElement {
  return (
    <li className="flex items-center gap-2 text-xs">
      <TaskIcon status={item.status} />
      <span
        className={cn(
          item.status === 'done' && 'text-muted-foreground line-through',
          item.status === 'active' && 'font-medium text-foreground',
          item.status === 'pending' && 'text-muted-foreground',
        )}
      >
        {item.label}
      </span>
    </li>
  );
}

function TaskIcon({ status }: { status: TaskStatus }): React.ReactElement {
  if (status === 'done') {
    return <CircleCheck className="h-3.5 w-3.5 shrink-0 text-status-done" />;
  }
  if (status === 'active') {
    return <CircleDot className="h-3.5 w-3.5 shrink-0 animate-agent-pulse text-primary" />;
  }
  return <Circle className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />;
}
