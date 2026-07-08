import { test, expect, SCREENSHOT_DIR } from './fixtures';

async function navigateToAgents(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/en/workspace/agents', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 30_000 });
  await expect(page).toHaveURL(/\/workspace\/agents/, { timeout: 15_000 });
}

test.describe('Native Agent Console (task-09l)', () => {
  test('defaults to built-in Landi Flow Agent with Handoff Queue copy', async ({ page }) => {
    await navigateToAgents(page);

    await expect(page.getByRole('main').getByText('Landi Flow Agent', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Handoff Queue approval/i).first()).toBeVisible();
    await expect(page.getByText(/does not control your IDE remotely/i)).not.toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09l-agent-native-console-default.png`,
      fullPage: true,
    });
  });

  test('external MCP agent shows connect-via-settings copy', async ({ page }) => {
    await navigateToAgents(page);

    await page.getByRole('button', { name: /Cursor Agent/i }).click();
    await expect(page.getByRole('main').getByText(/Connect via MCP in Settings/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/No remote IDE control/i)).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09l-agent-external-mcp-disconnected.png`,
      fullPage: true,
    });
  });
});
