import { test, expect } from '@playwright/test';

const SCREENSHOT_DIR =
  'logs/09-functional-completion/task-09z-story-lifecycle-relations/iteration-0/artifacts';

test.describe('Story lifecycle + relations (CAP-005–007, 011, 014, 044)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/workspace/stories');
    await page.waitForSelector('[data-app-hydrated="true"]', { timeout: 20_000 });
  });

  test('drafts library, lifecycle panels, epic stories tab', async ({ page }) => {
    await page.goto('/en/workspace/stories/drafts');
    await page.waitForSelector('[data-testid="story-drafts-view"]', { timeout: 15_000 });
    await expect(page.getByTestId('story-drafts-view')).toHaveAttribute('data-cap', 'CAP-005');

    await page.goto('/en/workspace/stories');
    await page.getByText('LAN-2').first().click();
    await expect(page.getByTestId('sub-stories-list')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('story-relations-panel')).toHaveAttribute('data-cap', 'CAP-007');
    await expect(page.getByTestId('story-history-panel')).toHaveAttribute('data-cap', 'CAP-011');
    await expect(page.getByTestId('story-attachments-panel')).toHaveAttribute('data-cap', 'CAP-014');

    await page.goto('/en/workspace/stories/board');
    await expect(page.getByTestId('sub-story-progress').first()).toBeVisible({ timeout: 10_000 });

    await page.goto('/en/workspace/epics/epic-001');
    await page.getByTestId('epic-tab-stories').click();
    await expect(page.getByTestId('epic-stories-tab')).toHaveAttribute('data-cap', 'CAP-044');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09z-story-lifecycle-relations.png`,
      fullPage: true,
    });
  });
});
