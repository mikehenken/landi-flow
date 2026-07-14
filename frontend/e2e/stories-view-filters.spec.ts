import {
  test,
  expect,
  SCREENSHOT_DIR,
  navigateToStories,
  ensureGlobalKeyboardFocus,
} from './fixtures';
import path from 'node:path';

const STORY_LOG_DIR = path.resolve(
  __dirname,
  '../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/09-functional-completion/task-09s-list-filters-search-board-toggle/iteration-0/screenshots',
);

test.describe('Stories view filters, display, board toggle (task-09s)', () => {
  test.setTimeout(120_000);

  test('filter and display overlays apply on list view', async ({ page }) => {
    await navigateToStories(page);
    await ensureGlobalKeyboardFocus(page);

    await expect(page.getByTestId('stories-view-toolbar')).toBeVisible();

    await page.getByTestId('stories-view-filter-trigger').click();
    await expect(page.getByTestId('filter-panel')).toBeVisible();
    await page.getByTestId('filter-panel-field-select').selectOption('status');
    await page.getByTestId('filter-panel-value-select').selectOption('done');
    await page.getByTestId('filter-panel-add').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('filter-panel')).not.toBeVisible();

    const visibleItems = page.getByTestId('story-list-item');
    await expect(visibleItems.first()).toBeVisible();
    const countAfterFilter = await visibleItems.count();
    expect(countAfterFilter).toBeGreaterThan(0);

    await page.getByTestId('stories-view-display-trigger').click();
    await expect(page.getByTestId('display-panel')).toBeVisible();
    await page.getByTestId('display-panel-show-sub-stories').click();
    await page.keyboard.press('Escape');

    await page.screenshot({
      path: `${STORY_LOG_DIR}/09s-filter-display-overlays.png`,
      fullPage: true,
    });
  });

  test('Cmd+B toggles list/board layout', async ({ page }) => {
    await navigateToStories(page);
    await ensureGlobalKeyboardFocus(page);

    await page.keyboard.press('Control+b');
    await expect(page).toHaveURL(/\/workspace\/stories\/board/, { timeout: 15_000 });

    await page.keyboard.press('Control+b');
    await expect(page).toHaveURL(/\/workspace\/stories\/?(\?.*)?$/, { timeout: 15_000 });

    await page.screenshot({
      path: `${STORY_LOG_DIR}/09s-cmd-b-layout-toggle.png`,
      fullPage: true,
    });
  });

  test('bulk actions persist for selected stories', async ({ page }) => {
    await navigateToStories(page);
    await ensureGlobalKeyboardFocus(page);

    const checkboxes = page.getByTestId('story-list-select');
    const total = await checkboxes.count();
    test.skip(total < 2, 'Need at least two stories for bulk select');

    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await expect(page.getByTestId('bulk-action-bar')).toBeVisible();

    const selectedTitles = await page.getByTestId('story-list-item').nth(0).innerText();
    void selectedTitles;

    await page.getByTestId('bulk-action-priority-select').selectOption('urgent');
    await page.getByTestId('bulk-action-apply-priority').click();
    await expect(page.getByTestId('bulk-action-bar')).not.toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('urgent').first()).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 30_000 });

    await expect(page.getByText('urgent').first()).toBeVisible();

    await page.screenshot({
      path: `${STORY_LOG_DIR}/09s-bulk-priority-persist.png`,
      fullPage: true,
    });
  });

  test('manual list drag ordering survives refresh', async ({ page }) => {
    await navigateToStories(page);
    const firstItem = page.getByTestId('story-list-item').first();
    const secondItem = page.getByTestId('story-list-item').nth(1);
    const firstTitle = await firstItem.innerText();
    const secondTitle = await secondItem.innerText();

    await firstItem.dragTo(secondItem);
    await page.waitForTimeout(500);

    const reorderedFirst = await page.getByTestId('story-list-item').first().innerText();
    expect(reorderedFirst).not.toBe(firstTitle);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 30_000 });

    const afterReloadFirst = await page.getByTestId('story-list-item').first().innerText();
    expect(afterReloadFirst).toBe(reorderedFirst);
    expect(afterReloadFirst).not.toBe(firstTitle);

    await page.screenshot({
      path: `${STORY_LOG_DIR}/09s-drag-order-persist.png`,
      fullPage: true,
    });
  });

  test('display toggles persist after reload', async ({ page }) => {
    await navigateToStories(page);

    await page.getByTestId('stories-view-display-trigger').click();
    await page.getByTestId('display-panel-show-sub-stories').click();
    await page.keyboard.press('Escape');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 30_000 });

    await page.getByTestId('stories-view-display-trigger').click();
    const subStoriesToggle = page.getByTestId('display-panel-show-sub-stories');
    await expect(subStoriesToggle).not.toBeChecked();

    await page.screenshot({
      path: `${STORY_LOG_DIR}/09s-display-toggle-persist.png`,
      fullPage: true,
    });
  });

  test('search narrows visible story rows', async ({ page }) => {
    await navigateToStories(page);
    const allCount = await page.getByTestId('story-list-item').count();

    await page.getByTestId('stories-view-search').fill('Command palette');
    await expect(page.getByTestId('story-list-item')).toHaveCount(1, { timeout: 10_000 });
    expect(allCount).toBeGreaterThan(1);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09s-search-filter.png`,
      fullPage: true,
    });
  });

  test('customer filter narrows to Acme Corp stories (CAP-068)', async ({ page }) => {
    await navigateToStories(page);
    const totalBefore = await page.getByTestId('story-list-item').count();
    expect(totalBefore).toBeGreaterThan(2);

    await page.getByTestId('stories-view-filter-trigger').click();
    await expect(page.getByTestId('filter-panel')).toBeVisible();
    await page.getByTestId('filter-panel-field-select').selectOption('customer');
    await page.getByTestId('filter-panel-value-select').selectOption('customer-acme');
    await page.getByTestId('filter-panel-add').click();
    await page.keyboard.press('Escape');

    const visible = page.getByTestId('story-list-item');
    await expect(visible).toHaveCount(2, { timeout: 10_000 });
    await expect(visible.filter({ hasText: 'LAN-1' })).toBeVisible();
    await expect(visible.filter({ hasText: 'LAN-2' })).toBeVisible();

    await page.screenshot({
      path: `${STORY_LOG_DIR}/09s-customer-filter.png`,
      fullPage: true,
    });
  });

  test('display property chips toggle column visibility (CAP-024)', async ({ page }) => {
    await navigateToStories(page);

    const firstItem = page.getByTestId('story-list-item').first();

    await page.getByTestId('stories-view-display-trigger').click();
    await expect(page.getByTestId('display-panel')).toBeVisible();
    const statusChip = page.getByTestId('display-panel-property-status');
    const isStatusActive = async (): Promise<boolean> =>
      statusChip.evaluate((el) => el.classList.contains('border-primary'));
    if (!(await isStatusActive())) {
      await statusChip.click();
    }
    await page.keyboard.press('Escape');
    await expect(firstItem.getByText(/done|in progress|todo/i).first()).toBeVisible();

    await page.getByTestId('stories-view-display-trigger').click();
    if (await isStatusActive()) {
      await statusChip.click();
    }
    await page.keyboard.press('Escape');

    await expect(
      firstItem.locator('span.capitalize').filter({ hasText: /done|in progress|todo/i }),
    ).toHaveCount(0);

    await page.screenshot({
      path: `${STORY_LOG_DIR}/09s-display-property-chips.png`,
      fullPage: true,
    });
  });

  test('completed ordering by recency persists after reload (CAP-026)', async ({ page }) => {
    await navigateToStories(page);

    await page.getByTestId('stories-view-display-trigger').click();
    const completedToggle = page.getByTestId('display-panel-order-completed');
    if (!(await completedToggle.isChecked())) {
      await completedToggle.click();
    }
    await page.getByTestId('display-panel-ordering').selectOption('manual');
    await page.keyboard.press('Escape');

    const identifiers = await page.getByTestId('story-list-item').evaluateAll((nodes) =>
      nodes
        .map((node) => {
          const match = node.textContent?.match(/LAN-\d+/);
          return match ? match[0] : null;
        })
        .filter((id): id is string => id !== null),
    );

    const doneIds = ['LAN-1', 'LAN-6', 'LAN-7'];
    const activeIds = identifiers.filter((id) => !doneIds.includes(id));
    const trailingDone = identifiers.slice(activeIds.length);

    expect(trailingDone).toEqual(['LAN-7', 'LAN-1', 'LAN-6']);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 30_000 });

    await page.getByTestId('stories-view-display-trigger').click();
    await expect(page.getByTestId('display-panel-order-completed')).toBeChecked();

    await page.screenshot({
      path: `${STORY_LOG_DIR}/09s-completed-ordering-persist.png`,
      fullPage: true,
    });
  });
});
