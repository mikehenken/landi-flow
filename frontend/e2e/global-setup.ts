import fs from 'node:fs';
import path from 'node:path';

const frontendDir = path.resolve(__dirname, '..');
const repoDir = path.resolve(frontendDir, '..');

const studyDir = path.resolve(
  repoDir,
  '../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/10-testing/task-10-testing/screenshots',
);
const qaProofDir = path.resolve(
  repoDir,
  '../landi-labs/studies/Orchestration/linear-clone-product-lifecycle/outputs/11-qa/task-11-qa/qa-proof',
);
const localDir = path.join(frontendDir, 'test-results/e2e-screenshots');

function loadRootEnvLocal(): void {
  const envPath = path.join(repoDir, '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export default function globalSetup(): void {
  loadRootEnvLocal();

  for (const dir of [studyDir, qaProofDir, localDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
