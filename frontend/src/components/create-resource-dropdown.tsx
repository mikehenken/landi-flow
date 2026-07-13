'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Button, cn, useTerminology, useTranslations } from '@landi-flow/ui';
import { ChevronDown, Layers, Plus, UserPlus, Users } from 'lucide-react';
import { LayoutList } from 'lucide-react';
import {
  getCreateMenuFixedStyle,
} from '@/lib/create-resource-menu-position';

export interface CreateResourceDropdownProps {
  onCreateStory: () => void;
  onCreateEpic: () => void;
  onCreateCustomer: () => void;
  onCreateMember: () => void;
  storyShortcutHint?: string;
}

interface CreateMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  testId: string;
  shortcutHint?: string;
}

function useDismissOnOutside(
  open: boolean,
  refs: Array<React.RefObject<HTMLElement | null>>,
  onClose: () => void,
): void {
  React.useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent): void {
      const target = event.target as Node;
      const clickedInside = refs.some(
        (ref) => ref.current !== null && ref.current.contains(target),
      );
      if (!clickedInside) {
        window.requestAnimationFrame(() => onClose());
      }
    }
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('click', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('click', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, refs, onClose]);
}

/** Unified header create dropdown — CAP-004 entry point for all resource types. */
export function CreateResourceDropdown({
  onCreateStory,
  onCreateEpic,
  onCreateCustomer,
  onCreateMember,
  storyShortcutHint,
}: CreateResourceDropdownProps): React.ReactElement {
  const tCommon = useTranslations('common');
  const tEntityLabels = useTranslations('entity');
  const { t: tEntity } = useTerminology();
  const [open, setOpen] = React.useState(false);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({});
  const [portalReady, setPortalReady] = React.useState(false);
  const triggerWrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  const dismissRefs = React.useMemo(
    () => [triggerWrapRef, menuRef],
    [],
  );

  useDismissOnOutside(open, dismissRefs, close);

  React.useEffect(() => {
    setPortalReady(true);
  }, []);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function updatePosition(): void {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }
      setMenuStyle(getCreateMenuFixedStyle(trigger.getBoundingClientRect()));
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const items: CreateMenuItem[] = React.useMemo(
    () => [
      {
        id: 'story',
        label: `${tCommon('actions.create')} ${tEntity('entity.story')}`,
        icon: <LayoutList className="h-4 w-4" aria-hidden />,
        onSelect: onCreateStory,
        testId: 'create-dropdown-story',
        shortcutHint: storyShortcutHint,
      },
      {
        id: 'epic',
        label: `${tCommon('actions.create')} ${tEntity('entity.epic')}`,
        icon: <Layers className="h-4 w-4" aria-hidden />,
        onSelect: onCreateEpic,
        testId: 'create-dropdown-epic',
      },
      {
        id: 'customer',
        label: `${tCommon('actions.create')} ${tEntityLabels('customer')}`,
        icon: <Users className="h-4 w-4" aria-hidden />,
        onSelect: onCreateCustomer,
        testId: 'create-dropdown-customer',
      },
      {
        id: 'member',
        label: tCommon('actions.invite_member'),
        icon: <UserPlus className="h-4 w-4" aria-hidden />,
        onSelect: onCreateMember,
        testId: 'create-dropdown-member',
      },
    ],
    [
      onCreateStory,
      onCreateEpic,
      onCreateCustomer,
      onCreateMember,
      storyShortcutHint,
      tCommon,
      tEntity,
      tEntityLabels,
    ],
  );

  const handleSelect = React.useCallback(
    (item: CreateMenuItem): void => {
      close();
      item.onSelect();
    },
    [close],
  );

  const menu =
    open && portalReady ? (
      <div
        ref={menuRef}
        role="menu"
        data-testid="create-resource-dropdown-menu"
        style={menuStyle}
        className={cn(
          'overflow-hidden rounded-lg border border-border bg-surface-overlay p-1 shadow-xl',
        )}
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            data-testid={item.testId}
            onClick={() => handleSelect(item)}
            className={cn(
              'flex w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm',
              'hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            )}
          >
            <span className="text-muted-foreground">{item.icon}</span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.shortcutHint ? (
              <kbd className="rounded-sm bg-black/20 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {item.shortcutHint}
              </kbd>
            ) : null}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div ref={triggerWrapRef} className="relative shrink-0">
      <Button
        ref={triggerRef}
        size="sm"
        className="shrink-0 gap-1"
        data-testid="create-resource-dropdown-trigger"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        title={storyShortcutHint}
        aria-label={tCommon('actions.create')}
      >
        <Plus className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{tCommon('actions.create')}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 opacity-70 sm:inline" aria-hidden />
      </Button>

      {menu && typeof document !== 'undefined'
        ? createPortal(menu, document.body)
        : null}
    </div>
  );
}
