import { test, expect, navigateToStories } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09aq-bidirectional-comment-flows/iteration-0/artifacts';

test.describe('Bidirectional comment flows (MCP-IDE-002)', () => {
  test.setTimeout(180_000);

  test('unified comments show human, agent, and system badges', async ({ page }) => {
    await navigateToStories(page);
    await page.getByTestId('story-list-item').first().click();

    const modal = page.getByTestId('story-detail-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal.getByTestId('unified-comments-panel')).toBeVisible();
    await expect(modal.getByTestId('comment-attribution-human').first()).toBeVisible();
    await expect(modal.getByTestId('comment-attribution-agent').first()).toBeVisible();
    await expect(modal.getByTestId('comment-attribution-system').first()).toBeVisible();
    await page.screenshot({
      path: `${LOG_DIR}/09aq-comment-attribution.png`,
      fullPage: true,
    });
  });

  test('post human comment persists in thread', async ({ page }) => {
    await navigateToStories(page);
    await page.getByTestId('story-list-item').first().click();

    const modal = page.getByTestId('story-detail-modal');
    await expect(modal.getByTestId('unified-comment-input')).toBeVisible({ timeout: 15_000 });
    await modal.getByTestId('unified-comment-input').fill('E2E comment from human');
    await modal.getByTestId('unified-comment-post').click();
    await expect(modal.getByText('E2E comment from human')).toBeVisible();
  });
});
