import path from 'node:path';
import { test, expect, SCREENSHOT_DIR, gNavigate } from './fixtures';

const SHELL_SIDEBAR_COLLAPSED_KEY = 'landi-flow:shell-sidebar-collapsed';
const HYDRATION_SELECTOR = 'html[data-app-hydrated="true"]';
const STORIES_NAV_HREF = '/workspace/stories';

const TASK_SCREENSHOT_DIR = path.resolve(
  __dirname,
  '../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/09-functional-completion/task-09t-shell-sidebar-preference-skeletons/iteration-0/screenshots',
);

function getStoriesNavLink(
  sidebar: import('@playwright/test').Locator,
): import('@playwright/test').Locator {
  // "My Stories" matches both /stories and /my-issues (CAP-036); target href explicitly.
  return sidebar.locator(`a[href="${STORIES_NAV_HREF}"]`);
}

async function resetSidebarPreference(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate((storageKey) => {
    window.localStorage.removeItem(storageKey);
  }, SHELL_SIDEBAR_COLLAPSED_KEY);
}

async function openStoriesViaSidebar(
  page: import('@playwright/test').Page,
): Promise<ReturnType<typeof page.getByRole>> {
  const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
  const storiesLink = getStoriesNavLink(sidebar);
  await expect(storiesLink).toBeVisible({ timeout: 15_000 });
  await storiesLink.click();
  await expect(page).toHaveURL(/\/workspace\/stories/, { timeout: 20_000 });
  await page.waitForSelector(HYDRATION_SELECTOR, { timeout: 30_000 });
  return sidebar;
}

test.describe.configure({ timeout: 90_000 });

test.describe('Shell sidebar preference + skeletons (task-09t)', () => {
  test('sidebar defaults to open on desktop', async ({ page }) => {
    await resetSidebarPreference(page);
    await openStoriesViaSidebar(page);

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    await expect(sidebar.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(getStoriesNavLink(sidebar)).toBeVisible();

    await page.screenshot({
      path: `${TASK_SCREENSHOT_DIR}/09t-sidebar-default-open.png`,
      fullPage: true,
    });
  });

  test('sidebar stays open after navigation', async ({ page }) => {
    await resetSidebarPreference(page);
    await openStoriesViaSidebar(page);

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    await expect(sidebar.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible({
      timeout: 15_000,
    });

    await sidebar.getByRole('link', { name: 'Inbox' }).click();
    await expect(page).toHaveURL(/\/workspace\/inbox/, { timeout: 15_000 });
    await page.waitForSelector(HYDRATION_SELECTOR, { timeout: 30_000 });

    const inboxSidebar = page.getByRole('complementary', { name: 'Main navigation' });
    await expect(inboxSidebar.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(getStoriesNavLink(inboxSidebar)).toBeVisible();

    await getStoriesNavLink(inboxSidebar).click();
    await expect(page).toHaveURL(/\/workspace\/stories/, { timeout: 15_000 });
    await page.waitForSelector(HYDRATION_SELECTOR, { timeout: 30_000 });

    const storiesSidebar = page.getByRole('complementary', { name: 'Main navigation' });
    await expect(storiesSidebar.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('persists collapsed preference across navigation', async ({ page }) => {
    await resetSidebarPreference(page);
    await openStoriesViaSidebar(page);

    const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
    await expect(sidebar.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible({
      timeout: 15_000,
    });

    await sidebar.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(sidebar.getByRole('button', { name: 'Expand sidebar' })).toBeVisible();

    const storedCollapsed = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      SHELL_SIDEBAR_COLLAPSED_KEY,
    );
    expect(storedCollapsed).toBe('true');

    await gNavigate(page, 'i');
    await expect(page).toHaveURL(/\/workspace\/inbox/, { timeout: 15_000 });
    await page.waitForSelector(HYDRATION_SELECTOR, { timeout: 30_000 });

    const inboxSidebar = page.getByRole('complementary', { name: 'Main navigation' });
    await expect(inboxSidebar.getByRole('button', { name: 'Expand sidebar' })).toBeVisible({
      timeout: 15_000,
    });

    await gNavigate(page, 's');
    await expect(page).toHaveURL(/\/workspace\/stories/, { timeout: 15_000 });
    await page.waitForSelector(HYDRATION_SELECTOR, { timeout: 30_000 });

    const storiesSidebar = page.getByRole('complementary', { name: 'Main navigation' });
    await expect(storiesSidebar.getByRole('button', { name: 'Expand sidebar' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(storiesSidebar.getByRole('button', { name: 'Collapse sidebar' })).toHaveCount(0);
  });

  test('hydrates stores before showing seeded story list', async ({ page }) => {
    await resetSidebarPreference(page);
    await openStoriesViaSidebar(page);

    await expect(page.getByTestId('story-list-item').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('workspace-content-skeleton')).toHaveCount(0);
    await expect(page.getByTestId('story-list-skeleton')).toHaveCount(0);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09t-hydrated-story-list.png`,
      fullPage: true,
    });
  });
});
