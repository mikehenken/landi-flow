import { describe, expect, it } from 'vitest';
import { parseWorkspaceSettings } from './workspace-settings';

describe('parseWorkspaceSettings', () => {
  it('returns empty object for null/undefined', () => {
    expect(parseWorkspaceSettings(null)).toEqual({});
    expect(parseWorkspaceSettings(undefined)).toEqual({});
  });

  it('parses theme tokens', () => {
    const result = parseWorkspaceSettings({
      theme: { brand_primary: '#3366ff', logo_url: 'https://cdn.example/logo.svg' },
    });
    expect(result.theme?.brand_primary).toBe('#3366ff');
    expect(result.theme?.logo_url).toContain('logo.svg');
  });

  it('parses default_locale and custom_domains', () => {
    const result = parseWorkspaceSettings({
      default_locale: 'es',
      custom_domains: ['tracker.acme.test', 42, 'valid.example'],
    });
    expect(result.default_locale).toBe('es');
    expect(result.custom_domains).toEqual(['tracker.acme.test', 'valid.example']);
  });

  it('ignores invalid theme shape', () => {
    expect(parseWorkspaceSettings({ theme: ['not-an-object'] }).theme).toBeUndefined();
  });

  it('parses terminology overrides', () => {
    const result = parseWorkspaceSettings({
      terminology: {
        story: 'Task',
        stories: 'Tasks',
        epic: 'Initiative',
        epics: 'Initiatives',
        workspace: 'Organization',
      },
    });
    expect(result.terminology).toEqual({
      story: 'Task',
      stories: 'Tasks',
      epic: 'Initiative',
      epics: 'Initiatives',
      workspace: 'Organization',
    });
  });

  it('ignores empty terminology strings and invalid shape', () => {
    expect(parseWorkspaceSettings({ terminology: { story: '  ' } }).terminology).toBeUndefined();
    expect(parseWorkspaceSettings({ terminology: ['not-an-object'] }).terminology).toBeUndefined();
  });
});
