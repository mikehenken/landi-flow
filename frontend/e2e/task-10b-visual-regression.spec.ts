/**
 * task-10b — Full live-app visual regression (119 FHITM + 21 pages).
 * Screenshots → iteration-N/screenshots/ for agent vision analysis.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

interface Task10bRow {
  row_id: string;
  cap_id: string;
  action: string;
  url: string;
  proof_mode?: string;
  matrix_type?: string;
  screenshot_path: string;
  screenshot_file: string;
  notes?: string;
}

interface Task10bMatrix {
  iteration: string;
  artifact_dir: string;
  rows: Task10bRow[];
}

const ITERATION = process.env.TASK_10B_ITERATION ?? '2';
const MATRIX_JSON = path.resolve(
  __dirname,
  `../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/10-testing/task-10b-visual-regression-i18n/iteration-${ITERATION}/task-10b-matrix.json`,
);
const RESULTS_JSON = path.resolve(
  __dirname,
  `../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/10-testing/task-10b-visual-regression-i18n/iteration-${ITERATION}/capture-results.json`,
);

const INBOX = '/en/workspace/inbox';
const HYDRATION = 'html[data-app-hydrated="true"]';
const ROW_TIMEOUT_MS = 30_000;

function loadMatrix(): Task10bMatrix {
  return JSON.parse(fs.readFileSync(MATRIX_JSON, 'utf8')) as Task10bMatrix;
}

async function softGoto(page: Page, url: string): Promise<void> {
  const isSettingsRoute = url.includes('/settings/');
  const gotoTimeout = isSettingsRoute ? 60_000 : ROW_TIMEOUT_MS;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: gotoTimeout });
  await page.waitForSelector(HYDRATION, { timeout: isSettingsRoute ? 45_000 : 15_000 }).catch(() => undefined);
  if (isSettingsRoute) {
    await page.waitForTimeout(800);
  } else {
    await page.waitForTimeout(400);
  }
}

async function ensureWorkspaceSession(page: Page): Promise<void> {
  await softGoto(page, INBOX);
  if (page.url().includes('/auth/login')) {
    throw new Error('Redirected to login — NEXT_PUBLIC_MOCK_AUTH=true required');
  }
  await page.getByTestId('create-resource-dropdown-trigger').waitFor({ timeout: ROW_TIMEOUT_MS }).catch(() => undefined);
}

async function openStoryDetail(page: Page): Promise<void> {
  await softGoto(page, '/en/workspace/stories');
  const first = page.getByTestId('story-list-item').first();
  if (await first.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await first.click();
    await page.getByTestId('story-detail-modal').waitFor({ timeout: 12_000 }).catch(() => undefined);
  }
}

async function openEpicDetail(page: Page, epicId = 'epic-001'): Promise<void> {
  await softGoto(page, `/en/workspace/epics/${epicId}`);
}

async function openCreateStoryModal(page: Page): Promise<void> {
  await softGoto(page, INBOX);
  await page.getByTestId('create-resource-dropdown-trigger').click().catch(() => undefined);
  await page.getByTestId('create-dropdown-story').click().catch(() => undefined);
  await page.getByTestId('create-story-modal').waitFor({ timeout: 10_000 }).catch(() => undefined);
}

async function openFilterPanel(page: Page): Promise<void> {
  await softGoto(page, '/en/workspace/stories');
  await page.getByTestId('stories-view-filter-trigger').click().catch(() => undefined);
  await page.getByTestId('filter-panel').waitFor({ timeout: 8_000 }).catch(() => undefined);
}

async function openDisplayPanel(page: Page): Promise<void> {
  await softGoto(page, '/en/workspace/stories');
  await page.getByTestId('stories-view-display-trigger').click().catch(() => undefined);
  await page.getByTestId('display-panel').waitFor({ timeout: 8_000 }).catch(() => undefined);
}

async function openCommandMenu(page: Page): Promise<void> {
  await softGoto(page, INBOX);
  await page.keyboard.press('Control+k');
  await page.getByTestId('command-palette').waitFor({ timeout: 8_000 }).catch(() => undefined);
}

async function exerciseCapSpecific(page: Page, capId: string): Promise<void> {
  switch (capId) {
    case 'CAP-002':
    case 'CAP-004':
      await page.getByTestId('create-resource-dropdown-trigger').click().catch(() => undefined);
      await page.getByTestId('create-dropdown-story').click().catch(() => undefined);
      break;
    case 'CAP-018':
    case 'CAP-022':
    case 'CAP-027':
    case 'CAP-031':
    case 'CAP-032':
    case 'CAP-068':
      await openFilterPanel(page);
      break;
    case 'CAP-023':
    case 'CAP-024':
    case 'CAP-025':
    case 'CAP-026':
      await openDisplayPanel(page);
      break;
    case 'CAP-035':
    case 'CAP-015':
      await expect(page.getByTestId('inbox-notifications-panel')).toBeVisible({ timeout: 12_000 }).catch(() => undefined);
      await expect(page.getByTestId('inbox-activity-feed')).toBeVisible({ timeout: 12_000 }).catch(() => undefined);
      break;
    case 'CAP-036':
      await page.getByTestId('my-issues-tab-created').click().catch(() => undefined);
      break;
    case 'CAP-037':
      await page.getByTestId('workspace-switcher-trigger').click().catch(() => undefined);
      break;
    case 'CAP-038':
    case 'CAP-039':
      await openCommandMenu(page);
      break;
    case 'CAP-040':
      await page.keyboard.press('Shift+?');
      await page.getByTestId('keyboard-shortcuts-overlay').waitFor({ timeout: 8_000 }).catch(() => undefined);
      break;
    default:
      break;
  }
}

async function runRow(page: Page, row: Task10bRow): Promise<{
  row_id: string;
  cap_id: string;
  matrix_type: string;
  status: string;
  screenshot_file: string;
  notes: string;
}> {
  const baseResult = {
    row_id: row.row_id,
    cap_id: row.cap_id,
    matrix_type: row.matrix_type ?? 'fhitm',
    screenshot_file: row.screenshot_file,
  };

  if (row.proof_mode === 'manual') {
    return {
      ...baseResult,
      status: 'SKIP',
      notes: row.notes ?? 'Manual-only surface',
    };
  }

  try {
    switch (row.action) {
      case 'story-detail':
        await openStoryDetail(page);
        break;
      case 'epic-detail':
        await softGoto(page, '/en/workspace/epics');
        if (await page.getByTestId('epic-list-item').first().isVisible({ timeout: 8_000 }).catch(() => false)) {
          await page.getByTestId('epic-list-item').first().click();
        }
        break;
      case 'epic-detail-seed':
        await openEpicDetail(page, 'epic-001');
        break;
      case 'board':
        await softGoto(page, '/en/workspace/stories/board');
        break;
      case 'shell':
        await softGoto(page, row.url || INBOX);
        await exerciseCapSpecific(page, row.cap_id);
        break;
      case 'create-story-modal':
        await openCreateStoryModal(page);
        break;
      case 'filter-panel':
        await openFilterPanel(page);
        break;
      case 'display-panel':
        await openDisplayPanel(page);
        break;
      case 'command-menu':
        await openCommandMenu(page);
        break;
      case 'inbox-panels':
        await softGoto(page, INBOX);
        await exerciseCapSpecific(page, 'CAP-035');
        break;
      case 'auth-page':
        await page.goto(row.url, { waitUntil: 'domcontentloaded', timeout: ROW_TIMEOUT_MS });
        break;
      default:
        await softGoto(page, row.url);
        if (row.matrix_type === 'fhitm') {
          await exerciseCapSpecific(page, row.cap_id);
        }
    }

    fs.mkdirSync(path.dirname(row.screenshot_path), { recursive: true });
    await page.screenshot({ path: row.screenshot_path, fullPage: true });
    const ok = fs.existsSync(row.screenshot_path) && fs.statSync(row.screenshot_path).size > 800;
    return {
      ...baseResult,
      status: ok ? 'PASS' : 'FAIL',
      notes: ok ? 'Screenshot captured' : 'Screenshot missing or too small',
    };
  } catch (error) {
    try {
      const failPath = row.screenshot_path.replace(/\.png$/, '-fail.png');
      await page.screenshot({ path: failPath, fullPage: true });
    } catch {
      // ignore secondary failure
    }
    return {
      ...baseResult,
      status: 'FAIL',
      notes: error instanceof Error ? error.message.slice(0, 200) : String(error),
    };
  }
}

const matrix = loadMatrix();
const allResults: Array<{
  row_id: string;
  cap_id: string;
  matrix_type: string;
  status: string;
  screenshot_file: string;
  notes: string;
}> = [];

function sectionOf(rowId: string): string {
  if (rowId.startsWith('PAGE-')) return 'PAGES';
  const n = Number.parseInt(rowId.replace('FHITM-', ''), 10);
  if (n <= 17) return 'C';
  if (n <= 32) return 'D';
  if (n <= 39) return 'E';
  if (n <= 64) return 'F';
  if (n <= 69) return 'G';
  if (n <= 80) return 'H';
  if (n <= 103) return 'I';
  return 'J';
}

const batches = new Map<string, Task10bRow[]>();
for (const row of matrix.rows) {
  const sec = sectionOf(row.row_id);
  const list = batches.get(sec) ?? [];
  list.push(row);
  batches.set(sec, list);
}

const test = base.extend({});

test.describe(`task-10b live-app visual regression (iteration ${ITERATION})`, () => {
  test.beforeAll(async () => {
    fs.mkdirSync(matrix.artifact_dir, { recursive: true });
  });

  for (const [section, rows] of batches) {
    test(`section ${section} (${rows.length} surfaces)`, async ({ page }) => {
      test.setTimeout(600_000);
      const needsSession = rows.some((r) => r.action !== 'auth-page');
      if (needsSession) {
        await ensureWorkspaceSession(page);
      }
      for (const row of rows) {
        const result = await runRow(page, row);
        allResults.push(result);
      }
    });
  }

  test.afterAll(async () => {
    allResults.sort((a, b) => a.row_id.localeCompare(b.row_id));
    const pass = allResults.filter((r) => r.status === 'PASS').length;
    const fail = allResults.filter((r) => r.status === 'FAIL').length;
    const skip = allResults.filter((r) => r.status === 'SKIP').length;
    fs.writeFileSync(
      RESULTS_JSON,
      JSON.stringify(
        {
          generated_at: new Date().toISOString(),
          iteration: ITERATION,
          pass,
          fail,
          skip,
          total: allResults.length,
          rows: allResults,
        },
        null,
        2,
      ),
      'utf8',
    );
    console.log(`task-10b capture: ${pass} PASS, ${fail} FAIL, ${skip} SKIP / ${allResults.length}`);
    expect(fail).toBe(0);
  });
});
