'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden border border-border',
  {
    variants: {
      actorType: {
        /** Human avatars: perfect circle per brand-identity. */
        human: 'rounded-full',
        /** Agent avatars: squircle per brand-identity / MCP-IDE-001. */
        agent: 'rounded-lg',
      },
      size: {
        xs: 'h-4 w-4',
        sm: 'h-6 w-6',
        default: 'h-8 w-8',
        lg: 'h-10 w-10',
      },
      active: {
        true: '',
        false: '',
      },
    },
    compoundVariants: [
      {
        actorType: 'agent',
        active: true,
        className:
          'ring-2 ring-primary ring-offset-2 ring-offset-background animate-agent-pulse',
      },
    ],
    defaultVariants: {
      actorType: 'human',
      size: 'default',
      active: false,
    },
  },
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  fallback?: string;
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, actorType, size, active, fallback, children, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ actorType, size, active }), className)}
    data-actor-type={actorType ?? 'human'}
    {...props}
  >
    {children}
    {fallback ? (
      <AvatarFallback actorType={actorType}>{fallback}</AvatarFallback>
    ) : null}
  </AvatarPrimitive.Root>
));
Avatar.displayName = 'Avatar';

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = 'AvatarImage';

interface AvatarFallbackProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  actorType?: VariantProps<typeof avatarVariants>['actorType'];
}

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, actorType, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center bg-surface-overlay text-xs font-medium text-muted-foreground',
      actorType === 'agent' && 'bg-primary/10 text-primary',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback, avatarVariants };
