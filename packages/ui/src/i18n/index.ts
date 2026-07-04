export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  messages,
  i18nConfig,
  common,
  epics,
  stories,
  type SupportedLocale,
  type Messages,
  type MessageNamespace,
  type CommonMessages,
  type EpicsMessages,
  type StoriesMessages,
} from './config';

/**
 * Re-export next-intl hooks for consumer apps.
 * Frontend should wrap with NextIntlClientProvider using messages from i18nConfig.
 */
export { useTranslations, useLocale, useFormatter } from 'next-intl';
