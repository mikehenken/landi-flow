import { test, expect, SCREENSHOT_DIR, navigateToStories } from './fixtures';

async function openStoryByTitle(
  page: import('@playwright/test').Page,
  title: string,
): Promise<void> {
  await navigateToStories(page);
  const story = page.getByTestId('story-list-item').filter({ hasText: title });
  await story.first().click();
}

test.describe('Post-hoc delegate attribution (task-09l)', () => {
  test('attribution-only agent shows Attributed badge without Action Bus live session', async ({
    page,
  }) => {
    await openStoryByTitle(page, 'Document agent runtime metadata');

    const picker = page.getByTestId('story-agent-delegate-picker');
    await expect(picker).toBeVisible({ timeout: 15_000 });

    const badge = page.getByTestId('delegate-attribution-badge');
    await expect(badge).toContainText(/Attributed to/i);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09l-agent-delegate-attribution.png`,
      fullPage: true,
    });
  });

  test('assign native built-in agent still routes through Action Bus', async ({ page }) => {
    await navigateToStories(page);

    const firstStory = page.getByTestId('story-list-item').first();
    await firstStory.click();

    const picker = page.getByTestId('story-agent-delegate-picker');
    await picker.click();

    const builtinOption = page.getByRole('option', { name: /Landi Flow Agent/i });
    await expect(builtinOption).toBeVisible();
    await builtinOption.click();

    const status = page.getByRole('status');
    await expect(status).toContainText(/Action Bus|picked up|Handoff/i, { timeout: 15_000 });
  });
});
