'use client';

import { useFormatter } from 'next-intl';

/** Locale-aware date/time formatting per i18n-spec (Intl.DateTimeFormat). */
export function useLocalizedDateTime() {
  const format = useFormatter();

  // next-intl exposes its own narrower option types than the DOM `Intl.*Options`.
  // Accept the ergonomic DOM types publicly and bridge to the formatter's parameter
  // types (which are a compatible subset at runtime) via a localized cast.
  type DateTimeOptions = Parameters<typeof format.dateTime>[1];
  type NumberOptions = Parameters<typeof format.number>[1];

  return {
    formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) =>
      format.dateTime(
        typeof value === 'string' || typeof value === 'number' ? new Date(value) : value,
        options as DateTimeOptions,
      ),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      format.number(value, options as NumberOptions),
  };
}
