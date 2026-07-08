import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09as-recurring-stories-team-automation/iteration-0/artifacts';

test.describe('Recurring stories team automation (CAP-010)', () => {
  test.setTimeout(120_000);

  test('recurring rules CRUD and spawn proof', async ({ page }) => {
    await page.goto('/en/workspace/settings/recurring-stories', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('recurring-stories-panel')).toBeVisible();
    await expect(page.getByTestId('recurring-rules-list')).toBeVisible();
    const runButton = page.getByTestId('recurring-rule-run').first();
    if (await runButton.isVisible()) {
      await runButton.click();
      await expect(page.getByTestId('recurring-spawn-proof')).toBeVisible({ timeout: 10_000 });
    }
    await page.screenshot({
      path: `${LOG_DIR}/09as-recurring-stories.png`,
      fullPage: true,
    });
  });
});
