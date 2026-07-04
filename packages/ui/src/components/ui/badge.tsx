import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 font-medium tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/10 text-primary',
        secondary:
          'border-transparent bg-white/5 text-muted-foreground',
        outline: 'border-border text-foreground',
        destructive:
          'border-transparent bg-destructive/10 text-destructive',
        statusTodo:
          'border-transparent bg-status-todo/10 text-status-todo',
        statusInProgress:
          'border-transparent bg-status-inProgress/10 text-status-inProgress',
        statusDone:
          'border-transparent bg-status-done/10 text-status-done',
        statusWarning:
          'border-transparent bg-status-warning/10 text-status-warning',
      },
      size: {
        default: 'h-6 text-xs',
        sm: 'h-5 px-1.5 text-[11px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps): React.ReactElement {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
