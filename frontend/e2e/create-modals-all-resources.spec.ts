import { test as base, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { test as mockTest, expect as mockExpect } from './fixtures';
import {
  getE2eTestCredentials,
  getLiveApiEnvStatus,
  isLiveApiEnvReady,
} from './live-env';

const HYDRATION_SELECTOR = 'html[data-app-hydrated="true"]';
const APP_READY_TIMEOUT_MS = 45_000;
const liveEnv = getLiveApiEnvStatus();

const ARTIFACT_DIR = path.resolve(
  __dirname,
  '../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/09-functional-completion/task-09n-create-modals-all-resources/iteration-0/screenshots',
);

async function openCreateDropdown(page: Page): Promise<void> {
  await page.getByTestId('create-resource-dropdown-trigger').click();
  await expect(page.getByTestId('create-resource-dropdown-menu')).toBeVisible({
    timeout: 10_000,
  });
}

async function openStoryModal(page: Page): Promise<void> {
  await openCreateDropdown(page);
  await page.getByTestId('create-dropdown-story').click();
  await expect(page.getByTestId('create-story-modal')).toBeVisible({ timeout: 10_000 });
}

async function openEpicModal(page: Page): Promise<void> {
  await openCreateDropdown(page);
  await page.getByTestId('create-dropdown-epic').click();
  await expect(page.getByTestId('create-epic-modal')).toBeVisible({ timeout: 10_000 });
}

async function openCustomerModal(page: Page): Promise<void> {
  await openCreateDropdown(page);
  await page.getByTestId('create-dropdown-customer').click();
  await expect(page.getByTestId('create-customer-modal')).toBeVisible({ timeout: 10_000 });
}

async function openMemberModal(page: Page): Promise<void> {
  await openCreateDropdown(page);
  await page.getByTestId('create-dropdown-member').click();
  await expect(page.getByTestId('create-member-modal')).toBeVisible({ timeout: 10_000 });
}

async function signInWithTestAccount(page: Page): Promise<void> {
  const { email, password } = getE2eTestCredentials();
  await page.goto('/en/auth/login?redirect=/workspace/inbox', { waitUntil: 'load' });
  await expect(page.getByRole('button', { name: /^Sign in$/i })).toBeVisible();

  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in|submit/i }).click();

  await expect(page).toHaveURL(/\/en\/workspace\/inbox\/?(\?.*)?$/, {
    timeout: APP_READY_TIMEOUT_MS,
  });
}

async function waitForHydratedWorkspace(page: Page): Promise<void> {
  await page.waitForSelector(HYDRATION_SELECTOR, { timeout: APP_READY_TIMEOUT_MS });
  await expect(page.getByText(/Failed to load workspace data/i)).toHaveCount(0);
}

const test = base.extend({});

