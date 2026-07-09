import { test, expect } from './fixtures';

const LOG_DIR =
  'logs/09-functional-completion/task-09ap-mcp-ide-tool-surface/iteration-0/artifacts';

test.describe('MCP IDE tool surface (MCP-IDE-001)', () => {
  test.setTimeout(120_000);

  test('settings MCP tools panel lists read and write tools', async ({ page, request }) => {
    const apiResponse = await request.get('/api/mcp/tools');
    expect(apiResponse.ok()).toBeTruthy();
    const apiJson = (await apiResponse.json()) as {
      ok: boolean;
      tools: Array<{ name: string }>;
      live: boolean;
    };
    expect(apiJson.ok).toBe(true);
    expect(apiJson.tools.length).toBeGreaterThanOrEqual(16);
    expect(apiJson.live).toBe(false);

    await page.goto('/en/workspace/settings/mcp-tools', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('html[data-app-hydrated="true"]', { timeout: 45_000 });
    await expect(page.getByTestId('mcp-ide-tools-panel')).toBeVisible();
    await expect(page.getByTestId('mcp-tools-read')).toBeVisible();
    await expect(page.getByTestId('mcp-tools-write')).toBeVisible();
    await expect(page.getByTestId('mcp-tools-live-flag')).toContainText('mock auth');
    const toolRows = page.getByTestId('mcp-tool-row');
    await expect(toolRows.first()).toBeVisible();
    expect(await toolRows.count()).toBeGreaterThanOrEqual(16);
    await page.screenshot({
      path: `${LOG_DIR}/09ap-mcp-tools.png`,
      fullPage: true,
    });
  });
});
