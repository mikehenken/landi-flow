#!/usr/bin/env node
/**
 * Copies Storybook Playwright screenshots into STUDY-013 task-10b output folder.
 * Usage: node scripts/copy-storybook-screenshots-to-study.mjs [study-screenshots-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const sourceRoot = path.join(repoRoot, 'packages/ui/test-results/storybook-screenshots');
const defaultDest = path.resolve(
  repoRoot,
  '../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/10-testing/task-10b-visual-regression-i18n/screenshots',
);

const destRoot = process.argv[2] ? path.resolve(process.argv[2]) : defaultDest;

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source missing: ${src}`);
    process.exit(1);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(sourceRoot, destRoot);
const count = fs.readdirSync(destRoot, { recursive: true }).filter((f) => {
  const p = path.join(destRoot, f);
  return fs.statSync(p).isFile();
}).length;
console.log(`Copied ${count} screenshot(s) to ${destRoot}`);
