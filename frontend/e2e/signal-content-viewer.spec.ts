import { test, expect, navigateToStories } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-signal-content-viewer/iteration-0/artifacts';

test.describe('Signal content viewer (MCP-IDE-003)', () => {
  test.setTimeout(180_000);

  test('story signals panel expands with kind-aware content viewer', async ({ page }) => {
    await navigateToStories(page);

    const storyItems = page.getByTestId('story-list-item');
    const count = await storyItems.count();
    let opened = false;

    for (let index = 0; index < Math.min(count, 8); index += 1) {
      await storyItems.nth(index).click();
      const modal = page.getByTestId('story-detail-modal');
      await expect(modal).toBeVisible({ timeout: 15_000 });

      const signalsPanel = modal.getByTestId('story-signals-panel');
      if (await signalsPanel.isVisible()) {
        const signalRow = modal.getByTestId('story-signal-row').first();
        if (await signalRow.isVisible()) {
          await signalRow.click();
          await expect(modal.getByTestId('story-signal-expand-panel')).toBeVisible();
          await expect(modal.getByTestId('signal-content-viewer')).toBeVisible();
          opened = true;
          break;
        }
      }

      await page.keyboard.press('Escape');
    }

    expect(opened).toBe(true);

    await page.screenshot({
      path: `${LOG_DIR}/signal-content-viewer-expanded.png`,
      fullPage: true,
    });
  });
});
