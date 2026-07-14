import * as React from 'react';
import type {
  StoryDisplayOptions,
  StoryDisplayProperty,
  StoryViewOrdering,
  ViewLayout,
} from '@landi-flow/core/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DisplayPanelLabels {
  title: string;
  layout: string;
  list: string;
  board: string;
  ordering: string;
  orderingManual: string;
  orderingPriority: string;
  orderingUpdated: string;
  orderCompletedByRecency: string;
  showSubStories: string;
  displayProperties: string;
  propertyId: string;
  propertyStatus: string;
  propertyAssignee: string;
  propertyPriority: string;
  propertyCustomer: string;
}

export interface DisplayPanelProps {
  open: boolean;
  display: StoryDisplayOptions;
  onChange: (display: StoryDisplayOptions) => void;
  onLayoutChange?: (layout: ViewLayout) => void;
  onClose: () => void;
  labels: DisplayPanelLabels;
  className?: string;
}

const ORDERING_OPTIONS: StoryViewOrdering[] = ['manual', 'priority', 'updated'];
const DISPLAY_PROPERTY_KEYS: StoryDisplayProperty[] = [
  'id',
  'status',
  'assignee',
  'priority',
  'customer',
];

/** Display options overlay (CAP-022–026, CAP-024). */
export function DisplayPanel({
  open,
  display,
  onChange,
  onLayoutChange,
  onClose,
  labels,
  className,
}: DisplayPanelProps): React.ReactElement | null {
  React.useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const orderingLabels: Record<StoryViewOrdering, string> = {
    manual: labels.orderingManual,
    priority: labels.orderingPriority,
    updated: labels.orderingUpdated,
  };

  const propertyLabels: Record<StoryDisplayProperty, string> = {
    id: labels.propertyId,
    status: labels.propertyStatus,
    assignee: labels.propertyAssignee,
    priority: labels.propertyPriority,
    customer: labels.propertyCustomer,
  };

  const patch = (partial: Partial<StoryDisplayOptions>): void => {
    onChange({ ...display, ...partial });
  };

  const toggleProperty = (property: StoryDisplayProperty): void => {
    const exists = display.displayProperties.includes(property);
    const next = exists
      ? display.displayProperties.filter((entry) => entry !== property)
      : [...display.displayProperties, property];
    patch({ displayProperties: next.length > 0 ? next : [property] });
  };

  const setLayout = (layout: ViewLayout): void => {
    patch({ layout });
    onLayoutChange?.(layout);
  };

  return (
    <>
      <button
        type="button"
        aria-label={labels.title}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        data-testid="display-panel-backdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        data-testid="display-panel"
        className={cn(
          'fixed end-4 top-20 z-50 w-[min(100vw-2rem,360px)] rounded-lg border border-border bg-surface-overlay p-4 shadow-xl',
          className,
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">{labels.title}</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="space-y-4 text-sm">
          <section>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{labels.layout}</p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={display.layout === 'list' ? 'default' : 'secondary'}
                onClick={() => setLayout('list')}
                data-testid="display-panel-layout-list"
              >
                {labels.list}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={display.layout === 'board' ? 'default' : 'secondary'}
                onClick={() => setLayout('board')}
                data-testid="display-panel-layout-board"
              >
                {labels.board}
              </Button>
            </div>
          </section>

          <section>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {labels.ordering}
            </label>
            <select
              value={display.ordering}
              onChange={(event) =>
                patch({ ordering: event.target.value as StoryViewOrdering })
              }
              className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs"
              data-testid="display-panel-ordering"
            >
              {ORDERING_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {orderingLabels[option]}
                </option>
              ))}
            </select>
          </section>

          <label className="flex items-center justify-between gap-2 text-xs">
            <span>{labels.orderCompletedByRecency}</span>
            <input
              type="checkbox"
              checked={display.orderCompletedByRecency}
              onChange={(event) => patch({ orderCompletedByRecency: event.target.checked })}
              data-testid="display-panel-order-completed"
            />
          </label>

          <label className="flex items-center justify-between gap-2 text-xs">
            <span>{labels.showSubStories}</span>
            <input
              type="checkbox"
              checked={display.showSubStories}
              onChange={(event) => patch({ showSubStories: event.target.checked })}
              data-testid="display-panel-show-sub-stories"
            />
          </label>

          <section>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {labels.displayProperties}
            </p>
            <div className="flex flex-wrap gap-1">
              {DISPLAY_PROPERTY_KEYS.map((property) => {
                const active = display.displayProperties.includes(property);
                return (
                  <button
                    key={property}
                    type="button"
                    onClick={() => toggleProperty(property)}
                    data-testid={`display-panel-property-${property}`}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-xs transition-colors',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-white/5',
                    )}
                  >
                    {propertyLabels[property]}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
