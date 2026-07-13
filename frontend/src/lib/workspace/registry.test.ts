import { describe, expect, it } from 'vitest';
import { DEMO_WORKSPACE_ID } from '@/lib/seed-data';
import {
  buildPlaceholderWorkspace,
  resolveInitialWorkspace,
} from '@/lib/workspace/registry';

const LIVE_WORKSPACE_ID = 'd36ba4c7-f4a1-4fa9-a5e4-3ea5588060c2';

describe('resolveInitialWorkspace', () => {
  it('returns registry entry for demo workspace id', () => {
    const workspace = resolveInitialWorkspace(DEMO_WORKSPACE_ID);
    expect(workspace.id).toBe(DEMO_WORKSPACE_ID);
    expect(workspace.slug).toBe('landi-flow');
    expect(workspace.icon_url).toBe('/assets/logo/logomark-primary.svg');
  });

  it('returns placeholder for real UUID workspace ids', () => {
    const workspace = resolveInitialWorkspace(LIVE_WORKSPACE_ID);
    expect(workspace.id).toBe(LIVE_WORKSPACE_ID);
    expect(workspace.name).toBe('Workspace');
  });

  it('buildPlaceholderWorkspace never uses demo seed ids', () => {
    const placeholder = buildPlaceholderWorkspace(LIVE_WORKSPACE_ID);
    expect(placeholder.id).toBe(LIVE_WORKSPACE_ID);
    expect(placeholder.id).not.toBe(DEMO_WORKSPACE_ID);
  });
});
