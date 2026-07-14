'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModelOption {
  id: string;
  label: string;
  description?: string;
}

export interface ModelSelectorProps {
  models: ModelOption[];
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

/**
 * Provider/model picker (AI Elements `ModelSelector`). Model choices are
 * surfaced from DEFAULT_GEMINI_MODEL / DEFAULT_GEMINI_FAST_MODEL — inference
 * always routes through the Cloudflare AI Gateway server-side.
 */
export function ModelSelector({
  models,
  value,
  onChange,
  className,
}: ModelSelectorProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [openUp, setOpenUp] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const active = models.find((model) => model.id === value) ?? models[0];

  React.useEffect(() => {
    const onClick = (event: MouseEvent): void => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Collision-aware direction: open below the trigger by default; flip above only
  // when there is not enough room below but more room above (e.g. a bottom-docked
  // toolbar). This keeps the menu fully in view regardless of where the trigger
  // sits — the previous hard-coded `bottom-full` opened off the top of the header.
  const toggle = React.useCallback((): void => {
    setOpen((prev) => {
      const next = !prev;
      if (next && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const estimatedHeight = Math.min(models.length * 48 + 8, 320);
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUp(spaceBelow < estimatedHeight && spaceAbove > spaceBelow);
      }
      return next;
    });
  }, [models.length]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground',
          'hover:bg-white/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
      >
        <Cpu className="h-3.5 w-3.5" />
        <span className="max-w-[140px] truncate">{active?.label ?? 'Model'}</span>
        <ChevronsUpDown className="h-3 w-3" />
      </button>
      {open ? (
        <ul
          role="listbox"
          className={cn(
            'absolute right-0 z-30 max-h-[320px] min-w-[200px] overflow-y-auto rounded-md border border-border bg-surface-overlay p-1 shadow-lg',
            openUp ? 'bottom-full mb-1' : 'top-full mt-1',
          )}
        >
          {models.map((model) => (
            <li key={model.id}>
              <button
                type="button"
                role="option"
                aria-selected={model.id === value}
                onClick={() => {
                  onChange(model.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-start gap-2 rounded px-2 py-1.5 text-left text-xs',
                  'hover:bg-white/5',
                )}
              >
                <Check
                  className={cn(
                    'mt-0.5 h-3.5 w-3.5 shrink-0',
                    model.id === value ? 'text-primary' : 'text-transparent',
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-foreground">{model.label}</span>
                  {model.description ? (
                    <span className="block truncate text-foreground-subtle">
                      {model.description}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
