import { test as base, expect, type Page } from '@playwright/test';
import path from 'node:path';

const HYDRATION_SELECTOR = 'html[data-app-hydrated="true"]';
const INBOX_PATH = '/en/workspace/inbox';
const APP_READY_TIMEOUT_MS = 45_000;
const MAX_NAV_ATTEMPTS = 3;

/** Navigate (or reload) until client stores hydrate and inbox controls are interactive. */
export async function waitForAppReady(page: Page): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_NAV_ATTEMPTS; attempt++) {
    try {
      await page.goto(INBOX_PATH, { waitUntil: 'domcontentloaded' });
      if (page.url().includes('/auth/login')) {
        throw new Error(
          'Inbox redirected to login — NEXT_PUBLIC_MOCK_AUTH=true is required. ' +
            'Start via `node scripts/e2e-dev-mock.mjs` or Playwright webServer.',
        );
      }
      await page.waitForSelector(HYDRATION_SELECTOR, { timeout: APP_READY_TIMEOUT_MS });
      await expect(page.getByTestId('create-resource-dropdown-trigger')).toBeVisible({
        timeout: APP_READY_TIMEOUT_MS,
      });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

/** Wait until inbox CAP-035/CAP-015 panels are hydrated. */
export async function ensureHydratedInbox(page: Page): Promise<void> {
  await waitForAppReady(page);
  await expect(page.getByTestId('inbox-notifications-panel')).toBeVisible({
    timeout: APP_READY_TIMEOUT_MS,
  });
  await expect(page.getByTestId('inbox-activity-feed')).toBeVisible({
    timeout: APP_READY_TIMEOUT_MS,
  });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await waitForAppReady(page);
    await use(page);
  },
});

export { expect };

export const SCREENSHOT_DIR = path.resolve(
  __dirname,
  '../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/10-testing/task-10-testing/screenshots',
);

export async function navigateToStories(page: import('@playwright/test').Page): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto('/en/workspace/stories', { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
      await expect(page).toHaveURL(/\/workspace\/stories/, { timeout: 15_000 });
      await expect(page.getByTestId('stories-view-toolbar')).toBeVisible({ timeout: 30_000 });
      return;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
  }
}

export async function navigateToEpics(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('link', { name: 'Epic Board' }).click();
  await expect(page).toHaveURL(/\/workspace\/epics/, { timeout: 15_000 });
}

/** Agent Console — native chat + MCP roster (task-09l / task-10). */
export async function navigateToAgents(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/en/workspace/agents', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(HYDRATION_SELECTOR, { timeout: APP_READY_TIMEOUT_MS });
  await expect(page).toHaveURL(/\/workspace\/agents/, { timeout: 15_000 });
  await expect(page.getByText('Landi Flow Agent', { exact: true }).first()).toBeVisible({
    timeout: APP_READY_TIMEOUT_MS,
  });
}

/** Move focus off sidebar selects / editors so global shortcuts receive keys. */
export async function ensureGlobalKeyboardFocus(
  page: import('@playwright/test').Page,
): Promise<void> {
  await page.evaluate(() => {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active !== document.body) {
      active.blur();
    }
    document.body.focus();
  });
}

/** G then secondary key navigation (with pause for React state). */
export async function gNavigate(page: import('@playwright/test').Page, secondary: string): Promise<void> {
  await ensureGlobalKeyboardFocus(page);
  await page.keyboard.press('g');
  await page.waitForTimeout(350);
  await page.keyboard.press(secondary);
  const urlPattern =
    secondary === 'i'
      ? /\/workspace\/inbox/
      : secondary === 's'
        ? /\/workspace\/stories/
        : secondary === 'e'
          ? /\/workspace\/epics/
          : /.*/;
  await expect(page).toHaveURL(urlPattern, { timeout: 20_000 });
}

/** Expand story detail modal so property rows are not obscured by the artifacts rail. */
export async function expandStoryDetailModal(
  page: import('@playwright/test').Page,
): Promise<void> {
  const expand = page.getByRole('button', { name: /Expand story detail/i });
  if (await expand.isVisible().catch(() => false)) {
    await expand.click();
    await page.waitForTimeout(300);
  }
}
