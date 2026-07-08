import enCommon from './messages/en/common.json';
import enEpics from './messages/en/epics.json';
import enStories from './messages/en/stories.json';
import enAuth from './messages/en/auth.json';
import enNavigation from './messages/en/navigation.json';
import enAgents from './messages/en/agents.json';
import enCustomers from './messages/en/customers.json';
import enEntity from './messages/en/entity.json';
import enMembers from './messages/en/members.json';
import enInbox from './messages/en/inbox.json';
import enViews from './messages/en/views.json';

import esCommon from './messages/es/common.json';
import esEpics from './messages/es/epics.json';
import esStories from './messages/es/stories.json';
import esAuth from './messages/es/auth.json';
import esNavigation from './messages/es/navigation.json';
import esAgents from './messages/es/agents.json';
import esCustomers from './messages/es/customers.json';
import esEntity from './messages/es/entity.json';
import esMembers from './messages/en/members.json';

import deCommon from './messages/de/common.json';
import deEpics from './messages/de/epics.json';
import deStories from './messages/de/stories.json';
import deAuth from './messages/de/auth.json';
import deNavigation from './messages/de/navigation.json';
import deAgents from './messages/de/agents.json';
import deCustomers from './messages/de/customers.json';
import deEntity from './messages/de/entity.json';
import deMembers from './messages/en/members.json';

import arCommon from './messages/ar/common.json';
import arEpics from './messages/ar/epics.json';
import arStories from './messages/ar/stories.json';
import arAuth from './messages/ar/auth.json';
import arNavigation from './messages/ar/navigation.json';
import arAgents from './messages/ar/agents.json';
import arCustomers from './messages/ar/customers.json';
import arEntity from './messages/ar/entity.json';
import arMembers from './messages/en/members.json';

/** Supported locales for Landi Flow UI. */
export const SUPPORTED_LOCALES = ['en', 'es', 'de', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en';

/** Locales that render right-to-left per i18n-spec. */
export const RTL_LOCALES: readonly SupportedLocale[] = ['ar'] as const;

export function isRtlLocale(locale: string): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

/** Human-readable locale labels for the locale switcher. */
export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  ar: 'العربية',
};

/** Message namespaces matching domain boundaries per i18n-spec. */
export const messages = {
  en: {
    common: enCommon,
    epics: enEpics,
    stories: enStories,
    auth: enAuth,
    navigation: enNavigation,
    agents: enAgents,
    customers: enCustomers,
    entity: enEntity,
    members: enMembers,
    inbox: enInbox,
    views: enViews,
  },
  es: {
    common: esCommon,
    epics: esEpics,
    stories: esStories,
    auth: esAuth,
    navigation: esNavigation,
    agents: esAgents,
    customers: esCustomers,
    entity: esEntity,
    members: esMembers,
    inbox: enInbox,
    views: enViews,
  },
  de: {
    common: deCommon,
    epics: deEpics,
    stories: deStories,
    auth: deAuth,
    navigation: deNavigation,
    agents: deAgents,
    customers: deCustomers,
    entity: deEntity,
    members: deMembers,
    inbox: enInbox,
    views: enViews,
  },
  ar: {
    common: arCommon,
    epics: arEpics,
    stories: arStories,
    auth: arAuth,
    navigation: arNavigation,
    agents: arAgents,
    customers: arCustomers,
    entity: arEntity,
    members: arMembers,
    inbox: enInbox,
    views: enViews,
  },
} as const;

export type Messages = (typeof messages)[SupportedLocale];
export type MessageNamespace = keyof Messages;

export type CommonMessages = typeof enCommon;
export type EpicsMessages = typeof enEpics;
export type StoriesMessages = typeof enStories;
export type AuthMessages = typeof enAuth;
export type NavigationMessages = typeof enNavigation;
export type AgentsMessages = typeof enAgents;
export type CustomersMessages = typeof enCustomers;
export type EntityMessages = typeof enEntity;
export type MembersMessages = typeof enMembers;
export type InboxMessages = typeof enInbox;
export type ViewsMessages = typeof enViews;

/** next-intl configuration for Next.js App Router integration. */
export const i18nConfig = {
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  messages,
} as const;

/** Resolve messages for a locale with English fallback. */
export function getMessagesForLocale(locale: string): Messages {
  if ((SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return messages[locale as SupportedLocale];
  }
  return messages.en;
}

export { enCommon as common, enEpics as epics, enStories as stories };
