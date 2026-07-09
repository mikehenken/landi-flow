import type { NextConfig } from 'next';
import { loadEnvConfig } from '@next/env';
import path from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const repoRoot = path.join(__dirname, '..');

// Monorepo: canonical secrets live in landi-flow/.env.local, not frontend/.env.local.
// Next.js only loads .env* from the app directory by default — pull root env so
// NEXT_PUBLIC_* vars inline into the client bundle and server routes see process.env.
loadEnvConfig(repoRoot, process.env.NODE_ENV !== 'production', console, true);

// Root .env.local may set NEXT_PUBLIC_MOCK_AUTH= (empty). E2E launcher sets LANDI_FORCE_MOCK_AUTH.
if (process.env.LANDI_FORCE_MOCK_AUTH === 'true') {
  process.env.NEXT_PUBLIC_MOCK_AUTH = 'true';
}

const nextConfig: NextConfig = {
  // Vercel build (next-on-pages) resolves app cwd incorrectly when tracing root is the monorepo parent.
  ...(process.env.VERCEL === '1' ? {} : { outputFileTracingRoot: repoRoot }),
  transpilePackages: ['@landi-flow/ui', '@landi-flow/core', '@landi-flow/auth', '@landi-flow/collaboration'],
  experimental: {
    externalDir: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  webpack: (config) => {
    const frontendSrc = path.join(__dirname, 'src');
    const uiSrc = path.join(repoRoot, 'packages/ui/src');
    config.resolve.alias = {
      ...config.resolve.alias,
      // Frontend @/* first; fall back to UI package for shared `@/lib/utils` etc.
      '@': [frontendSrc, uiSrc],
    };
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

const config = withNextIntl(nextConfig);

export default config;
