import { test, expect, navigateToStories } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ay-artifact-ui-progressive-disclosure/iteration-0/artifacts';

test.describe('Artifact UI progressive disclosure (ART-001)', () => {
  test.setTimeout(180_000);

  test('story detail artifact panel with expand and drill-down', async ({ page }) => {
    await navigateToStories(page);
    await page.getByTestId('story-list-item').first().click();

    const modal = page.getByTestId('story-detail-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal.getByTestId('artifact-panel')).toBeVisible();

    const summaryRow = modal.getByTestId('artifact-summary-row').first();
    if (await summaryRow.isVisible()) {
      await summaryRow.click();
      await expect(modal.getByTestId('artifact-expand-panel')).toBeVisible();
      const viewFull = modal.getByTestId('artifact-view-full').first();
      if (await viewFull.isVisible()) {
        await viewFull.click();
        await expect(modal.getByTestId('artifact-drill-down-body')).toBeVisible();
      }
    }

    await page.screenshot({
      path: `${LOG_DIR}/09ay-story-artifacts.png`,
      fullPage: true,
    });
  });
});
