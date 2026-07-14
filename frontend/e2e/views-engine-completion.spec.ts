import { test, expect, navigateToStories, ensureGlobalKeyboardFocus } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ac-views-engine-completion/iteration-0/artifacts';

test.describe('Views engine completion (CAP-020,021,029,030)', () => {
  test.setTimeout(120_000);

  test('saved views index with share toggle', async ({ page }) => {
    await page.goto('/en/workspace/views', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('saved-views-index')).toBeVisible();
    const rows = page.getByTestId('saved-view-row');
    await expect(rows.first()).toBeVisible();
    await rows.first().getByTestId('saved-view-share-toggle').click();
    await page.screenshot({
      path: `${LOG_DIR}/09ac-saved-views.png`,
      fullPage: true,
    });
  });

  test('board column hide and quick-add', async ({ page }) => {
    await navigateToStories(page);
    await page.keyboard.press('Control+b');
    await expect(page).toHaveURL(/\/workspace\/stories\/board/, { timeout: 15_000 });
    await ensureGlobalKeyboardFocus(page);
    await expect(page.getByTestId('board-column-controls')).toBeVisible();
    const toggle = page.getByTestId('board-column-toggle-state-canceled');
    if (await toggle.isVisible()) {
      await toggle.click();
    }
    const quickAdd = page.getByTestId('board-column-quick-add-state-todo');
    if (await quickAdd.isVisible()) {
      await quickAdd.click();
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.screenshot({
      path: `${LOG_DIR}/09ac-board-columns.png`,
      fullPage: true,
    });
  });
});
