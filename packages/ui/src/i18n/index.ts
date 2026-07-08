export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  LOCALE_LABELS,
  messages,
  i18nConfig,
  getMessagesForLocale,
  isRtlLocale,
  common,
  epics,
  stories,
  type SupportedLocale,
  type Messages,
  type MessageNamespace,
  type CommonMessages,
  type EpicsMessages,
  type StoriesMessages,
  type AuthMessages,
  type NavigationMessages,
  type AgentsMessages,
  type EntityMessages,
} from './config';

export {
  TerminologyProvider,
  useTerminology,
  useTerminologyOptional,
  resolveEntityTerminology,
  type TerminologyProviderProps,
  type TerminologyContextValue,
  type ResolvedEntityTerminology,
  type EntityTerminologyKey,
} from './terminology';

/**
 * Re-export next-intl hooks for consumer apps.
 * Frontend should wrap with NextIntlClientProvider using messages from i18nConfig.
 */
export { useTranslations, useLocale, useFormatter } from 'next-intl';
