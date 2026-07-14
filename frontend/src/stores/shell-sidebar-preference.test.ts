import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SHELL_SIDEBAR_COLLAPSED,
  SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY,
  readShellSidebarCollapsedPreference,
  writeShellSidebarCollapsedPreference,
} from '@/lib/shell-sidebar-preference';

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('shell-sidebar-preference', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
    vi.stubGlobal('window', { localStorage: globalThis.localStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to open (not collapsed)', () => {
    expect(DEFAULT_SHELL_SIDEBAR_COLLAPSED).toBe(false);
    expect(readShellSidebarCollapsedPreference()).toBe(false);
  });

  it('persists collapsed preference in localStorage', () => {
    writeShellSidebarCollapsedPreference(true);
    expect(window.localStorage.getItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true');
    expect(readShellSidebarCollapsedPreference()).toBe(true);

    writeShellSidebarCollapsedPreference(false);
    expect(window.localStorage.getItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('false');
    expect(readShellSidebarCollapsedPreference()).toBe(false);
  });

  it('ignores invalid stored values', () => {
    window.localStorage.setItem(SHELL_SIDEBAR_COLLAPSED_STORAGE_KEY, 'maybe');
    expect(readShellSidebarCollapsedPreference()).toBe(false);
  });
});
