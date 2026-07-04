import common from './messages/en/common.json';
import epics from './messages/en/epics.json';
import stories from './messages/en/stories.json';

/** Supported locales for Landi Flow UI. */
export const SUPPORTED_LOCALES = ['en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Message namespaces matching domain boundaries per i18n-spec. */
export const messages = {
  en: {
    common,
    epics,
    stories,
  },
} as const;

export type Messages = typeof messages.en;
export type MessageNamespace = keyof Messages;

/** Flattened message keys for type-safe lookups in components. */
export type CommonMessages = typeof common;
export type EpicsMessages = typeof epics;
export type StoriesMessages = typeof stories;

/** next-intl configuration for Next.js App Router integration. */
export const i18nConfig = {
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  messages,
} as const;

export { common, epics, stories };
