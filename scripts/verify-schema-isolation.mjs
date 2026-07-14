#!/usr/bin/env node
/**
 * task-09u — Static gate: all application DB clients use linear_clone schema only.
 * Read-only filesystem scan; does not connect to Supabase or mutate secrets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..');

const REQUIRED_SCHEMA = 'linear_clone';
const DB_CLIENT_FILES = [
  'frontend/src/lib/supabase/client.ts',
  'frontend/src/lib/supabase/server.ts',
  'frontend/src/lib/supabase/middleware.ts',
  'frontend/src/lib/supabase/route-auth.ts',
  'frontend/src/app/auth/callback/route.ts',
  'workers/api/src/lib/db.ts',
  'workers/mcp/src/lib/db.ts',
];

const FORBIDDEN_PATTERNS = [
  /\bdb:\s*\{\s*schema:\s*['"]public['"]/,
  /\.schema\s*\(\s*['"]public['"]\s*\)/,
];

function readFile(relativePath) {
  const absolute = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolute)) {
    return null;
  }
  return fs.readFileSync(absolute, 'utf8');
}

function assertDbClientsUseLinearClone() {
  const failures = [];
  for (const relativePath of DB_CLIENT_FILES) {
    const content = readFile(relativePath);
    if (content === null) {
      failures.push(`missing expected DB client file: ${relativePath}`);
      continue;
    }
    if (!content.includes('LINEAR_CLONE_SCHEMA')) {
      failures.push(`${relativePath}: missing LINEAR_CLONE_SCHEMA import/usage`);
    }
    if (!content.includes(`schema: LINEAR_CLONE_SCHEMA`)) {
      failures.push(`${relativePath}: db.schema must be LINEAR_CLONE_SCHEMA`);
    }
  }
  return failures;
}

function scanForbiddenPatterns() {
  const failures = [];
  const scanRoots = ['frontend/src', 'workers/api/src', 'workers/mcp/src', 'packages/auth/src'];

  for (const scanRoot of scanRoots) {
    const absoluteRoot = path.join(repoRoot, scanRoot);
    if (!fs.existsSync(absoluteRoot)) {
      continue;
    }
    walk(absoluteRoot, (filePath) => {
      if (!/\.(ts|tsx|js|mjs)$/.test(filePath)) {
        return;
      }
      const relative = path.relative(repoRoot, filePath).replace(/\\/g, '/');
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(content)) {
          failures.push(`${relative}: forbidden pattern ${pattern}`);
        }
      }
    });
  }
  return failures;
}

function walk(dir, onFile) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') {
        continue;
      }
      walk(full, onFile);
    } else {
      onFile(full);
    }
  }
}

function main() {
  const failures = [...assertDbClientsUseLinearClone(), ...scanForbiddenPatterns()];

  if (failures.length > 0) {
    console.error('Schema isolation gate FAILED:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log(
    `Schema isolation gate PASSED: ${DB_CLIENT_FILES.length} DB clients bound to ${REQUIRED_SCHEMA}`,
  );
}

main();
