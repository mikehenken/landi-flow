import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09w-dedupe-view-copy/iteration-0/artifacts';

test.describe('Deduped view metadata (task-09w)', () => {
  test.setTimeout(120_000);

  test('epic detail avoids duplicate title in overview', async ({ page }) => {
    await page.goto('/en/workspace/epics/epic-001', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });

    const overview = page.getByTestId('epic-overview-panel');
    await expect(overview).toBeVisible({ timeout: 30_000 });
    await expect(overview.locator('h2')).toHaveCount(0);

    await expect(page.getByRole('heading', { level: 1, name: 'Progressive Disclosure Shell' })).toBeVisible();

    await page.screenshot({
      path: `${LOG_DIR}/09w-epic-overview-deduped.png`,
      fullPage: true,
    });
  });
});
