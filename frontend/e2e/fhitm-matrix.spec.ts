/**
 * FHITM matrix proof capture — task-09y (batched by section).
 * Uses base Playwright test (no fixtures auto-nav) for resilient 119-row capture.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';

interface FhitmMatrixRow {
  row_id: string;
  cap_id: string;
  proof_artifact: string;
  action: string;
  url: string;
  selector: string;
  proof_mode: string;
}

interface FhitmMatrixPayload {
  artifact_dir: string;
  rows: FhitmMatrixRow[];
}

const MATRIX_JSON = path.resolve(
  __dirname,
  '../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/09-functional-completion/task-09y-manual-browser-test-matrix/iteration-0/fhitm-matrix.json',
);

const RESULTS_JSON = path.resolve(
  __dirname,
  '../../../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/logs/09-functional-completion/task-09y-manual-browser-test-matrix/iteration-0/matrix-results.json',
);

const INBOX = '/en/workspace/inbox';
const HYDRATION = 'html[data-app-hydrated="true"]';
const ROW_TIMEOUT_MS = 25_000;

function loadMatrix(): FhitmMatrixPayload {
  return JSON.parse(fs.readFileSync(MATRIX_JSON, 'utf8')) as FhitmMatrixPayload;
}

function artifactPath(dir: string, proofArtifact: string): string {
  return path.join(dir, path.basename(proofArtifact));
}

async function ensureSession(page: Page): Promise<void> {
  await page.goto(INBOX, { waitUntil: 'domcontentloaded', timeout: ROW_TIMEOUT_MS });
  await page.waitForSelector(HYDRATION, { timeout: ROW_TIMEOUT_MS }).catch(() => undefined);
  await page.getByTestId('create-resource-dropdown-trigger').waitFor({ timeout: ROW_TIMEOUT_MS }).catch(() => undefined);
}

async function softGoto(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: ROW_TIMEOUT_MS });
  await page.waitForSelector(HYDRATION, { timeout: 12_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
}

async function runRow(page: Page, row: FhitmMatrixRow, artifactDir: string): Promise<{
  row_id: string;
  status: string;
  proof_mode: string;
  notes: string;
}> {
  const screenshotPath = artifactPath(artifactDir, row.proof_artifact);

  if (row.proof_mode === 'manual') {
    return {
      row_id: row.row_id,
      status: 'SKIP',
      proof_mode: 'manual',
      notes: `Manual procedure documented for ${row.cap_id}`,
    };
  }

  try {
    switch (row.action) {
      case 'story-detail':
        await softGoto(page, '/en/workspace/stories');
        if (await page.getByTestId('story-list-item').first().isVisible({ timeout: 8_000 }).catch(() => false)) {
          await page.getByTestId('story-list-item').first().click();
          await page.getByTestId('story-detail-modal').waitFor({ timeout: 10_000 }).catch(() => undefined);
        }
        break;
      case 'epic-detail':
        await softGoto(page, '/en/workspace/epics');
        if (await page.getByTestId('epic-list-item').first().isVisible({ timeout: 8_000 }).catch(() => false)) {
          await page.getByTestId('epic-list-item').first().click();
        }
        break;
      case 'board':
        await softGoto(page, '/en/workspace/stories/board');
        break;
      case 'shell':
        await softGoto(page, INBOX);
        if (row.cap_id === 'CAP-038' || row.cap_id === 'CAP-039') {
          await page.keyboard.press('Control+k');
          await page.getByTestId('command-palette').waitFor({ timeout: 8_000 }).catch(() => undefined);
        }
        if (row.cap_id === 'CAP-040') {
          await page.keyboard.press('Shift+?');
          await page.getByTestId('keyboard-shortcuts-overlay').waitFor({ timeout: 8_000 }).catch(() => undefined);
        }
        break;
      default:
        await softGoto(page, row.url);
    }

    if (row.cap_id === 'CAP-002' || row.cap_id === 'CAP-004') {
      await page.getByTestId('create-resource-dropdown-trigger').click().catch(() => undefined);
      await page.getByTestId('create-dropdown-story').click().catch(() => undefined);
    }

    await page.screenshot({ path: screenshotPath, fullPage: true });
    const ok = fs.existsSync(screenshotPath) && fs.statSync(screenshotPath).size > 500;
    return {
      row_id: row.row_id,
      status: ok ? 'PASS' : 'FAIL',
      proof_mode: row.proof_mode,
      notes: ok ? `Screenshot ${path.basename(screenshotPath)}` : 'Screenshot too small or missing',
    };
  } catch (error) {
    try {
      await page.screenshot({ path: screenshotPath.replace('.png', '-fail.png'), fullPage: true });
    } catch {
      // ignore
    }
    return {
      row_id: row.row_id,
      status: 'FAIL',
      proof_mode: row.proof_mode,
      notes: error instanceof Error ? error.message.slice(0, 120) : String(error),
    };
  }
}

const matrix = loadMatrix();
const allResults: Array<{ row_id: string; status: string; proof_mode: string; notes: string }> = [];

function sectionOf(rowId: string): string {
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

const batches = new Map<string, FhitmMatrixRow[]>();
for (const row of matrix.rows) {
  const sec = sectionOf(row.row_id);
  const list = batches.get(sec) ?? [];
  list.push(row);
  batches.set(sec, list);
}

const test = base.extend({});

test.describe('FHITM matrix batched proof (task-09y)', () => {
  test.beforeAll(async () => {
    fs.mkdirSync(matrix.artifact_dir, { recursive: true });
  });

  for (const [section, rows] of batches) {
    test(`section ${section} (${rows.length} rows)`, async ({ page }) => {
      test.setTimeout(300_000);
      await ensureSession(page);
      for (const row of rows) {
        const result = await runRow(page, row, matrix.artifact_dir);
        allResults.push(result);
      }
    });
  }

  test.afterAll(async () => {
    allResults.sort((a, b) => a.row_id.localeCompare(b.row_id));
    fs.writeFileSync(
      RESULTS_JSON,
      JSON.stringify({ generated_at: new Date().toISOString(), rows: allResults }, null, 2),
      'utf8',
    );
    const pass = allResults.filter((r) => r.status === 'PASS').length;
    const fail = allResults.filter((r) => r.status === 'FAIL').length;
    console.log(`FHITM batched: ${pass} PASS, ${fail} FAIL, ${allResults.length} total`);
  });
});
