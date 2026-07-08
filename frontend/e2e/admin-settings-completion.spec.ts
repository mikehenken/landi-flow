import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09aj-admin-settings-completion/iteration-1/artifacts';

test.describe('Admin settings completion (CAP-099,100,102,103,106,108)', () => {
  test.setTimeout(120_000);

  test('workspace general settings panel renders', async ({ page }) => {
    await page.goto('/en/workspace/settings/general', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('workspace-general-settings')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `${LOG_DIR}/09aj-general-settings.png`, fullPage: true });
  });

  test('workspace save reflects in shell (CAP-099)', async ({ page }) => {
    const updatedName = `Landi QA ${Date.now()}`;

    await page.goto('/en/workspace/settings/general', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.getByTestId('workspace-name-input').fill(updatedName);
    await page.getByTestId('workspace-general-save').click();
    await expect(page.getByTestId('workspace-general-saved')).toBeVisible();

    await page.goto('/en/workspace/inbox', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('workspace-switcher-trigger')).toContainText(updatedName);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('workspace-switcher-trigger')).toContainText(updatedName);

    await page.screenshot({
      path: `${LOG_DIR}/09aj-workspace-shell-updated.png`,
      fullPage: true,
    });
  });

  test('teams admin panel renders', async ({ page }) => {
    await page.goto('/en/workspace/settings/teams', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('teams-admin-panel')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `${LOG_DIR}/09aj-teams-settings.png`, fullPage: true });
  });

  test('team create persists after reload (CAP-100)', async ({ page }) => {
    const suffix = Date.now().toString().slice(-6);
    const teamName = `QA Team ${suffix}`;
    const teamSlug = `qa-${suffix}`;
    const teamKey = `Q${suffix.slice(0, 3).toUpperCase()}`;

    await page.goto('/en/workspace/settings/teams', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.getByTestId('team-create-name').fill(teamName);
    await page.getByTestId('team-create-slug').fill(teamSlug);
    await page.getByTestId('team-create-key').fill(teamKey);
    await page.getByTestId('team-create-submit').click();
    await expect(page.getByTestId('team-admin-row').filter({ hasText: teamName })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('team-admin-row').filter({ hasText: teamName })).toBeVisible();

    await page.screenshot({
      path: `${LOG_DIR}/09aj-team-create-persisted.png`,
      fullPage: true,
    });
  });

  test('security invite links panel renders', async ({ page }) => {
    await page.goto('/en/workspace/settings/security', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('security-settings-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('sla-rules-panel')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `${LOG_DIR}/09aj-security-settings.png`, fullPage: true });
  });

  test('apps and import panels render', async ({ page }) => {
    await page.goto('/en/workspace/settings/apps', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('application-members-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('authorized-apps-panel')).toBeVisible({ timeout: 30_000 });

    await page.goto('/en/workspace/settings/import', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('import-export-panel')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: `${LOG_DIR}/09aj-import-settings.png`, fullPage: true });
  });

  test('CSV import creates persisted story rows (CAP-108)', async ({ page }) => {
    const uniqueTitle = `Imported CSV ${Date.now()}`;
    const csvText = `title,description,priority\n${uniqueTitle},From CSV,medium`;

    await page.goto('/en/workspace/settings/import', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.getByTestId('csv-import-textarea').fill(csvText);
    await page.getByTestId('csv-import-submit').click();
    await expect(page.getByTestId('csv-import-result')).toContainText('Imported 1 stories');

    await page.goto('/en/workspace/stories', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('story-list-item').filter({ hasText: uniqueTitle })).toBeVisible({
      timeout: 15_000,
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('story-list-item').filter({ hasText: uniqueTitle })).toBeVisible({
      timeout: 15_000,
    });

    await page.screenshot({
      path: `${LOG_DIR}/09aj-csv-import-persisted.png`,
      fullPage: true,
    });
  });
});
