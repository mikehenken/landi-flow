import { test, expect, SCREENSHOT_DIR, navigateToStories, expandStoryDetailModal } from './fixtures';

test.describe('Differentiator: agent acts on Story via Action Bus', () => {
  test('assign agent via AgentDelegatePicker shows Action Bus pick-up status', async ({ page }) => {
    await navigateToStories(page);

    const firstStory = page.getByTestId('story-list-item').first();
    await firstStory.click();

    const modal = page.getByTestId('story-detail-modal');
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expandStoryDetailModal(page);

    const delegatePicker = modal.getByTestId('story-agent-delegate-picker');
    await delegatePicker.scrollIntoViewIfNeeded();
    await expect(delegatePicker).toBeVisible({ timeout: 15_000 });
    await delegatePicker.click({ force: true });

    const agentOption = page.getByTestId('assignee-option-agent').first();
    await expect(agentOption).toBeVisible({ timeout: 10_000 });
    await agentOption.click();

    const status = modal.getByRole('status');
    await expect(status).toContainText(/Action Bus|picked up|acting/i, { timeout: 15_000 });

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-agent-action-bus-assignment.png`,
      fullPage: true,
    });
  });
});
