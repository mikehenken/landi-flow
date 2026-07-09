import { test, expect, SCREENSHOT_DIR, ensureHydratedInbox } from './fixtures';

test.describe('Inbox activity feed (CAP-035 + CAP-015)', () => {
  test('surfaces notifications panel and activity feed with seed data', async ({ page }) => {
    await ensureHydratedInbox(page);

    const notificationsPanel = page.getByTestId('inbox-notifications-panel');
    const activityFeed = page.getByTestId('inbox-activity-feed');

    await expect(notificationsPanel).toBeVisible({ timeout: 15_000 });
    await expect(activityFeed).toBeVisible({ timeout: 15_000 });
    await expect(notificationsPanel).toHaveAttribute('data-cap', 'CAP-035');
    await expect(activityFeed).toHaveAttribute('data-cap', 'CAP-015');

    await expect(page.getByTestId('inbox-notification-item').first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('inbox-activity-item').first()).toBeVisible({
      timeout: 10_000,
    });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/inbox-notifications-activity-feed.png`,
      fullPage: true,
    });
  });

  test('notification click opens story detail modal', async ({ page }) => {
    await ensureHydratedInbox(page);

    const firstNotification = page.getByTestId('inbox-notification-item').first();
    await expect(firstNotification).toBeVisible({ timeout: 10_000 });
    await firstNotification.click();

    const modal = page.getByTestId('story-detail-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });
    await expect(modal.getByTestId('story-detail-body')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Properties' })).toHaveCount(0);
  });

  test('signal activity click opens modal scrolled to signals section', async ({ page }) => {
    await ensureHydratedInbox(page);

    const signalActivity = page
      .locator('[data-testid="inbox-activity-item"][data-event-type="signal.attached"]')
      .first();
    await expect(signalActivity).toBeVisible({ timeout: 10_000 });
    await signalActivity.click();

    const modal = page.getByTestId('story-detail-modal');
    await expect(modal).toBeVisible({ timeout: 10_000 });

    const signalsSection = modal.locator('#signals');
    await expect(signalsSection).toBeVisible({ timeout: 10_000 });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/inbox-signal-activity-modal.png`,
      fullPage: true,
    });
  });
});
