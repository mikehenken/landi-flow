import { test as base, expect, type Page } from '@playwright/test';
import path from 'node:path';
import {
  getE2eTestCredentials,
  getLiveApiEnvStatus,
  isLiveApiEnvReady,
} from './live-env';

const HYDRATION_SELECTOR = 'html[data-app-hydrated="true"]';
const APP_READY_TIMEOUT_MS = 45_000;
const liveEnv = getLiveApiEnvStatus();

const SCREENSHOT_DIR = path.resolve(
  __dirname,
  '../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/09-functional-completion/task-09m-real-supabase-persistence-all-entities/iteration-6/screenshots',
);

async function signInWithTestAccount(page: Page): Promise<void> {
  const { email, password } = getE2eTestCredentials();
  await page.goto('/en/auth/login?redirect=/workspace/inbox', { waitUntil: 'load' });
  await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();

  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in|submit/i }).click();

  // Match pathname only — login URL includes redirect=/workspace/inbox in the query string.
  await expect(page).toHaveURL(/\/en\/workspace\/inbox\/?(\?.*)?$/, {
    timeout: APP_READY_TIMEOUT_MS,
  });
}

async function waitForHydratedWorkspace(page: Page): Promise<void> {
  await page.waitForSelector(HYDRATION_SELECTOR, { timeout: APP_READY_TIMEOUT_MS });
  await expect(page.getByText(/Failed to load workspace data/i)).toHaveCount(0);
}

async function createStoryViaModal(page: Page, title: string): Promise<void> {
  await page.getByTestId('create-resource-dropdown-trigger').click();
  await page.getByTestId('create-dropdown-story').click();
  const modal = page.getByTestId('create-story-modal');
  await expect(modal).toBeVisible({ timeout: 10_000 });

  await page.getByTestId('create-story-title').fill(title);
  await page.getByTestId('create-story-submit').click();

  await expect(modal).not.toBeVisible({ timeout: APP_READY_TIMEOUT_MS });
}

async function assertStoryVisibleInList(page: Page, title: string): Promise<void> {
  const storyRow = page.getByTestId('story-list-item').filter({ hasText: title });
  await expect(storyRow.first()).toBeVisible({ timeout: APP_READY_TIMEOUT_MS });
}

const test = base.extend({});

test.describe('Real Supabase persistence refresh @requires-live-api', () => {
  test.skip(!isLiveApiEnvReady(), liveEnv.reason ?? 'Live API env not configured');
  test.setTimeout(120_000);

  test('created story survives hard reload when MOCK_AUTH is off', async ({ page }) => {
    const uniqueTitle = `E2E persist ${Date.now()}`;

    await signInWithTestAccount(page);
    await waitForHydratedWorkspace(page);

    await page.goto('/en/workspace/stories', { waitUntil: 'domcontentloaded' });
    await waitForHydratedWorkspace(page);

    await createStoryViaModal(page, uniqueTitle);
    await assertStoryVisibleInList(page, uniqueTitle);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForHydratedWorkspace(page);
    await assertStoryVisibleInList(page, uniqueTitle);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09m-story-persist-after-reload.png`,
      fullPage: true,
    });
  });
});

