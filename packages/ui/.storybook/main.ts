import type { StorybookConfig } from '@storybook/react-vite';
import type { Plugin } from 'vite';
import { mergeConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'path';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const uiSrc = path.resolve(dirname, '../src');
const frontendSrc = path.resolve(dirname, '../../../frontend/src');

const EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];

function resolveSubpath(baseDir: string, subpath: string): string | undefined {
  for (const ext of EXTENSIONS) {
    const candidate = path.join(baseDir, `${subpath}${ext}`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  for (const ext of EXTENSIONS) {
    const candidate = path.join(baseDir, subpath, `index${ext}`);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/** Mirrors frontend tsconfig `@/*` → frontend/src then packages/ui/src fallback. */
function landiAtAliasPlugin(): Plugin {
  return {
    name: 'landi-at-alias',
    enforce: 'pre',
    resolveId(source) {
      if (!source.startsWith('@/')) {
        return null;
      }

      const subpath = source.slice(2);
      const fromFrontend = resolveSubpath(frontendSrc, subpath);
      if (fromFrontend) {
        return fromFrontend;
      }

      const fromUi = resolveSubpath(uiSrc, subpath);
      if (fromUi) {
        return fromUi;
      }

      return null;
    },
  };
}

const monorepoPublic = path.resolve(dirname, '../../../public');

const config: StorybookConfig = {
  staticDirs: [{ from: monorepoPublic, to: '/' }],
  stories: [
    '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../../frontend/src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-themes',
    '@storybook/addon-a11y',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [landiAtAliasPlugin()],
      resolve: {
        alias: {
          // More specific subpath aliases must precede package root alias.
          '@landi-flow/core/types': path.resolve(dirname, '../../core/src/types/index.ts'),
          '@landi-flow/core': path.resolve(dirname, '../../core/src/index.ts'),
          '@landi-flow/ui': path.resolve(dirname, '../src/index.ts'),
        },
      },
    });
  },
};

export default config;
