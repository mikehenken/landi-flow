import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  getMessagesForLocale,
  isRtlLocale,
  type SupportedLocale,
} from './config';
import { Button } from '@/components/ui/button';

/** Narrow shell mimicking sidebar nav labels — verifies truncation + RTL per locale. */
function NavigationShowcasePanel({ locale }: { locale: SupportedLocale }): React.ReactElement {
  const t = useTranslations('navigation');
  const rtl = isRtlLocale(locale);
  const navKeys = [
    'views.inbox',
    'views.stories',
    'views.story_board',
    'views.epic_board',
    'views.agents',
  ] as const;

  return (
    <div
      data-testid="i18n-showcase"
      data-locale={locale}
      dir={rtl ? 'rtl' : 'ltr'}
      className="w-[200px] space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <p className="text-xs font-medium text-muted-foreground" data-testid="locale-label">
        {LOCALE_LABELS[locale]}
      </p>
      <nav className="space-y-1" data-testid="nav-items">
        {navKeys.map((key) => (
          <div
            key={key}
            className="min-w-0 truncate rounded px-2 py-1 text-sm hover:bg-muted"
            data-testid={`nav-${key.split('.').pop()}`}
          >
            {t(key)}
          </div>
        ))}
      </nav>
      <p className="min-w-0 truncate text-xs text-muted-foreground" data-testid="welcome-line">
        {t('inbox.welcome', { count: 12 })}
      </p>
      <Button size="sm" className="w-full min-w-0 truncate" data-testid="cta-button">
        {t('command_palette.open_agents')}
      </Button>
    </div>
  );
}

function LocaleStory({ locale }: { locale: SupportedLocale }): React.ReactElement {
  return (
    <NextIntlClientProvider locale={locale} messages={getMessagesForLocale(locale)}>
      <NavigationShowcasePanel locale={locale} />
    </NextIntlClientProvider>
  );
}

const meta: Meta = {
  title: 'I18n/NavigationShowcase',
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Segment-based navigation copy across en/es/de/ar with truncation safeguards and Arabic RTL.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const English: Story = {
  render: () => <LocaleStory locale="en" />,
};

export const Spanish: Story = {
  render: () => <LocaleStory locale="es" />,
};

export const German: Story = {
  render: () => <LocaleStory locale="de" />,
};

export const ArabicRtl: Story = {
  render: () => <LocaleStory locale="ar" />,
  parameters: {
    docs: {
      description: {
        story: 'Arabic locale renders dir=rtl with logical layout for sidebar labels.',
      },
    },
  },
};

/** Matrix story listing all supported locales for quick visual scan. */
export const AllLocales: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {SUPPORTED_LOCALES.map((locale) => (
        <LocaleStory key={locale} locale={locale} />
      ))}
    </div>
  ),
  parameters: { layout: 'padded' },
};
