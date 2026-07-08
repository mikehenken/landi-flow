import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ao-observability-platform/iteration-1/artifacts';

test.describe('Observability platform (OBS-001)', () => {
  test.setTimeout(120_000);

  test('OBS report endpoint accepts structured client error', async ({ request }) => {
    const correlationId = crypto.randomUUID();
    const response = await request.post('/api/obs/report', {
      headers: {
        'Content-Type': 'application/json',
        'X-Landi-Correlation-Id': correlationId,
      },
      data: {
        message: 'e2e obs proof',
        correlation_id: correlationId,
        level: 'error',
        context: { test: 'task-09ao' },
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { ok: boolean; correlation_id: string };
    expect(body.ok).toBe(true);
    expect(body.correlation_id).toBe(correlationId);
  });

  test('ObsErrorBoundary surfaces correlation_id and reports to /api/obs/report', async ({
    page,
  }) => {
    let reportedCorrelationId: string | null = null;

    await page.route('**/api/obs/report', async (route) => {
      const requestBody = route.request().postDataJSON() as {
        correlation_id?: string;
        message?: string;
      };
      reportedCorrelationId = requestBody.correlation_id ?? null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          correlation_id: requestBody.correlation_id ?? 'unknown',
        }),
      });
    });

    await page.goto('/en/workspace/dev/obs-error', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.getByTestId('obs-error-trigger').click();

    const correlation = page.getByTestId('obs-correlation-id');
    await expect(correlation).toBeVisible({ timeout: 15_000 });
    const correlationId = (await correlation.textContent())?.trim() ?? '';
    expect(correlationId.length).toBeGreaterThan(10);

    await expect.poll(() => reportedCorrelationId, { timeout: 15_000 }).toBe(correlationId);

    await page.screenshot({
      path: `${LOG_DIR}/09ao-error-boundary-correlation.png`,
      fullPage: true,
    });
  });
});
