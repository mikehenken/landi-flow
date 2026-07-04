import type { Preview } from '@storybook/react';
import React from 'react';
import { withThemeByClassName } from '@storybook/addon-themes';
import { NextIntlClientProvider } from 'next-intl';
import '../src/styles/globals.css';
import '../src/components/editor/editor-styles.css';
import { messages, DEFAULT_LOCALE } from '../src/i18n/config';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    backgrounds: {
      disable: true,
    },
    a11y: {
      test: 'todo',
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        dark: 'dark',
        light: '',
      },
      defaultTheme: 'dark',
    }),
    (Story) => (
      <NextIntlClientProvider
        locale={DEFAULT_LOCALE}
        messages={messages[DEFAULT_LOCALE]}
      >
        <div className="min-w-[320px] bg-background p-6 font-sans text-foreground antialiased dark">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};

export default preview;
