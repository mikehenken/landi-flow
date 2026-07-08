import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  SCREENSHOT_ROOT,
  VISUAL_TARGETS,
  screenshotPath,
  storyIframeUrl,
} from './helpers';

test.describe('Storybook visual regression — @landi-flow/ui', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_ROOT, { recursive: true });
  });

  for (const target of VISUAL_TARGETS) {
    test(`captures ${target.name} (${target.brand})`, async ({ page }) => {
      const viewport = target.fullscreen
        ? { width: 1280, height: 720 }
        : { width: 480, height: 400 };
      await page.setViewportSize(viewport);
      await page.goto(storyIframeUrl(target.storyId));
      await page.waitForLoadState('networkidle');

      const storyRoot = page.locator('#storybook-root');
      await expect(storyRoot).toBeVisible({ timeout: 15_000 });

      const outDir = path.join(SCREENSHOT_ROOT, 'visual', target.brand);
      fs.mkdirSync(outDir, { recursive: true });
      const filePath = screenshotPath(
        `visual/${target.brand}`,
        `${target.name}.png`,
      );

      await storyRoot.screenshot({ path: filePath });
      expect(fs.existsSync(filePath)).toBe(true);
    });
  }

  test('all-locales matrix renders four panels', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 600 });
    await page.goto(storyIframeUrl('i18n-navigationshowcase--all-locales'));
    await page.waitForLoadState('networkidle');

    const showcases = page.locator('[data-testid="i18n-showcase"]');
    await expect(showcases).toHaveCount(4);

    const filePath = screenshotPath('visual', 'i18n-all-locales-matrix.png');
    await page.locator('#storybook-root').screenshot({ path: filePath });
    expect(fs.existsSync(filePath)).toBe(true);
  });
});
