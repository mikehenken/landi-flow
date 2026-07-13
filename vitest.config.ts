import { defineConfig } from 'vitest/config';
import path from 'node:path';

const rootDir = __dirname;
const packagesDir = path.join(rootDir, 'packages');
const frontendDir = path.join(rootDir, 'frontend');

export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    alias: [
      { find: '@landi-flow/core/events', replacement: path.join(packagesDir, 'core/src/events/topics.ts') },
      { find: '@landi-flow/core/types', replacement: path.join(packagesDir, 'core/src/types/index.ts') },
      { find: '@landi-flow/core/mcp', replacement: path.join(packagesDir, 'core/src/mcp/index.ts') },
      { find: '@landi-flow/core', replacement: path.join(packagesDir, 'core/src/index.ts') },
      { find: '@landi-flow/auth/rbac', replacement: path.join(packagesDir, 'auth/src/rbac.ts') },
      { find: '@landi-flow/auth/env', replacement: path.join(packagesDir, 'auth/src/env.ts') },
      { find: '@landi-flow/auth/jwt', replacement: path.join(packagesDir, 'auth/src/jwt.ts') },
      { find: '@landi-flow/auth/schema', replacement: path.join(packagesDir, 'auth/src/schema.ts') },
      { find: '@landi-flow/auth', replacement: path.join(packagesDir, 'auth/src/index.ts') },
      { find: '@landi-flow/collaboration', replacement: path.join(packagesDir, 'collaboration/src/index.ts') },
      { find: '@landi-flow/ui/i18n', replacement: path.join(packagesDir, 'ui/src/i18n/index.ts') },
      { find: '@landi-flow/ui', replacement: path.join(packagesDir, 'ui/src/index.ts') },
      { find: '@/lib/seed-data', replacement: path.join(frontendDir, 'src/lib/seed-data.ts') },
      { find: '@/lib/agents/assign-agent', replacement: path.join(frontendDir, 'src/lib/agents/assign-agent.ts') },
      { find: '@/lib/agents/mcp-dispatch', replacement: path.join(frontendDir, 'src/lib/agents/mcp-dispatch.ts') },
      { find: '@/stores/story-store', replacement: path.join(frontendDir, 'src/stores/story-store.ts') },
      { find: '@/lib/utils', replacement: path.join(packagesDir, 'ui/src/lib/utils.ts') },
      { find: /^@\/(.*)/, replacement: `${path.join(frontendDir, 'src')}/$1` },
      { find: '@', replacement: path.join(packagesDir, 'ui/src') },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20_000,
    include: [
      'packages/core/src/**/*.test.ts',
      'packages/auth/src/**/*.test.ts',
      'packages/collaboration/src/**/*.test.ts',
      'packages/ui/src/**/*.test.ts',
      'tests/integration/**/*.test.ts',
      'frontend/src/**/*.integration.test.ts',
      'frontend/src/stores/**/*.test.ts',
      'frontend/src/lib/**/*.test.ts',
      'frontend/src/components/**/*.test.ts',
      'workers/**/src/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'packages/core/src/events/**/*.ts',
        'packages/core/src/types/workspace-settings.ts',
        'packages/auth/src/env.ts',
        'packages/auth/src/jwt.ts',
        'packages/auth/src/rbac.ts',
        'packages/auth/src/schema.ts',
        'packages/collaboration/src/comment-attribution.ts',
        'packages/collaboration/src/hydration.ts',
        'packages/collaboration/src/permissions.ts',
        'packages/collaboration/src/rooms.ts',
        'packages/collaboration/src/structured-field-reconcile.ts',
        'packages/ui/src/lib/utils.ts',
        'packages/ui/src/components/editor/create-instant-markdown-extensions.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.stories.tsx',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
