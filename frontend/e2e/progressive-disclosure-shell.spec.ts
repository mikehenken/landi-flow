import { test, expect, navigateToStories } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09al-progressive-disclosure-shell/iteration-0/artifacts';

test.describe('Progressive disclosure shell (IDEA-001)', () => {
  test.setTimeout(120_000);

  test('view options drawer with advanced panel collapsed by default', async ({ page }) => {
    await navigateToStories(page);
    await page.getByTestId('view-options-trigger').click();
    await expect(page.getByTestId('view-options-drawer')).toBeVisible();
    await expect(page.getByTestId('progressive-disclosure-shell')).toBeVisible();
    await expect(page.getByTestId('view-options-defaults')).toBeVisible();
    await expect(page.getByTestId('view-options-advanced-panel')).not.toBeVisible();
    await page.getByTestId('view-options-advanced-toggle').click();
    await expect(page.getByTestId('view-options-advanced-panel')).toBeVisible();
    await page.screenshot({
      path: `${LOG_DIR}/09al-view-options-drawer.png`,
      fullPage: true,
    });
  });
});
