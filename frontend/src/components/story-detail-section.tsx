'use client';

import * as React from 'react';
import { cn } from '@landi-flow/ui';

export interface StoryDetailSectionProps {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  testId?: string;
  /** Stable DOM id for deep-link scroll targets (e.g. `signals`, `comments`). */
  sectionId?: string;
}

/** Uppercase section header matching Relations / PropertyRow detail styling. */
export function StoryDetailSection({
  title,
  icon,
  actions,
  children,
  className,
  testId,
  sectionId,
}: StoryDetailSectionProps): React.ReactElement {
  return (
    <section
      id={sectionId}
      className={cn('space-y-3 scroll-mt-4', className)}
      data-testid={testId}
      data-story-section={sectionId}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? (
            <span className="shrink-0 text-muted-foreground" aria-hidden>
              {icon}
            </span>
          ) : null}
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </h3>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
