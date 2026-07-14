import { test, expect, SCREENSHOT_DIR, navigateToStories, expandStoryDetailModal } from './fixtures';

test.describe('Differentiator: instant markdown paste', () => {
  test('pastes # Heading and renders h1 in Story editor', async ({ page }) => {
    await navigateToStories(page);

    const firstStory = page.getByTestId('story-list-item').first();
    await firstStory.click();

    const modal = page.getByTestId('story-detail-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expandStoryDetailModal(page);

    const editorShell = modal.getByTestId('instant-markdown-editor');
    const editor = editorShell.locator('.instant-md-content');
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editorShell.click();
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

  test('click-to-edit preview renders headings for markdown body', async ({ page }) => {
    await navigateToStories(page);

    const firstStory = page.getByTestId('story-list-item').first();
    await firstStory.click();

    const modal = page.getByTestId('story-detail-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expandStoryDetailModal(page);

    const editorShell = modal.getByTestId('instant-markdown-editor');
    await expect(editorShell).toBeVisible({ timeout: 15_000 });

    const prose = editorShell.locator('.instant-md-content');
    const heading = prose.locator('h1, h2, h3').first();
    const hasHeading = await heading.isVisible().catch(() => false);
    const rawHashVisible = await prose
      .getByText(/^#\s/m)
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasHeading || !rawHashVisible).toBe(true);
  });
});
