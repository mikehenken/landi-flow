import type { NextConfig } from 'next';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..');

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  transpilePackages: ['@landi-flow/ui', '@landi-flow/core', '@landi-flow/auth'],
  experimental: {
    externalDir: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(repoRoot, 'packages/ui/src'),
    };
    return config;
  },
};

export default nextConfig;
