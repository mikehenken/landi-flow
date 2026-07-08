import type { Workspace } from '@landi-flow/core/types';
import { parseWorkspaceSettings } from '@landi-flow/core/types';
import type { ResolvedWorkspace } from '@/lib/workspace/registry';

/** Maps API workspace rows into the frontend ResolvedWorkspace shape. */
export function toResolvedWorkspace(workspace: Workspace): ResolvedWorkspace {
  return {
    ...workspace,
    parsedSettings: parseWorkspaceSettings(workspace.settings),
  };
}
