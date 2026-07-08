import { test, expect, navigateToStories } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ag-customer-asks-sla/iteration-1/artifacts';

const DEMO_WORKSPACE_ID = 'ws-landi-flow-demo';
const ASKS_WEBHOOK_SECRET = 'e2e-asks-secret';

test.describe('Customer asks & SLA (CAP-067,068,073,074)', () => {
  test.setTimeout(120_000);

  test('customer requests panel renders with link actions', async ({ page }) => {
    await page.goto('/en/workspace/customers', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('customer-requests-panel')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('customer-request-row').first()).toBeVisible({ timeout: 30_000 });
    await page.screenshot({
      path: `${LOG_DIR}/09ag-customer-requests.png`,
      fullPage: true,
    });
  });

  test('webhook POST creates persisted customer request (CAP-073)', async ({ page, request }) => {
    const quote = `Webhook intake e2e ${Date.now()}`;
    const response = await request.post('/api/webhooks/inbound/asks', {
      headers: {
        'Content-Type': 'application/json',
        'X-Landi-Asks-Secret': ASKS_WEBHOOK_SECRET,
      },
      data: {
        workspace_id: DEMO_WORKSPACE_ID,
        customer_id: 'customer-acme',
        quote,
        requester_name: 'Webhook QA',
        source: 'api',
      },
    });
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { request: { id: string }; correlation_id: string };
    expect(body.request.id).toBeTruthy();
    expect(body.correlation_id).toBeTruthy();

    const listResponse = await request.get(
      `/api/mock/customer-requests?workspace_id=${encodeURIComponent(DEMO_WORKSPACE_ID)}`,
    );
    expect(listResponse.ok()).toBeTruthy();
    const listed = (await listResponse.json()) as { data: Array<{ quote: string }> };
    expect(listed.data.some((row) => row.quote === quote)).toBe(true);

    const requestsLoaded = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/mock/customer-requests') &&
        resp.request().method() === 'GET' &&
        resp.ok(),
    );
    await page.goto('/en/workspace/customers', { waitUntil: 'domcontentloaded' });
    await requestsLoaded;
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByText(quote)).toBeVisible({ timeout: 15_000 });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByText(quote)).toBeVisible({ timeout: 15_000 });

    await page.screenshot({
      path: `${LOG_DIR}/09ag-webhook-created-request.png`,
      fullPage: true,
    });
  });

  test('link customer request to story persists after reload (CAP-067)', async ({ page, request }) => {
    const quote = `Link proof ${Date.now()}`;
    const createResponse = await request.post('/api/webhooks/inbound/asks', {
      headers: {
        'Content-Type': 'application/json',
        'X-Landi-Asks-Secret': ASKS_WEBHOOK_SECRET,
      },
      data: {
        workspace_id: DEMO_WORKSPACE_ID,
        customer_id: 'customer-acme',
        quote,
      },
    });
    expect(createResponse.ok()).toBeTruthy();
    const created = (await createResponse.json()) as { request: { id: string } };

    const requestsLoaded = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/mock/customer-requests') &&
        resp.request().method() === 'GET' &&
        resp.ok(),
    );
    await page.goto('/en/workspace/customers', { waitUntil: 'domcontentloaded' });
    await requestsLoaded;
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByText(quote)).toBeVisible({ timeout: 15_000 });

    const linkButton = page.getByTestId(`link-request-${created.request.id}-to-story-001`);
    await expect(linkButton).toBeVisible();
    await linkButton.click();
    await expect(page.getByTestId(`linked-stories-${created.request.id}`)).toContainText(
      'story-001',
      { timeout: 15_000 },
    );

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId(`linked-stories-${created.request.id}`)).toContainText(
      'story-001',
      { timeout: 15_000 },
    );

    await page.screenshot({
      path: `${LOG_DIR}/09ag-link-request-persisted.png`,
      fullPage: true,
    });
  });

  test('story detail shows SLA breach badge (CAP-074)', async ({ page }) => {
    await navigateToStories(page);
    await page.getByTestId('story-list-item').filter({ hasText: 'LAN-5' }).first().click();
    const modal = page.getByTestId('story-detail-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal.getByTestId('story-sla-badge')).toBeVisible({ timeout: 15_000 });
    await expect(modal.getByTestId('story-sla-badge')).toContainText(/Breached|Due in/);
    await page.screenshot({
      path: `${LOG_DIR}/09ag-story-sla-badge.png`,
      fullPage: true,
    });
  });

  test('SLA rule create persists and breach badge remains computed (CAP-074)', async ({ page }) => {
    const ruleName = `E2E SLA ${Date.now()}`;

    await page.goto('/en/workspace/settings/security', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await page.getByTestId('sla-rule-name').fill(ruleName);
    await page.getByTestId('sla-rule-create').click();
    await expect(page.getByTestId('sla-rule-row').filter({ hasText: ruleName })).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('sla-rule-row').filter({ hasText: ruleName })).toBeVisible();

    await navigateToStories(page);
    await page.getByTestId('story-list-item').filter({ hasText: 'LAN-5' }).first().click();
    const modal = page.getByTestId('story-detail-modal');
    await expect(modal.getByTestId('story-sla-badge')).toBeVisible({ timeout: 15_000 });
    await expect(modal.getByTestId('story-sla-badge')).toContainText('Breached');

    await page.screenshot({
      path: `${LOG_DIR}/09ag-sla-rule-and-breach-proof.png`,
      fullPage: true,
    });
  });
});
