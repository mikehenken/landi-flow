'use client';

import * as React from 'react';
import { Button, Input, cn, useTranslations } from '@landi-flow/ui';
import { LayoutGrid, ListFilter, Plus, Search, Users } from 'lucide-react';
import type { CustomerRecord } from '@/lib/seed-data';

const CUSTOMER_DOCS_URL =
  'https://linear.app/docs/customer-requests';

export interface CustomersViewProps {
  customers: CustomerRecord[];
  onCreateCustomer?: () => void;
  className?: string;
}

function filterCustomers(
  customers: CustomerRecord[],
  query: string,
): CustomerRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return customers;
  }

  return customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(normalized) ||
      customer.domain.toLowerCase().includes(normalized),
  );
}

/** Customers index — search, empty state, and list shell per CAP-066 HITM reference. */
export function CustomersView({
  customers,
  onCreateCustomer,
  className,
}: CustomersViewProps): React.ReactElement {
  const t = useTranslations('customers');
  const [searchQuery, setSearchQuery] = React.useState('');
  const filteredCustomers = React.useMemo(
    () => filterCustomers(customers, searchQuery),
    [customers, searchQuery],
  );
  const hasSearchQuery = searchQuery.trim().length > 0;
  const showEmptyState = filteredCustomers.length === 0;

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <div className="border-b border-border px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 w-full flex-1 sm:max-w-xl">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('search_placeholder')}
              aria-label={t('search_placeholder')}
              className="ps-9"
              data-testid="customers-search-input"
            />
          </div>
          <div className="flex items-center gap-1 sm:ms-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('empty.cta')}
              title={t('empty.cta')}
              onClick={onCreateCustomer}
              data-testid="customers-create-button"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Filter"
              title="Filter"
              disabled
            >
              <ListFilter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Display"
              title="Display"
              disabled
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {showEmptyState ? (
        <div
          className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center"
          data-testid="customers-empty-state"
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-xl border border-border bg-surface-overlay text-muted-foreground">
            <Users className="h-10 w-10 opacity-70" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {hasSearchQuery ? t('empty.no_results') : t('empty.heading')}
          </h2>
          {!hasSearchQuery ? (
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              {t('empty.description')}
            </p>
          ) : null}
          {!hasSearchQuery ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={onCreateCustomer}>{t('empty.cta')}</Button>
              <Button
                variant="secondary"
                onClick={() => window.open(CUSTOMER_DOCS_URL, '_blank', 'noopener,noreferrer')}
              >
                {t('empty.documentation')}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className="divide-y divide-border-subtle"
          role="list"
          aria-label={t('list.aria_label')}
        >
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              role="listitem"
              className="flex h-11 items-center gap-3 px-4 text-sm sm:px-6"
              data-testid="customer-list-item"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-overlay text-xs font-medium text-muted-foreground">
                {customer.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {customer.name}
              </span>
              <span className="hidden min-w-0 truncate text-muted-foreground sm:inline">
                {customer.domain}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
