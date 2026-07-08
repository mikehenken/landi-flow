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
  '../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/11-qa/task-11-qa/qa-proof',
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
