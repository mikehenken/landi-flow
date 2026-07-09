import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SHELL_INSPECTOR_OPEN,
  SHELL_INSPECTOR_OPEN_STORAGE_KEY,
  readShellInspectorOpenPreference,
  writeShellInspectorOpenPreference,
} from '@/lib/shell-inspector-preference';

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

describe('shell-inspector-preference', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock());
    vi.stubGlobal('window', { localStorage: globalThis.localStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to open', () => {
    expect(DEFAULT_SHELL_INSPECTOR_OPEN).toBe(true);
    expect(readShellInspectorOpenPreference()).toBe(true);
  });

  it('persists open preference in localStorage', () => {
    writeShellInspectorOpenPreference(false);
    expect(window.localStorage.getItem(SHELL_INSPECTOR_OPEN_STORAGE_KEY)).toBe('false');
    expect(readShellInspectorOpenPreference()).toBe(false);

    writeShellInspectorOpenPreference(true);
    expect(window.localStorage.getItem(SHELL_INSPECTOR_OPEN_STORAGE_KEY)).toBe('true');
    expect(readShellInspectorOpenPreference()).toBe(true);
  });

  it('ignores invalid stored values', () => {
    window.localStorage.setItem(SHELL_INSPECTOR_OPEN_STORAGE_KEY, 'maybe');
    expect(readShellInspectorOpenPreference()).toBe(true);
  });
});
