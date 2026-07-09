#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const base = 'https://landi-flow-staging.mikehenken.workers.dev';
const shotDir = process.argv[2];
if (!shotDir) {
  console.error('Usage: node phase13-browser-smoke.mjs <screenshot-dir>');
  process.exit(1);
}
mkdirSync(shotDir, { recursive: true });
const log = [];

async function probe(name, url, shot) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: resolve(shotDir, shot), fullPage: true });
    log.push({ name, url, status: resp?.status() ?? null, finalUrl: page.url(), shot });
  } catch (e) {
    log.push({ name, url, error: String(e), shot });
  } finally {
    await browser.close();
  }
}

await probe('login', `${base}/en/auth/login`, '01-staging-login-initial.png');
await probe('auth_redirect_inbox', `${base}/en/workspace/inbox`, '04-staging-auth-redirect-inbox.png');
await probe('auth_redirect_stories', `${base}/en/workspace/stories`, '05-staging-auth-redirect-stories.png');

{
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const apiCalls = [];
  page.on('response', (r) => {
    if (r.url().includes('/api/v1/')) {
      apiCalls.push({ url: r.url(), status: r.status() });
    }
  });
  try {
    await page.goto(`${base}/en/auth/login?redirect=%2Fworkspace%2Fstories`, {
      waitUntil: 'networkidle',
      timeout: 45000,
    });
    await page.getByPlaceholder('Email').fill('test@example.com');
    await page.getByPlaceholder('Password').fill('TestPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: resolve(shotDir, '02-staging-login-after-auth-attempt.png'),
      fullPage: true,
    });
    const errLocator = page.locator('text=/530|Failed to load workspace|Invalid/i').first();
    const errText = (await errLocator.count()) > 0 ? await errLocator.textContent() : null;
    if (errText) {
      await page.screenshot({
        path: resolve(shotDir, '06-staging-workspace-load-530-error.png'),
        fullPage: true,
      });
      log.push({ name: 'workspace_error', errorText: errText.trim(), apiCalls });
    }
    log.push({ name: 'login_attempt', finalUrl: page.url(), apiCalls, errText });
  } catch (e) {
    log.push({ name: 'login_attempt', error: String(e), apiCalls });
  } finally {
    await browser.close();
  }
}

writeFileSync(resolve(shotDir, '..', 'browser-smoke-log.json'), JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));
