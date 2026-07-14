import {
  test,
  expect,
  SCREENSHOT_DIR,
  navigateToStories,
  ensureGlobalKeyboardFocus,
  gNavigate,
} from './fixtures';

test.describe('Differentiator: easier-than-Linear discoverability', () => {
  test('command palette opens with suggested actions via Cmd+K', async ({ page }) => {
    await ensureGlobalKeyboardFocus(page);
    await page.keyboard.press('Control+k');
    const palette = page.getByTestId('command-palette');
    await expect(palette).toBeVisible({ timeout: 10_000 });
    await expect(palette.locator('[cmdk-input], input').first()).toBeVisible();
    await expect(palette.getByText(/Create Story|Epic|Inbox/i).first()).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-command-palette-discoverability.png`,
      fullPage: true,
    });
  });

  test('G-key navigation jumps to Stories and Epics', async ({ page }) => {
    await ensureGlobalKeyboardFocus(page);
    await page.keyboard.press('g');
    await expect(
      page.getByRole('complementary', { name: 'Main navigation' }).getByText('S', { exact: true }),
    ).toBeVisible({ timeout: 3_000 });
    await page.keyboard.press('s');
    await expect(page).toHaveURL(/\/workspace\/stories/, { timeout: 15_000 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-keyboard-nav-stories.png`,
      fullPage: true,
    });

    await gNavigate(page, 'e');
    await expect(page).toHaveURL(/\/workspace\/epics/, { timeout: 15_000 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-keyboard-nav-epics.png`,
      fullPage: true,
    });
  });

  test('sidebar shows primary navigation targets', async ({ page }) => {
    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Inbox' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'My Stories' })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Epic Board', exact: true })).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-sidebar-navigation.png`,
      fullPage: true,
    });
  });

  test('sidebar click navigates to Stories', async ({ page }) => {
    await navigateToStories(page);
    await expect(page.getByTestId('story-list-item').first()).toBeVisible();
  });
});
