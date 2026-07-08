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

  test('notification click selects linked story in inspector', async ({ page }) => {
    await ensureHydratedInbox(page);

    const firstNotification = page.getByTestId('inbox-notification-item').first();
    await expect(firstNotification).toBeVisible({ timeout: 10_000 });
    await firstNotification.click();

    await expect(page.getByText('Select a Story to view properties')).not.toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('Properties')).toBeVisible({ timeout: 10_000 });
  });
});
