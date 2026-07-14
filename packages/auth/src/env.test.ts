import { describe, expect, it } from 'vitest';
import {
  AUTH_ENV_KEYS,
  getEnv,
  hasSupabaseServiceConfig,
  hasSupabaseUserClientConfig,
  requireEnv,
} from './env';

describe('requireEnv', () => {
  it('returns value when present', () => {
    expect(requireEnv('TEST_KEY', { TEST_KEY: 'value' })).toBe('value');
  });

  it('throws when missing', () => {
    expect(() => requireEnv('MISSING', {})).toThrow('Missing required environment variable');
  });
});

describe('getEnv', () => {
  it('returns undefined for absent keys', () => {
    expect(getEnv('ABSENT', {})).toBeUndefined();
  });
});

describe('hasSupabaseUserClientConfig', () => {
  it('requires url and anon key', () => {
    expect(
      hasSupabaseUserClientConfig({
        [AUTH_ENV_KEYS.supabaseUrl]: 'https://x.supabase.co',
        [AUTH_ENV_KEYS.supabaseAnonKey]: 'anon',
      }),
    ).toBe(true);
    expect(hasSupabaseUserClientConfig({})).toBe(false);
  });
});

describe('hasSupabaseServiceConfig', () => {
  it('requires service role key in addition to user client config', () => {
    const partial = {
      [AUTH_ENV_KEYS.supabaseUrl]: 'https://x.supabase.co',
      [AUTH_ENV_KEYS.supabaseAnonKey]: 'anon',
    };
    expect(hasSupabaseServiceConfig(partial)).toBe(false);
    expect(
      hasSupabaseServiceConfig({
        ...partial,
        [AUTH_ENV_KEYS.supabaseServiceRoleKey]: 'service',
      }),
    ).toBe(true);
  });
});
