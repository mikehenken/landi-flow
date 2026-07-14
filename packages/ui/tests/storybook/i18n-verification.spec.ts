import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  EXPECTED_NAV_LABELS,
  I18N_STORY_IDS,
  SCREENSHOT_ROOT,
  screenshotPath,
  storyIframeUrl,
} from './helpers';

test.describe('Storybook i18n verification — en/es/de/ar', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOT_ROOT, { recursive: true });
  });

  for (const [locale, storyId] of Object.entries(I18N_STORY_IDS)) {
    test(`${locale}: labels, layout, truncation safeguards`, async ({ page }) => {
      await page.setViewportSize({ width: 480, height: 520 });
      await page.goto(storyIframeUrl(storyId));
      await page.waitForLoadState('networkidle');

      const showcase = page.locator('[data-testid="i18n-showcase"]');
      await expect(showcase).toBeVisible({ timeout: 15_000 });
      await expect(showcase).toHaveAttribute('data-locale', locale);

      const expectedDir = locale === 'ar' ? 'rtl' : 'ltr';
      await expect(showcase).toHaveAttribute('dir', expectedDir);

      for (const label of EXPECTED_NAV_LABELS[locale] ?? []) {
        await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
      }

      const navItems = page.locator('[data-testid="nav-items"] > div');
      const count = await navItems.count();
      expect(count).toBeGreaterThanOrEqual(3);

      for (let i = 0; i < count; i += 1) {
        const item = navItems.nth(i);
        const overflow = await item.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return {
            overflow: style.overflow,
            textOverflow: style.textOverflow,
            minWidth: style.minWidth,
          };
        });
        expect(overflow.textOverflow).toBe('ellipsis');
        expect(['0px', 'auto'].includes(overflow.minWidth) || overflow.minWidth === '0').toBe(
          true,
        );
      }

      const welcome = page.locator('[data-testid="welcome-line"]');
      await expect(welcome).toBeVisible();
      const welcomeBox = await welcome.boundingBox();
      expect(welcomeBox?.width).toBeLessThanOrEqual(220);

      const outDir = path.join(SCREENSHOT_ROOT, 'i18n');
      fs.mkdirSync(outDir, { recursive: true });
      const filePath = screenshotPath('i18n', `${locale}-navigation-showcase.png`);
      await showcase.screenshot({ path: filePath });
      expect(fs.existsSync(filePath)).toBe(true);
    });
  }

  test('Arabic RTL: document direction and mirrored nav order', async ({ page }) => {
    await page.goto(storyIframeUrl(I18N_STORY_IDS.ar));
    await page.waitForLoadState('networkidle');

    const showcase = page.locator('[data-testid="i18n-showcase"]');
    await expect(showcase).toHaveAttribute('dir', 'rtl');

    const firstNav = page.locator('[data-testid="nav-inbox"]');
    const box = await firstNav.boundingBox();
    const parentBox = await showcase.boundingBox();
    expect(box).not.toBeNull();
    expect(parentBox).not.toBeNull();
    if (box && parentBox) {
      expect(box.x + box.width).toBeLessThanOrEqual(parentBox.x + parentBox.width + 4);
    }
  });

  test('German long strings: CTA uses truncate without container overflow', async ({ page }) => {
    await page.goto(storyIframeUrl(I18N_STORY_IDS.de));
    await page.waitForLoadState('networkidle');

    const cta = page.locator('[data-testid="cta-button"]');
    await expect(cta).toBeVisible();
    const ctaStyles = await cta.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return { overflow: style.overflow, textOverflow: style.textOverflow };
    });
    expect(ctaStyles.textOverflow).toBe('ellipsis');

    const showcase = page.locator('[data-testid="i18n-showcase"]');
    const showcaseOverflow = await showcase.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(showcaseOverflow).toBe(false);
  });
});
