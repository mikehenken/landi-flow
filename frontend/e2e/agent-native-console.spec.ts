import { test, expect, SCREENSHOT_DIR, navigateToAgents } from './fixtures';

test.describe('Native Agent Console (task-09l)', () => {
  test('defaults to built-in Landi Flow Agent with Handoff Queue copy', async ({ page }) => {
    await navigateToAgents(page);

    await expect(page.getByText('Landi Flow Agent', { exact: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/Handoff Queue approval/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/does not control your IDE remotely/i)).not.toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09l-agent-native-console-default.png`,
      fullPage: true,
    });
  });

  test('external MCP agent shows connect-via-settings copy', async ({ page }) => {
    await navigateToAgents(page);

    await page.getByRole('button', { name: /Cursor Agent/i }).click();
    await expect(page.getByText(/Connect via MCP in Settings/i).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/No remote IDE control/i)).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09l-agent-external-mcp-disconnected.png`,
      fullPage: true,
    });
  });
});
