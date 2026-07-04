'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CommandPaletteAction {
  id: string;
  label: string;
  shortcut?: string;
  group?: string;
  onSelect?: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandPaletteAction[];
  placeholder?: string;
}

/**
 * Command palette shell per shared-design-system (Cmd/Ctrl+K).
 * Uses Epic/Story nomenclature in action labels.
 */
export function CommandPalette({
  open,
  onOpenChange,
  actions,
  placeholder = 'Search or jump to…',
}: CommandPaletteProps): React.ReactElement {
  const grouped = React.useMemo(() => {
    const groups = new Map<string, CommandPaletteAction[]>();
    for (const action of actions) {
      const group = action.group ?? 'Actions';
      const existing = groups.get(group) ?? [];
      existing.push(action);
      groups.set(group, existing);
    }
    return groups;
  }, [actions]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-[20%] z-50 w-full max-w-[640px] -translate-x-1/2',
            'overflow-hidden rounded-xl border border-border bg-surface-overlay shadow-xl',
            'duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
          aria-label="Command palette"
        >
          <Command className="flex flex-col">
            <div className="flex items-center border-b border-border px-4">
              <Search className="mr-3 h-5 w-5 shrink-0 text-foreground-subtle" />
              <Command.Input
                placeholder={placeholder}
                className={cn(
                  'flex h-14 w-full bg-transparent text-lg text-foreground outline-none',
                  'placeholder:text-foreground-subtle',
                )}
              />
            </div>
            <Command.List className="max-h-[360px] overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>
              {Array.from(grouped.entries()).map(([group, groupActions]) => (
                <Command.Group
                  key={group}
                  heading={group}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-subtle"
                >
                  {groupActions.map((action) => (
                    <Command.Item
                      key={action.id}
                      value={action.label}
                      onSelect={() => {
                        action.onSelect?.();
                        onOpenChange(false);
                      }}
                      className={cn(
                        'flex cursor-pointer items-center rounded-md px-2 py-2 text-sm',
                        'aria-selected:bg-primary aria-selected:text-primary-foreground',
                        'data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{action.label}</span>
                      {action.shortcut ? (
                        <kbd className="ml-auto rounded-sm bg-black/20 px-1.5 py-0.5 font-mono text-xs">
                          {action.shortcut}
                        </kbd>
                      ) : null}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export interface CommandPaletteTriggerProps {
  onOpen: () => void;
  className?: string;
}

/** Helper button showing Cmd+K hint for discoverability. */
export function CommandPaletteTrigger({
  onOpen,
  className,
}: CommandPaletteTriggerProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-border bg-surface-overlay px-3 py-1.5 text-sm text-muted-foreground',
        'hover:bg-white/5 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className,
      )}
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="rounded-sm bg-black/20 px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>
    </button>
  );
}
