import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
import uiConfig from '../packages/ui/tailwind.config';

const config: Config = {
  ...uiConfig,
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
    '../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    ...uiConfig.theme,
    extend: {
      ...(uiConfig.theme?.extend ?? {}),
      colors: {
        ...(uiConfig.theme?.extend?.colors ?? {}),
        'foreground-subtle': 'hsl(var(--foreground-subtle))',
      },
    },
  },
};

export default config;
