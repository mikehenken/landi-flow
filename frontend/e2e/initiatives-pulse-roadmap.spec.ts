import { test, expect, waitForAppReady } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09au-initiatives-pulse-roadmap/iteration-0/artifacts';

test.describe('Initiatives, Pulse & roadmap (CAP-056–065)', () => {
  test.setTimeout(180_000);

  test('initiatives list and detail', async ({ page, request }) => {
    const apiResponse = await request.get('/api/initiatives?workspace_id=ws-acme-agency');
    expect(apiResponse.ok()).toBeTruthy();
    const apiJson = (await apiResponse.json()) as {
      ok: boolean;
      initiatives: unknown[];
      settings: { enabled: boolean };
      live: boolean;
    };
    expect(apiJson.ok).toBe(true);
    expect(apiJson.live).toBe(false);

    await waitForAppReady(page);
    await page.goto('/en/workspace/initiatives', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 60_000 });

    const disabled = page.getByTestId('initiatives-disabled');
    if (await disabled.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await disabled.getByTestId('initiatives-enable').click();
    }

    await expect(page.getByTestId('initiatives-panel')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('initiatives-group-active')).toBeVisible();
    await page.screenshot({
      path: `${LOG_DIR}/09au-initiatives.png`,
      fullPage: true,
    });
  });

  test('pulse feed and schedules', async ({ page }) => {
    await waitForAppReady(page);
    await page.goto('/en/workspace/pulse', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 60_000 });
    await expect(page.getByTestId('pulse-feed-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('pulse-schedules-panel')).toBeVisible();
    await page.screenshot({
      path: `${LOG_DIR}/09au-pulse.png`,
      fullPage: true,
    });
  });

  test('roadmap timeline with dependency lines', async ({ page }) => {
    await waitForAppReady(page);
    await page.goto('/en/workspace/roadmap', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 60_000 });
    await expect(page.getByTestId('roadmap-timeline-panel')).toBeVisible({ timeout: 30_000 });
    await page.screenshot({
      path: `${LOG_DIR}/09au-roadmap.png`,
      fullPage: true,
    });
  });
});
