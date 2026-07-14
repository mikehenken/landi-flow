/** Retry failed task-10b captures (iteration 2). */
import fs from 'node:fs';
import path from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

const ITERATION = '2';
const SCREENSHOT_DIR = path.resolve(
  __dirname,
  `../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/10-testing/task-10b-visual-regression-i18n/iteration-${ITERATION}/screenshots`,
);
const HYDRATION = 'html[data-app-hydrated="true"]';
const INBOX = '/en/workspace/inbox';

const RETRY_ROWS = [
  { row_id: 'FHITM-095', file: 'fhitm-095-cap-103.png', url: '/en/workspace/settings/security', testId: 'security-settings-panel' },
  { row_id: 'FHITM-098', file: 'fhitm-098-cap-107.png', url: '/en/workspace/settings/billing', testId: 'billing-settings-panel' },
  { row_id: 'FHITM-104', file: 'fhitm-104-art-001.png', url: '/en/workspace/stories', action: 'story-detail' as const },
];

async function captureRow(page: Page, row: (typeof RETRY_ROWS)[number]): Promise<void> {
  await page.goto(row.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector(HYDRATION, { timeout: 45_000 });
  if (row.action === 'story-detail') {
    const first = page.getByTestId('story-list-item').first();
    if (await first.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await first.click();
      await page.getByTestId('story-detail-modal').waitFor({ timeout: 15_000 });
    }
  } else if (row.testId) {
    await expect(page.getByTestId(row.testId)).toBeVisible({ timeout: 30_000 });
  }
  const out = path.join(SCREENSHOT_DIR, row.file);
  await page.screenshot({ path: out, fullPage: true });
  expect(fs.statSync(out).size).toBeGreaterThan(800);
}

const test = base.extend({});

test.describe('task-10b retry failed captures', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(INBOX, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector(HYDRATION, { timeout: 45_000 });
  });

  for (const row of RETRY_ROWS) {
    test(`retry ${row.row_id}`, async ({ page }) => {
      await captureRow(page, row);
    });
  }
});
