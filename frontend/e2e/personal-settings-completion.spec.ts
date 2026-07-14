import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ak-personal-settings-completion/iteration-1/artifacts';

test.describe('Personal settings completion (CAP-110,111,112,089)', () => {
  test.setTimeout(120_000);

  test('account settings surfaces render', async ({ page }) => {
    await page.goto('/en/workspace/account/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('personal-profile-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('notification-prefs-panel')).toBeVisible();
    await expect(page.getByTestId('connected-accounts-panel')).toBeVisible();
    await expect(page.getByTestId('personal-api-keys-panel')).toBeVisible();
    await page.screenshot({ path: `${LOG_DIR}/09ak-personal-settings.png`, fullPage: true });
  });

  test('profile save survives reload (CAP-110)', async ({ page }) => {
    const updatedName = `QA Profile ${Date.now()}`;

    await page.goto('/en/workspace/account/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.getByTestId('profile-display-name').fill(updatedName);
    await page.getByTestId('profile-save').click();
    await expect(page.getByTestId('profile-saved-message')).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('profile-display-name')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('profile-display-name')).toHaveValue(updatedName, {
      timeout: 15_000,
    });

    await page.screenshot({
      path: `${LOG_DIR}/09ak-profile-reload-persisted.png`,
      fullPage: true,
    });
  });

  test('API key create persists in list (CAP-112)', async ({ page }) => {
    await page.goto('/en/workspace/account/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.getByTestId('api-key-create').click();
    await expect(page.getByTestId('api-key-issued')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('api-key-row').first()).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('api-key-row').first()).toBeVisible();

    await page.screenshot({
      path: `${LOG_DIR}/09ak-api-key-created.png`,
      fullPage: true,
    });
  });

  test('connected accounts reflect honest persisted state (CAP-089)', async ({ page }) => {
    await page.goto('/en/workspace/account/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });

    const googleToggle = page.getByTestId('connected-account-google');
    await expect(googleToggle).toBeVisible({ timeout: 15_000 });
    const initialConnected = (await googleToggle.getAttribute('data-connected')) === 'true';

    await googleToggle.click();
    await expect(googleToggle).toHaveAttribute(
      'data-connected',
      initialConnected ? 'false' : 'true',
    );

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('connected-account-google')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('connected-account-google')).toHaveAttribute(
      'data-connected',
      initialConnected ? 'false' : 'true',
      { timeout: 15_000 },
    );

    await page.screenshot({
      path: `${LOG_DIR}/09ak-connected-accounts-honest-state.png`,
      fullPage: true,
    });
  });
});
