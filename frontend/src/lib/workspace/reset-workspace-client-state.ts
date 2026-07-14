import { resetWorkspaceRuntimeContext } from '@/lib/api/workspace-context';
import { resetStoreHydrationState } from '@/components/store-hydrator';
import { customerStore } from '@/stores/customer-store';
import { epicStore } from '@/stores/epic-store';
import { inboxStore } from '@/stores/inbox-store';
import { memberStore } from '@/stores/member-store';
import { storyStore } from '@/stores/story-store';

/**
 * Clears client domain caches so a soft workspace switch rehydrates cleanly
 * without a full `window.location.reload()`.
 */
export function resetWorkspaceClientState(): void {
  resetWorkspaceRuntimeContext();
  resetStoreHydrationState();
  storyStore.reset();
  epicStore.reset();
  customerStore.reset();
  memberStore.reset();
  inboxStore.reset();
}
