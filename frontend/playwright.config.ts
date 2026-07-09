import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const repoRoot = path.join(__dirname, '..');

/** Load landi-flow/.env.local into process.env (Playwright config runs outside Next.js). */
function loadRootEnvLocal(): void {
  const envPath = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key === 'NEXT_PUBLIC_MOCK_AUTH') continue;
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadRootEnvLocal();

function isLiveApiEnvReady(): boolean {
  if (process.env.NEXT_PUBLIC_MOCK_AUTH === 'true') {
    return false;
  }
  return Boolean(
    process.env.FLOW_API_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const devReadyURL = `${baseURL}/api/e2e/health`;
const liveApiReady = isLiveApiEnvReady();

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/debug.spec.ts'],
  timeout: 90_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: '../test-results/playwright-report' }]],
  outputDir: '../test-results/playwright',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium-mock',
      grepInvert: /@requires-live-api/,
      use: { ...devices['Desktop Chrome'] },
      webServer: {
        command: 'node scripts/e2e-dev-mock.mjs',
        url: devReadyURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
    },
    {
      name: 'chromium-live-api',
      grep: /@requires-live-api/,
      use: { ...devices['Desktop Chrome'] },
      ...(liveApiReady
        ? {
            webServer: {
              command: 'node scripts/e2e-dev-live.mjs',
              url: devReadyURL,
              reuseExistingServer: !process.env.CI,
              timeout: 180_000,
            },
          }
        : {}),
    },
  ],
  globalSetup: './e2e/global-setup.ts',
});
