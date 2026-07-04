import { EXTENSION_TOPICS } from '@landi-flow/core/events';
import type {
  CorrelationContext,
  ExtensionCatalogItem,
  ExtensionInstall,
} from '@landi-flow/core/types';
import { BaseController } from './base-controller.js';

export class ExtensionController extends BaseController {
  async listCatalog(): Promise<ExtensionCatalogItem[]> {
    const { data, error } = await this.db
      .from('extensions')
      .select('*')
      .order('is_official', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to list extension catalog: ${error.message}`);
    }

    return (data ?? []) as ExtensionCatalogItem[];
  }

  async listInstalled(workspaceId: string): Promise<ExtensionInstall[]> {
    await this.assertWorkspaceMember(workspaceId);

    const { data, error } = await this.db
      .from('extension_installs')
      .select('*, extension:extensions(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to list extension installs: ${error.message}`);
    }

    return (data ?? []) as ExtensionInstall[];
  }

  async installBySlug(
    workspaceId: string,
    slug: string,
    config: Record<string, unknown> | undefined,
    ctx: CorrelationContext
  ): Promise<{ install: ExtensionInstall; signing_secret?: string; outbox_event_id: string | null }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { data: extension, error: extError } = await this.db
      .from('extensions')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (extError) {
      throw new Error(`Failed to resolve extension: ${extError.message}`);
    }

    if (!extension) {
      throw new Error('extension_not_found');
    }

    const { entity, outbox_event_id } = await this.mutateWithOutbox<ExtensionInstall>(
      workspaceId,
      EXTENSION_TOPICS.INSTALLED,
      { extension_id: extension.id, slug, installed_by: this.userId },
      ctx,
      'install_extension',
      {
        extension_id: extension.id,
        config: config ?? {},
        installed_by: this.userId,
      }
    );

    return { install: entity, outbox_event_id };
  }

  async uninstall(
    workspaceId: string,
    installId: string,
    ctx: CorrelationContext
  ): Promise<{ removed: boolean; outbox_event_id: string | null }> {
    await this.assertWorkspaceAdmin(workspaceId);

    const { outbox_event_id } = await this.mutateWithOutbox<ExtensionInstall>(
      workspaceId,
      EXTENSION_TOPICS.UNINSTALLED,
      { install_id: installId },
      ctx,
      'uninstall_extension',
      { install_id: installId }
    );

    return { removed: true, outbox_event_id };
  }
}
