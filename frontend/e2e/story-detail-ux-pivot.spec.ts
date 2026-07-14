import { test, expect, SCREENSHOT_DIR, navigateToStories } from './fixtures';

const STORY_DETAIL_LAYOUT_KEY = 'landi-flow:story-detail-layout';

test.describe('Story detail UX pivot (task-09p)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storageKey) => {
      window.localStorage.removeItem(storageKey);
    }, STORY_DETAIL_LAYOUT_KEY);
  });

  test('opens story in modal by default with single properties surface', async ({ page }) => {
    await navigateToStories(page);

    await page.getByTestId('story-list-item').first().click();

    const modal = page.getByTestId('story-detail-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal.getByTestId('story-detail-body')).toBeVisible();
    await expect(modal.getByTestId('instant-markdown-editor')).toBeVisible();
    await expect(modal.getByTestId('story-detail-property-chips')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Properties' })).toHaveCount(0);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09p-story-detail-modal-default.png`,
      fullPage: true,
    });
  });

  test('changes status in at most two clicks from detail modal', async ({ page }) => {
    await navigateToStories(page);

    await page.getByTestId('story-list-item').first().click();
    await expect(page.getByTestId('story-detail-modal')).toBeVisible({ timeout: 10_000 });

    const modal = page.getByTestId('story-detail-modal');
    const statusChip = modal.getByTestId('story-status-picker');
    await statusChip.click();

    const doneOption = page.getByRole('option', { name: /done/i }).first();
    await expect(doneOption).toBeVisible({ timeout: 5_000 });
    await doneOption.click();

    await expect(statusChip).toContainText(/done/i, { timeout: 5_000 });
  });
});
