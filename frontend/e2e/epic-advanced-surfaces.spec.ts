import { test, expect, waitForAppReady } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09at-epic-advanced-surfaces/iteration-0/artifacts';

test.describe('Epic advanced surfaces (CAP-045,046,047)', () => {
  test.setTimeout(180_000);

  test('epic detail customers, views, and team sub-tabs', async ({ page }) => {
    await waitForAppReady(page);
    await page.goto('/en/workspace/epics/epic-001', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 60_000 });

    await page.getByTestId('epic-tab-customers').click();
    await expect(page.getByTestId('epic-customers-tab')).toBeVisible();
    await page.screenshot({
      path: `${LOG_DIR}/09at-epic-customers-tab.png`,
      fullPage: true,
    });

    await page.getByTestId('epic-tab-views').click();
    await expect(page.getByTestId('epic-attached-views-tab')).toBeVisible();

    await page.getByTestId('epic-tab-stories').click();
    await expect(page.getByTestId('epic-team-subtabs')).toBeVisible();
    await page.screenshot({
      path: `${LOG_DIR}/09at-epic-team-subtabs.png`,
      fullPage: true,
    });
  });
});
