import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
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
      '@': path.join(__dirname, '../packages/ui/src'),
    };
    return config;
  },
};

export default nextConfig;
