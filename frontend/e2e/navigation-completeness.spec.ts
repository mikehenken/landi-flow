import { test, expect, ensureGlobalKeyboardFocus } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ad-navigation-completeness/iteration-0/artifacts';

test.describe('Navigation completeness (CAP-036-040)', () => {
  test.setTimeout(120_000);

  test('my issues four tabs show distinct counts', async ({ page }) => {
    await page.goto('/en/workspace/my-issues', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('my-issues-tabs')).toBeVisible();
    for (const tab of ['assigned', 'created', 'subscribed', 'activity'] as const) {
      await expect(page.getByTestId(`my-issues-tab-${tab}`)).toBeVisible();
    }
    await page.getByTestId('my-issues-tab-created').click();
    await page.screenshot({
      path: `${LOG_DIR}/09ad-my-issues-tabs.png`,
      fullPage: true,
    });
  });

  test('workspace switcher lists registry workspaces', async ({ page }) => {
    await page.goto('/en/workspace/inbox', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.getByTestId('workspace-switcher-trigger').click();
    await expect(page.getByTestId('workspace-switcher-menu')).toBeVisible();
    await expect(page.getByTestId('workspace-option-acme-agency')).toBeVisible();
  });

  test('keyboard shortcuts overlay via ? key', async ({ page }) => {
    await ensureGlobalKeyboardFocus(page);
    await page.keyboard.press('?');
    await expect(page.getByTestId('keyboard-shortcuts-overlay')).toBeVisible({
      timeout: 5_000,
    });
    await page.screenshot({
      path: `${LOG_DIR}/09ad-keyboard-shortcuts.png`,
      fullPage: true,
    });
  });
});
