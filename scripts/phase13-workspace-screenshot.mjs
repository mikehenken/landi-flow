#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';

const base = 'https://landi-flow-staging.mikehenken.workers.dev';
const shotDir = process.argv[2];
if (!shotDir) process.exit(1);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(`${base}/en/auth/login?redirect=%2Fworkspace%2Fstories`, {
  waitUntil: 'networkidle',
  timeout: 45000,
});
await page.getByPlaceholder('Email').fill('test@example.com');
await page.getByPlaceholder('Password').fill('TestPassword123!');
await page.getByRole('button', { name: /sign in/i }).click();
await page.waitForURL('**/workspace/stories**', { timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({
  path: resolve(shotDir, '07-staging-workspace-stories-authenticated.png'),
  fullPage: true,
});
console.log('Saved workspace screenshot', page.url());
await browser.close();
