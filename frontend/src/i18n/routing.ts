import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@landi-flow/ui/i18n';

export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];
