import path from 'node:path';
import { test, expect } from '@playwright/test';
import { SCREENSHOT_DIR, waitForAppReady } from './fixtures';

const BOARD_PATH = '/en/workspace/stories/board';
const EPIC_DETAIL_PATH = '/en/workspace/epics/epic-001';
const TASK_PROOF_DIR = path.resolve(
  __dirname,
  '../../logs/09-functional-completion/task-09r-board-epic-views-shortcut-parity/iteration-0/artifacts',
);

async function gotoBoard(page: import('@playwright/test').Page): Promise<void> {
  await waitForAppReady(page);
  await page.evaluate(() => {
    window.localStorage.removeItem('landi-flow:board-group-by');
  });

  const boardLink = page.getByRole('link', { name: /Story Board/i });
  if (await boardLink.isVisible().catch(() => false)) {
    await boardLink.click();
  } else {
    await page.goto(BOARD_PATH, { waitUntil: 'networkidle' });
  }

  await expect(page).toHaveURL(/\/workspace\/stories\/board/, { timeout: 20_000 });
  await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 30_000 });
  await expect(page.getByTestId('board-toolbar')).toBeVisible({ timeout: 30_000 });
}

test.describe('Board & epic views Shortcut parity (CAP-019, 031, 043, 048, 049)', () => {
  test('demonstrates all Vital CAPs on dev routes', async ({ page }) => {
    test.setTimeout(120_000);

    await gotoBoard(page);

    await expect(page.getByTestId('board-toolbar')).toHaveAttribute('data-cap', 'CAP-019');
    await expect(page.getByTestId('board-columns-grid')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('board-story-card').first()).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: path.join(TASK_PROOF_DIR, 'board-flat-cap-019.png'),
      fullPage: true,
    });

    await page.getByTestId('board-group-by-epic').click();
    const swimlanes = page.getByTestId('board-swimlanes-view');
    await expect(swimlanes).toBeVisible({ timeout: 15_000 });
    await expect(swimlanes).toHaveAttribute('data-cap', 'CAP-031');

    await page.screenshot({
      path: path.join(TASK_PROOF_DIR, 'board-swimlanes-epic-cap-031.png'),
      fullPage: true,
    });

    await page.getByTestId('board-group-by-cycle').click();
    await expect(page.getByTestId('board-swimlanes-view')).toBeVisible({ timeout: 15_000 });

    await page.goto(EPIC_DETAIL_PATH, { waitUntil: 'networkidle' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 30_000 });

    await expect(page.getByTestId('epic-overview-panel')).toHaveAttribute('data-cap', 'CAP-043');
    await expect(page.getByTestId('epic-burnup-chart')).toHaveAttribute('data-cap', 'CAP-048');
    await expect(page.getByTestId('epic-activity-feed')).toHaveAttribute('data-cap', 'CAP-049');
    await expect(page.getByTestId('epic-activity-item').first()).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: path.join(TASK_PROOF_DIR, 'epic-detail-overview-cap-043-048-049.png'),
      fullPage: true,
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'epic-detail-overview-cap-043-048-049.png'),
      fullPage: true,
    });

    await page.getByTestId('epic-tab-stories').click();
    const storyItems = page.getByTestId('story-list-item');
    await expect(storyItems.first()).toBeVisible({ timeout: 15_000 });
    const storyCount = await storyItems.count();
    expect(storyCount).toBeGreaterThanOrEqual(3);
  });
});
