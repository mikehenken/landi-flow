export {
  WORKSPACE_REGISTRY,
  normalizeHostname,
  getWorkspaceById,
  getWorkspaceBySlug,
  buildPlaceholderWorkspace,
  resolveInitialWorkspace,
  resolveWorkspaceIdFromHost,
  resolveWorkspaceFromHost,
  getWorkspaceTheme,
  getWorkspaceLogoUrl,
  type ResolvedWorkspace,
} from './registry';
export {
  WorkspaceProvider,
  useWorkspace,
  useWorkspaceOptional,
  type WorkspaceContextValue,
  type WorkspaceProviderProps,
} from './workspace-provider';
export {
  ActiveWorkspaceProvider,
  type ActiveWorkspaceProviderProps,
} from './active-workspace-provider';
export { isWorkspaceUuid } from './is-workspace-uuid';
export { resetWorkspaceClientState } from './reset-workspace-client-state';
