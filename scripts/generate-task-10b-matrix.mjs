#!/usr/bin/env node
/**
 * Generates task-10b functionality matrix from FHITM checklist (119 rows) + 21 page surfaces.
 * Output: landi-labs/.../task-10b-visual-regression-i18n/iteration-2/task-10b-matrix.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(scriptDir, '..');
const studyRoot = path.join(
  repoRoot,
  '../landi-labs/studies/Orchestration/linear-clone-product-lifecycle',
);

const FHITM_SOURCE = path.join(
  studyRoot,
  'logs/09-functional-completion/task-09y-manual-browser-test-matrix/iteration-0/fhitm-matrix.json',
);

const ITERATION = process.env.TASK_10B_ITERATION ?? '2';
const OUT_DIR = path.join(
  studyRoot,
  `logs/10-testing/task-10b-visual-regression-i18n/iteration-${ITERATION}`,
);
const SCREENSHOT_DIR = path.join(OUT_DIR, 'screenshots');
const MATRIX_OUT = path.join(OUT_DIR, 'task-10b-matrix.json');

/** 21 frontend-page-approval surfaces (live-app exercise where routable). */
const PAGE_ROWS = [
  { id: 'PAGE-001', page_id: 'workspace_nav_and_shell', name: 'Workspace Navigation & Shell', url: '/en/workspace/inbox', action: 'shell' },
  { id: 'PAGE-002', page_id: 'all_issues_list_view', name: 'All Issues List View', url: '/en/workspace/stories', action: 'navigate' },
  { id: 'PAGE-003', page_id: 'all_issues_board_view', name: 'All Issues Board View', url: '/en/workspace/stories/board', action: 'board' },
  { id: 'PAGE-004', page_id: 'issue_detail', name: 'Issue/Story Detail', url: '/en/workspace/stories', action: 'story-detail' },
  { id: 'PAGE-005', page_id: 'create_issue_modal', name: 'Create Issue Modal', url: '/en/workspace/inbox', action: 'create-story-modal' },
  { id: 'PAGE-006', page_id: 'project_list', name: 'Project/Epic List', url: '/en/workspace/epics', action: 'navigate' },
  { id: 'PAGE-007', page_id: 'project_overview', name: 'Project/Epic Overview', url: '/en/workspace/epics/epic-001', action: 'epic-detail-seed' },
  { id: 'PAGE-008', page_id: 'project_issues', name: 'Project/Epic Issues', url: '/en/workspace/epics/epic-001', action: 'epic-detail-seed' },
  { id: 'PAGE-009', page_id: 'views_index', name: 'Views Index', url: '/en/workspace/views', action: 'navigate' },
  { id: 'PAGE-010', page_id: 'customers', name: 'Customers', url: '/en/workspace/customers', action: 'navigate' },
  { id: 'PAGE-011', page_id: 'inbox', name: 'Inbox', url: '/en/workspace/inbox', action: 'inbox-panels' },
  { id: 'PAGE-012', page_id: 'settings_account_preferences', name: 'Settings: Account Preferences', url: '/en/workspace/account', action: 'navigate' },
  { id: 'PAGE-013', page_id: 'settings_workspace_key_areas', name: 'Settings: Workspace Key Areas', url: '/en/workspace/settings/general', action: 'navigate' },
  { id: 'PAGE-014', page_id: 'command_menu', name: 'Command Menu', url: '/en/workspace/inbox', action: 'command-menu' },
  { id: 'PAGE-015', page_id: 'filter_panel', name: 'Filter Panel', url: '/en/workspace/stories', action: 'filter-panel' },
  { id: 'PAGE-016', page_id: 'display_panel', name: 'Display Panel', url: '/en/workspace/stories', action: 'display-panel' },
  { id: 'PAGE-017', page_id: 'agent_ai_ui_surfaces', name: 'Agent & AI UI Surfaces', url: '/en/workspace/agents', action: 'navigate' },
  { id: 'PAGE-018', page_id: 'auth_sign_in', name: 'Auth: Sign In', url: '/en/auth/login', action: 'auth-page' },
  { id: 'PAGE-019', page_id: 'auth_sign_up', name: 'Auth: Sign Up', url: '/en/auth/signup', action: 'auth-page' },
  { id: 'PAGE-020', page_id: 'auth_oauth_callbacks', name: 'Auth: OAuth Callbacks', url: '/en/auth/login', action: 'auth-page', proof_mode: 'manual', notes: 'OAuth callback is server-only; login page shown as proxy' },
  { id: 'PAGE-021', page_id: 'extension_marketplace_shell', name: 'Extension Marketplace Shell', url: '/en/marketplace', action: 'navigate' },
];

function slugId(rowId, capId) {
  return `${rowId.toLowerCase()}-${capId.toLowerCase()}`;
}

function main() {
  if (!fs.existsSync(FHITM_SOURCE)) {
    console.error(`Missing FHITM source: ${FHITM_SOURCE}`);
    process.exit(1);
  }

  const source = JSON.parse(fs.readFileSync(FHITM_SOURCE, 'utf8'));
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'screenshot-analysis'), { recursive: true });

  const fhitmRows = source.rows.map((row) => ({
    ...row,
    matrix_type: 'fhitm',
    screenshot_id: slugId(row.row_id, row.cap_id),
    screenshot_file: `${slugId(row.row_id, row.cap_id)}.png`,
    screenshot_path: path.join(SCREENSHOT_DIR, `${slugId(row.row_id, row.cap_id)}.png`),
  }));

  const pageRows = PAGE_ROWS.map((page) => ({
    row_id: page.id,
    cap_id: page.page_id,
    surface: page.name,
    dev_route: page.url,
    action: page.action,
    url: page.url,
    proof_mode: page.proof_mode ?? 'live_app',
    matrix_type: 'page',
    screenshot_id: page.id.toLowerCase(),
    screenshot_file: `${page.id.toLowerCase()}.png`,
    screenshot_path: path.join(SCREENSHOT_DIR, `${page.id.toLowerCase()}.png`),
    notes: page.notes ?? '',
  }));

  const payload = {
    generated_at: new Date().toISOString(),
    iteration: ITERATION,
    artifact_dir: SCREENSHOT_DIR,
    fhitm_row_count: fhitmRows.length,
    page_row_count: pageRows.length,
    total_row_count: fhitmRows.length + pageRows.length,
    rows: [...fhitmRows, ...pageRows],
  };

  fs.writeFileSync(MATRIX_OUT, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`Wrote ${payload.total_row_count} rows → ${MATRIX_OUT}`);
}

main();