mockTest.describe('Create modals dropdown (mock auth)', () => {
  mockTest.setTimeout(90_000);

  mockTest('dropdown opens story, epic, customer, and member modals', async ({ page }) => {
    await page.goto('/en/workspace/inbox', { waitUntil: 'domcontentloaded' });
    await waitForHydratedWorkspace(page);

    await openStoryModal(page);
    await page.keyboard.press('Escape');
    await mockExpect(page.getByTestId('create-story-modal')).not.toBeVisible();

    await openEpicModal(page);
    await page.keyboard.press('Escape');
    await mockExpect(page.getByTestId('create-epic-modal')).not.toBeVisible();

    await openCustomerModal(page);
    await page.keyboard.press('Escape');
    await mockExpect(page.getByTestId('create-customer-modal')).not.toBeVisible();

    await openMemberModal(page);
    await page.screenshot({
      path: `${ARTIFACT_DIR}/09n-member-modal-open.png`,
      fullPage: true,
    });
    await page.keyboard.press('Escape');
    await mockExpect(page.getByTestId('create-member-modal')).not.toBeVisible();
  });

  mockTest('customer create shows in list during session', async ({ page }) => {
    const uniqueName = `E2E Customer ${Date.now()}`;
    const uniqueDomain = `e2e-${Date.now()}.example.com`;

    await page.goto('/en/workspace/customers', { waitUntil: 'domcontentloaded' });
    await waitForHydratedWorkspace(page);

    await openCustomerModal(page);
    await page.getByTestId('create-customer-name').fill(uniqueName);
    await page.getByTestId('create-customer-domain').fill(uniqueDomain);
    await page.getByTestId('create-customer-submit').click();
    await expect(page.getByTestId('create-customer-modal')).not.toBeVisible({
      timeout: APP_READY_TIMEOUT_MS,
    });

    await mockExpect(
      page.getByTestId('customer-list-item').filter({ hasText: uniqueName }),
    ).toBeVisible({ timeout: APP_READY_TIMEOUT_MS });

    await page.screenshot({
      path: `${ARTIFACT_DIR}/09n-customer-created-mock.png`,
      fullPage: true,
    });
  });

  mockTest('epic create shows on epic board during session', async ({ page }) => {
    const uniqueName = `E2E Epic ${Date.now()}`;

    await page.goto('/en/workspace/epics', { waitUntil: 'domcontentloaded' });
    await waitForHydratedWorkspace(page);

    await openEpicModal(page);
    await page.getByTestId('create-epic-name').fill(uniqueName);
    await page.getByTestId('create-epic-submit').click();
    await expect(page.getByTestId('create-epic-modal')).not.toBeVisible({
      timeout: APP_READY_TIMEOUT_MS,
    });

    await mockExpect(
      page.getByTestId('epic-board-item').filter({ hasText: uniqueName }),
    ).toBeVisible({ timeout: APP_READY_TIMEOUT_MS });

    await page.screenshot({
      path: `${ARTIFACT_DIR}/09n-epic-created-mock.png`,
      fullPage: true,
    });
  });

  mockTest('member invite shows pending row during session', async ({ page }) => {
    const uniqueEmail = `e2e-member-${Date.now()}@example.com`;

    await page.goto('/en/workspace/settings/members', { waitUntil: 'domcontentloaded' });
    await waitForHydratedWorkspace(page);

    await page.getByTestId('members-invite-button').click();
    await expect(page.getByTestId('create-member-modal')).toBeVisible({ timeout: 10_000 });
    await page.getByTestId('create-member-email').fill(uniqueEmail);
    await page.getByTestId('create-member-submit').click();
    await expect(page.getByTestId('create-member-modal')).not.toBeVisible({
      timeout: APP_READY_TIMEOUT_MS,
    });

    const invitedRow = page.getByTestId('workspace-member-row').filter({ hasText: uniqueEmail });
    await mockExpect(invitedRow).toBeVisible({ timeout: APP_READY_TIMEOUT_MS });
    await mockExpect(invitedRow).toContainText('pending');

    await page.screenshot({
      path: `${ARTIFACT_DIR}/09n-member-invited-mock.png`,
      fullPage: true,
    });
  });
});

test.describe('Create modals persistence @requires-live-api', () => {
  test.skip(!isLiveApiEnvReady(), liveEnv.reason ?? 'Live API env not configured');
  test.setTimeout(120_000);

  test('customer and epic survive hard reload', async ({ page }) => {
    const uniqueCustomer = `E2E Cust ${Date.now()}`;
    const uniqueDomain = `persist-${Date.now()}.example.com`;
    const uniqueEpic = `E2E Epic ${Date.now()}`;

    await signInWithTestAccount(page);
    await waitForHydratedWorkspace(page);

    await page.goto('/en/workspace/customers', { waitUntil: 'domcontentloaded' });
    await waitForHydratedWorkspace(page);

    await openCustomerModal(page);
    await page.getByTestId('create-customer-name').fill(uniqueCustomer);
    await page.getByTestId('create-customer-domain').fill(uniqueDomain);
    await page.getByTestId('create-customer-submit').click();
    await expect(
      page.getByTestId('customer-list-item').filter({ hasText: uniqueCustomer }),
    ).toBeVisible({ timeout: APP_READY_TIMEOUT_MS });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForHydratedWorkspace(page);
    await expect(
      page.getByTestId('customer-list-item').filter({ hasText: uniqueCustomer }),
    ).toBeVisible({ timeout: APP_READY_TIMEOUT_MS });

    await page.goto('/en/workspace/epics', { waitUntil: 'domcontentloaded' });
    await waitForHydratedWorkspace(page);

    await openEpicModal(page);
    await page.getByTestId('create-epic-name').fill(uniqueEpic);
    await page.getByTestId('create-epic-submit').click();
    await expect(
      page.getByTestId('epic-board-item').filter({ hasText: uniqueEpic }),
    ).toBeVisible({ timeout: APP_READY_TIMEOUT_MS });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForHydratedWorkspace(page);
    await expect(
      page.getByTestId('epic-board-item').filter({ hasText: uniqueEpic }),
    ).toBeVisible({ timeout: APP_READY_TIMEOUT_MS });

    await page.screenshot({
      path: `${ARTIFACT_DIR}/09n-persist-after-reload.png`,
      fullPage: true,
    });
  });
});
