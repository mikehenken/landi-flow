import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ae-milestones-epic-dependencies/iteration-0/artifacts';

test.describe('Milestones & epic dependencies (CAP-050-055)', () => {
  test.setTimeout(120_000);

  test('epic milestones sidebar and dependencies tab', async ({ page }) => {
    await page.goto('/en/workspace/epics/epic-001', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('epic-milestones-panel')).toBeVisible();
    await expect(page.getByTestId('milestone-item').first()).toBeVisible();

    await page.getByTestId('epic-tab-dependencies').click();
    await expect(page.getByTestId('epic-dependencies-panel')).toBeVisible();
    await expect(page.getByTestId('epic-dependency-item').first()).toBeVisible();

    await page.screenshot({
      path: `${LOG_DIR}/09ae-milestones-dependencies.png`,
      fullPage: true,
    });
  });

  test('create milestone persists in sidebar', async ({ page }) => {
    await page.goto('/en/workspace/epics/epic-001', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    const before = await page.getByTestId('milestone-item').count();
    await page.getByTestId('milestone-create-input').fill('Gamma release');
    await page.getByTestId('milestone-create').click();
    await expect(page.getByTestId('milestone-item')).toHaveCount(before + 1);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByText('Gamma release')).toBeVisible();
  });
});
