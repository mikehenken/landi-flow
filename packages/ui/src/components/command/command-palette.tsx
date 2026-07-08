'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { Layers, Search } from 'lucide-react';
import { StoryIdentifierBadge } from '@/components/badges/story-badge';
import { cn } from '@/lib/utils';

export interface CommandPaletteAction {
  id: string;
  label: string;
  shortcut?: string;
  group?: string;
  onSelect?: () => void;
}

export interface CommandPaletteStoryResult {
  id: string;
  identifier: string;
  title: string;
  onSelect?: () => void;
}

export interface CommandPaletteEpicResult {
  id: string;
  name: string;
  onSelect?: () => void;
}

export interface CommandPaletteGroupLabels {
  stories?: string;
  epics?: string;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandPaletteAction[];
  stories?: CommandPaletteStoryResult[];
  epics?: CommandPaletteEpicResult[];
  groupLabels?: CommandPaletteGroupLabels;
  placeholder?: string;
  emptyMessage?: string;
}

const groupHeadingClassName =
  '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-foreground-subtle';

const itemClassName = cn(
  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm',
  'aria-selected:bg-primary aria-selected:text-primary-foreground',
  'data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground',
);

/**
 * Command palette shell per shared-design-system (Cmd/Ctrl+K).
 * Searchable Stories, Epics, and action groups (Linear / Shortcut style).
 */
export function CommandPalette({
  open,
  onOpenChange,
  actions,
  stories = [],
  epics = [],
  groupLabels,
  placeholder = 'Search or jump to…',
  emptyMessage = 'No results found.',
}: CommandPaletteProps): React.ReactElement {
  const groupedActions = React.useMemo(() => {
    const groups = new Map<string, CommandPaletteAction[]>();
    for (const action of actions) {
      const group = action.group ?? 'Actions';
      const existing = groups.get(group) ?? [];
      existing.push(action);
      groups.set(group, existing);
    }
    return groups;
  }, [actions]);

  const storiesHeading = groupLabels?.stories ?? 'Stories';
  const epicsHeading = groupLabels?.epics ?? 'Epics';

  const handleSelect = React.useCallback(
    (onSelect?: () => void) => {
      onSelect?.();
      onOpenChange(false);
    },
    [onOpenChange],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      data-testid="command-palette"
      overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      contentClassName={cn(
        'fixed left-1/2 top-[20%] z-50 w-full max-w-[640px] -translate-x-1/2',
        'overflow-hidden rounded-xl border border-border bg-surface-overlay shadow-xl',
        'duration-150',
      )}
    >
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
          {emptyMessage}
        </Command.Empty>
        {stories.length > 0 ? (
          <Command.Group key="stories" heading={storiesHeading} className={groupHeadingClassName}>
            {stories.map((story) => (
              <Command.Item
                key={story.id}
                value={`${story.identifier} ${story.title}`}
                keywords={[story.identifier, story.title]}
                onSelect={() => handleSelect(story.onSelect)}
                className={itemClassName}
              >
                <StoryIdentifierBadge identifier={story.identifier} />
                <span className="min-w-0 flex-1 truncate">{story.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        {epics.length > 0 ? (
          <Command.Group key="epics" heading={epicsHeading} className={groupHeadingClassName}>
            {epics.map((epic) => (
              <Command.Item
                key={epic.id}
                value={epic.name}
                keywords={[epic.name]}
                onSelect={() => handleSelect(epic.onSelect)}
                className={itemClassName}
              >
                <Layers className="h-4 w-4 shrink-0 text-foreground-subtle" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{epic.name}</span>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
        {Array.from(groupedActions.entries()).map(([group, groupActions]) => (
          <Command.Group key={group} heading={group} className={groupHeadingClassName}>
            {groupActions.map((action) => (
              <Command.Item
                key={action.id}
                value={action.label}
                onSelect={() => handleSelect(action.onSelect)}
                className={itemClassName}
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
    </Command.Dialog>
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
      data-testid="command-palette-trigger"
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
