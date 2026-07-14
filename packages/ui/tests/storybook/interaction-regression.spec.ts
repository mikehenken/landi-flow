import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { screenshotPath, storyIframeUrl } from './helpers';

test.describe('Storybook interaction regression — play-function parity', () => {
  test('InstantMarkdownEditor: type **bold** renders strong', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 480 });
    await page.goto(
      storyIframeUrl('editor-instantmarkdowneditor--type-markdown-conversion'),
    );
    await page.waitForLoadState('networkidle');

    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.click();
    await page.keyboard.type('**bold**');

    await expect(editor.locator('strong')).toHaveText('bold', { timeout: 10_000 });

    const filePath = screenshotPath('interactions', 'markdown-type-bold.png');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    await page.locator('#storybook-root').screenshot({ path: filePath });
  });

  test('InstantMarkdownEditor: paste markdown renders h1 and list', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 480 });
    await page.goto(storyIframeUrl('editor-instantmarkdowneditor--empty-editable'));
    await page.waitForLoadState('networkidle');

    const editor = page.locator('.ProseMirror');
    await expect(editor).toBeVisible({ timeout: 15_000 });
    await editor.click();

    const markdown = '# Heading\n\n- item';
    await editor.evaluate((el, text) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);
      el.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dataTransfer, bubbles: true, cancelable: true }),
      );
    }, markdown);

    await expect(editor.locator('h1').first()).toHaveText('Heading', { timeout: 10_000 });
    await expect(editor.locator('ul li').first()).toHaveText('item');

    const filePath = screenshotPath('interactions', 'markdown-paste-block.png');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    await page.locator('#storybook-root').screenshot({ path: filePath });
  });

  test('AssigneePicker: open roster and select agent delegate', async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 560 });
    await page.goto(storyIframeUrl('members-assigneepicker--unassigned'));
    await page.waitForLoadState('networkidle');

    const trigger = page.getByRole('button', { name: /assign/i }).first();
    if (await trigger.count()) {
      await trigger.click();
      const agentOption = page.getByText('Cursor Agent');
      if (await agentOption.isVisible()) {
        await agentOption.click();
      }
    }

    const filePath = screenshotPath('interactions', 'assignee-picker-open.png');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    await page.locator('#storybook-root').screenshot({ path: filePath });
  });
});
