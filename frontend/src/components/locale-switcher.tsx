'use client';

import * as React from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from '@landi-flow/ui/i18n';
import { cn } from '@landi-flow/ui';

export interface LocaleSwitcherProps {
  className?: string;
}

/** Segment-based locale switcher preserving the current path. */
export function LocaleSwitcher({ className }: LocaleSwitcherProps): React.ReactElement {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <label className={cn('flex items-center gap-2 text-xs text-foreground-subtle', className)}>
      <span className="sr-only">Language</span>
      <select
        value={locale}
        aria-label="Language"
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
        onChange={(event) => {
          const nextLocale = event.target.value as SupportedLocale;
          router.replace(pathname, { locale: nextLocale });
        }}
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
