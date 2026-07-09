import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ab-settings-taxonomy-templates/iteration-0/artifacts';

test.describe('Settings taxonomy & templates (CAP-008,009,090-098)', () => {
  test.setTimeout(120_000);

  test('taxonomy settings surfaces render persisted seed data', async ({ page }) => {
    await page.goto('/en/workspace/settings/taxonomy', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('taxonomy-settings-panel')).toBeVisible();
    await expect(page.getByTestId('workflow-states-list')).toBeVisible();
    await expect(page.getByTestId('story-templates-list')).toBeVisible();
    await expect(page.getByTestId('custom-emoji-list')).toBeVisible();

    await page.screenshot({
      path: `${LOG_DIR}/09ab-taxonomy-settings.png`,
      fullPage: true,
    });
  });

  test('story template applies in create modal', async ({ page }) => {
    await page.goto('/en/workspace/stories', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.getByTestId('create-resource-dropdown-trigger').click();
    await page.getByTestId('create-dropdown-story').click();
    await expect(page.getByTestId('create-story-modal')).toBeVisible();
    await page.getByTestId('create-story-template').click();
    await page.getByRole('option', { name: 'Bug report' }).click();
    await expect(page.getByTestId('create-story-title')).toHaveValue('Bug: ');
  });
});
