import { getRequestConfig } from 'next-intl/server';
import { getMessagesForLocale } from '@landi-flow/ui/i18n';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (
    !locale ||
    !(routing.locales as readonly string[]).includes(locale)
  ) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: getMessagesForLocale(locale),
  };
});
