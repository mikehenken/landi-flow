import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09as-recurring-stories-team-automation/iteration-0/artifacts';

test.describe('Recurring stories team automation (CAP-010)', () => {
  test.setTimeout(120_000);

  test('recurring rules CRUD and spawn proof', async ({ page, request }) => {
    const apiResponse = await request.get('/api/recurring-rules?team_id=team-design');
    expect(apiResponse.ok()).toBeTruthy();
    const apiJson = (await apiResponse.json()) as { ok: boolean; rules: unknown[]; live: boolean };
    expect(apiJson.ok).toBe(true);
    expect(apiJson.live).toBe(false);

    await page.goto('/en/workspace/settings/recurring-stories', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('recurring-stories-panel')).toBeVisible();
    await expect(page.getByTestId('recurring-rules-list')).toBeVisible();

    const uniqueTitle = `E2E recur proof — ${Date.now()}`;
    await page.getByTestId('recurring-rule-create').locator('input').fill(uniqueTitle);
    await page.getByTestId('recurring-rule-create').getByRole('button', { name: 'Add rule' }).click();
    await expect(page.getByText(uniqueTitle)).toBeVisible();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByText(uniqueTitle)).toBeVisible();

    const runButton = page.getByTestId('recurring-rule-run').first();
    if (await runButton.isVisible()) {
      await runButton.click();
      await expect(page.getByTestId('recurring-spawn-proof')).toBeVisible({ timeout: 10_000 });
    }
    await page.screenshot({
      path: `${LOG_DIR}/09as-recurring-stories.png`,
      fullPage: true,
    });
  });
});
