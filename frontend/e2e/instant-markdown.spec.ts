import { test, expect, SCREENSHOT_DIR, navigateToStories, expandStoryDetailModal } from './fixtures';

test.describe('Differentiator: instant markdown paste', () => {
  test('pastes # Heading and renders h1 in Story editor', async ({ page }) => {
    await navigateToStories(page);

    const firstStory = page.getByTestId('story-list-item').first();
    await firstStory.click();

    const modal = page.getByTestId('story-detail-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expandStoryDetailModal(page);

    const editor = modal.getByTestId('instant-markdown-editor').locator('.instant-md-content');
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.evaluate((node) => {
      if (node instanceof HTMLElement) {
        node.focus();
      }
    });

    await page.evaluate(() => {
      const data = new DataTransfer();
      data.setData('text/plain', '# Instant Heading');
      const event = new ClipboardEvent('paste', { clipboardData: data, bubbles: true });
      document.activeElement?.dispatchEvent(event);
    });

    await expect(editor.locator('h1')).toHaveText('Instant Heading', { timeout: 10_000 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-instant-markdown-paste-h1.png`,
      fullPage: true,
    });
  });
});
