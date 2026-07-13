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

  test('signal preview modal opens, renders content, and closes', async ({ page }) => {
    await navigateToStories(page);

    const storyItems = page.getByTestId('story-list-item');
    const count = await storyItems.count();
    let previewOpened = false;

    for (let index = 0; index < Math.min(count, 12); index += 1) {
      await storyItems.nth(index).click();
      const modal = page.getByTestId('story-detail-modal');
      await expect(modal).toBeVisible({ timeout: 15_000 });

      const openPreview = modal.getByTestId('signal-open-preview');
      if (!(await openPreview.first().isVisible())) {
        const signalRow = modal.getByTestId('story-signal-row').first();
        if (await signalRow.isVisible()) {
          await signalRow.click();
        }
      }

      if (await openPreview.first().isVisible()) {
        await openPreview.first().click();
        const previewModal = page.getByTestId('signal-content-preview-modal');
        await expect(previewModal).toBeVisible({ timeout: 10_000 });

        const markdown = previewModal.getByTestId('signal-preview-markdown');
        const json = previewModal.getByTestId('signal-preview-json');
        const text = previewModal.getByTestId('signal-preview-text');
        const csv = previewModal.getByTestId('signal-preview-csv');
        const jsonl = previewModal.getByTestId('signal-preview-jsonl');
        const hasRenderer =
          (await markdown.isVisible()) ||
          (await json.isVisible()) ||
          (await text.isVisible()) ||
          (await csv.isVisible()) ||
          (await jsonl.isVisible());
        expect(hasRenderer).toBe(true);

        if (await markdown.isVisible()) {
          await expect(markdown.locator('.instant-md-content')).toBeVisible();
        }

        await previewModal.getByTestId('signal-preview-close').click();
        await expect(previewModal).not.toBeVisible();

        previewOpened = true;
        await page.screenshot({
          path: `${LOG_DIR}/signal-content-preview-modal.png`,
          fullPage: true,
        });
        break;
      }

      await page.keyboard.press('Escape');
    }

    expect(previewOpened).toBe(true);
  });
});
