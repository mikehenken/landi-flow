import { test, expect, ensureGlobalKeyboardFocus } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09aa-team-triage-inbox/iteration-0/artifacts';

test.describe('Team triage inbox (CAP-016)', () => {
  test.setTimeout(120_000);

  test('accept and decline triage items persist', async ({ page }) => {
    await page.goto('/en/workspace/team/team-design/triage', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('triage-inbox-panel')).toBeVisible();
    const items = page.getByTestId('triage-inbox-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    await items.first().getByTestId('triage-accept').click();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    const afterAccept = await page.getByTestId('triage-inbox-item').count();
    expect(afterAccept).toBeLessThan(count);

    await page.screenshot({
      path: `${LOG_DIR}/09aa-triage-inbox.png`,
      fullPage: true,
    });
  });
});
