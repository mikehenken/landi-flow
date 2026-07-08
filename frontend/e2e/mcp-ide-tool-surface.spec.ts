import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ap-mcp-ide-tool-surface/iteration-0/artifacts';

test.describe('MCP IDE tool surface (MCP-IDE-001)', () => {
  test.setTimeout(120_000);

  test('settings MCP tools panel lists read and write tools', async ({ page }) => {
    await page.goto('/en/workspace/settings/mcp-tools', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('mcp-ide-tools-panel')).toBeVisible();
    await expect(page.getByTestId('mcp-tools-read')).toBeVisible();
    await expect(page.getByTestId('mcp-tools-write')).toBeVisible();
    const toolRows = page.getByTestId('mcp-tool-row');
    await expect(toolRows.first()).toBeVisible();
    expect(await toolRows.count()).toBeGreaterThanOrEqual(4);
    await page.screenshot({
      path: `${LOG_DIR}/09ap-mcp-tools.png`,
      fullPage: true,
    });
  });
});
