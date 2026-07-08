import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09af-cycles-sprint-engine/iteration-0/artifacts';

test.describe('Cycles sprint engine (CAP-061,062)', () => {
  test.setTimeout(120_000);

  test('cycles list and automation panel', async ({ page }) => {
    await page.goto('/en/workspace/settings/cycles', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('cycles-panel')).toBeVisible();
    await expect(page.getByTestId('cycles-list')).toBeVisible();
    await expect(page.getByTestId('cycle-automation-panel')).toBeVisible();

    await page.screenshot({
      path: `${LOG_DIR}/09af-cycles-panel.png`,
      fullPage: true,
    });
  });

  test('cycle automation run records timestamp', async ({ page }) => {
    await page.goto('/en/workspace/settings/cycles', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.getByTestId('cycle-automation-run').click();
    await expect(page.getByTestId('cycle-automation-panel')).not.toContainText('Never');
  });
});
