'use client';

import * as React from 'react';
import Image from 'next/image';
import { Button } from '@landi-flow/ui';
import { cn } from '@landi-flow/ui';

export interface EmptyStateProps {
  heading: string;
  description: string;
  ctaLabel: string;
  onCtaClick?: () => void;
  /** Optional test id for the empty-state CTA (e.g. epic-create-story). */
  ctaTestId?: string;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
}

/** Central empty state per shared-design-system AC-PROG-02. */
export function EmptyState({
  heading,
  description,
  ctaLabel,
  onCtaClick,
  ctaTestId,
  imageSrc,
  imageAlt = '',
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-8 py-16 text-center',
        className,
      )}
    >
      {imageSrc ? (
        <div className="relative mb-6 h-40 w-64 overflow-hidden rounded-lg border border-border opacity-80">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="256px"
          />
        </div>
      ) : null}
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {onCtaClick ? (
        <Button className="mt-6" onClick={onCtaClick} data-testid={ctaTestId}>
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );
}
