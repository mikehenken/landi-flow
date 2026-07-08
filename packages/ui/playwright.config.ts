import { defineConfig, devices } from '@playwright/test';

const STORYBOOK_PORT = 6006;
const STORYBOOK_URL = process.env.STORYBOOK_URL ?? `http://localhost:${STORYBOOK_PORT}`;

export default defineConfig({
  testDir: './tests/storybook',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report/storybook' }]],
  timeout: 60_000,
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: STORYBOOK_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.SKIP_STORYBOOK_SERVER
    ? undefined
    : {
        command: 'pnpm storybook -- --ci --no-open',
        url: STORYBOOK_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        cwd: '.',
      },
});
