import { test, expect, SCREENSHOT_DIR, navigateToStories } from './fixtures';

test.describe('Differentiator: agent acts on Story via Action Bus', () => {
  test('assign agent via AssigneePicker shows Action Bus pick-up status', async ({ page }) => {
    await navigateToStories(page);

    const firstStory = page.getByTestId('story-list-item').first();
    await firstStory.click();

    const picker = page.getByTestId('assignee-picker-trigger');
    await expect(picker).toBeVisible({ timeout: 15_000 });
    await picker.click();

    const agentOption = page.getByTestId('assignee-option-agent').first();
    await expect(agentOption).toBeVisible();
    await agentOption.click();

    const status = page.getByRole('status');
    await expect(status).toContainText(/Action Bus|picked up|acting/i, { timeout: 15_000 });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-agent-action-bus-assignment.png`,
      fullPage: true,
    });
  });
});
