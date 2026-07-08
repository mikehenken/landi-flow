import * as React from 'react';
import type {
  StoryFilterAst,
  StoryFilterCondition,
  StoryFilterField,
  StoryFilterOperator,
  StoryPriority,
} from '@landi-flow/core/types';
import { STORY_PRIORITY_VALUES } from '@landi-flow/core/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FilterDimensionOption {
  value: string;
  label: string;
}

export interface FilterPanelLabels {
  title: string;
  addFilter: string;
  clearAll: string;
  apply: string;
  status: string;
  assignee: string;
  priority: string;
  customer: string;
  is: string;
  isNot: string;
  unassigned: string;
  noCustomer: string;
}

export interface FilterPanelProps {
  open: boolean;
  filters: StoryFilterAst;
  onChange: (filters: StoryFilterAst) => void;
  onClose: () => void;
  statusOptions: FilterDimensionOption[];
  assigneeOptions: FilterDimensionOption[];
  customerOptions: FilterDimensionOption[];
  labels: FilterPanelLabels;
  className?: string;
}

const FILTER_FIELDS: StoryFilterField[] = [
  'status',
  'assignee',
  'priority',
  'customer',
];

function createCondition(
  field: StoryFilterField,
  value: string,
  operator: StoryFilterOperator = 'is',
): StoryFilterCondition {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `filter-${Date.now()}`,
    field,
    operator,
    values: [value],
  };
}

/** Standard filter overlay (CAP-027, CAP-068 customer dimension). */
export function FilterPanel({
  open,
  filters,
  onChange,
  onClose,
  statusOptions,
  assigneeOptions,
  customerOptions,
  labels,
  className,
}: FilterPanelProps): React.ReactElement | null {
  const [draftField, setDraftField] = React.useState<StoryFilterField>('status');
  const [draftValue, setDraftValue] = React.useState('');
  const [draftOperator, setDraftOperator] = React.useState<StoryFilterOperator>('is');

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

  const fieldLabels: Record<StoryFilterField, string> = {
    status: labels.status,
    assignee: labels.assignee,
    priority: labels.priority,
    customer: labels.customer,
    search: labels.addFilter,
  };

  const optionsForField = (field: StoryFilterField): FilterDimensionOption[] => {
    switch (field) {
      case 'status':
        return statusOptions;
      case 'assignee':
        return [
          { value: '__unassigned__', label: labels.unassigned },
          ...assigneeOptions,
        ];
      case 'priority':
        return STORY_PRIORITY_VALUES.map((priority: StoryPriority) => ({
          value: priority,
          label: priority === 'none' ? 'No priority' : priority,
        }));
      case 'customer':
        return [
          { value: '__none__', label: labels.noCustomer },
          ...customerOptions,
        ];
      default:
        return [];
    }
  };

  const addFilter = (): void => {
    if (!draftValue) {
      return;
    }
    onChange({
      op: 'and',
      conditions: [
        ...filters.conditions,
        createCondition(draftField, draftValue, draftOperator),
      ],
    });
    setDraftValue('');
  };

  const removeCondition = (conditionId: string): void => {
    onChange({
      op: 'and',
      conditions: filters.conditions.filter((condition) => condition.id !== conditionId),
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={labels.title}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        data-testid="filter-panel-backdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        data-testid="filter-panel"
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

        {filters.conditions.length > 0 ? (
          <ul className="mb-3 space-y-1" data-testid="filter-panel-active-list">
            {filters.conditions.map((condition) => (
              <li
                key={condition.id}
                className="flex items-center justify-between gap-2 rounded-md bg-white/5 px-2 py-1 text-xs"
              >
                <span className="truncate">
                  {fieldLabels[condition.field]} {condition.operator.replace('_', ' ')}{' '}
                  {condition.values.join(', ')}
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove filter ${condition.id}`}
                  onClick={() => removeCondition(condition.id)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="space-y-2 border-t border-border pt-3">
          <label className="text-xs font-medium text-muted-foreground">{labels.addFilter}</label>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={draftField}
              onChange={(event) => {
                setDraftField(event.target.value as StoryFilterField);
                setDraftValue('');
              }}
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
              data-testid="filter-panel-field-select"
            >
              {FILTER_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {fieldLabels[field]}
                </option>
              ))}
            </select>
            <select
              value={draftOperator}
              onChange={(event) =>
                setDraftOperator(event.target.value as StoryFilterOperator)
              }
              className="h-8 rounded-md border border-border bg-surface px-2 text-xs"
              data-testid="filter-panel-operator-select"
            >
              <option value="is">{labels.is}</option>
              <option value="is_not">{labels.isNot}</option>
            </select>
          </div>
          <select
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            className="h-8 w-full rounded-md border border-border bg-surface px-2 text-xs"
            data-testid="filter-panel-value-select"
          >
            <option value="">Select…</option>
            {optionsForField(draftField).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" size="sm" onClick={addFilter} data-testid="filter-panel-add">
              {labels.apply}
            </Button>
            {filters.conditions.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onChange({ op: 'and', conditions: [] })}
                data-testid="filter-panel-clear"
              >
                {labels.clearAll}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
