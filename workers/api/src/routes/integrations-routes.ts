import type { ApiWorkerEnv } from '../middleware/auth.js';
import { createDbClient, type DbClient } from '../lib/db.js';
import { correlationFromRequest, errorResponse, jsonResponse } from '../lib/http.js';
import { ExtensionController } from '../controllers/extension-controller.js';
import { WebhookController } from '../controllers/webhook-controller.js';
import { BillingController } from '../controllers/billing-controller.js';

function parseJsonBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function handleIntegrationsRoutes(
  env: ApiWorkerEnv,
  request: Request,
  userId: string,
  pathParts: string[],
  correlationId: string
): Promise<Response | null> {
  const db = createDbClient(env);
  const correlation = { correlation_id: correlationId };

  const controller = <T extends new (env: ApiWorkerEnv, db: DbClient, userId: string) => unknown>(
    Ctor: T
  ): InstanceType<T> => new Ctor(env, db, userId) as InstanceType<T>;

  // GET /extensions/catalog
  if (pathParts[0] === 'extensions' && pathParts[1] === 'catalog' && pathParts.length === 2) {
    if (request.method !== 'GET') {
      return errorResponse('method_not_allowed', 'GET required', 405, correlationId);
    }
    const extController = controller(ExtensionController);
    const data = await extController.listCatalog();
    return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
  }

  if (pathParts[0] !== 'workspaces' || pathParts.length < 2 || !isUuid(pathParts[1])) {
    return null;
  }

  const workspaceId = pathParts[1];
  const rest = pathParts.slice(2);

  // /workspaces/{wid}/extensions
  if (rest[0] === 'extensions') {
    const extController = controller(ExtensionController);

    if (rest.length === 1 && request.method === 'GET') {
      const data = await extController.listInstalled(workspaceId);
      return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
    }

    if (rest.length === 3 && rest[2] === 'install' && request.method === 'POST') {
      const slug = rest[1];
      const body = await parseJsonBody<{ config?: Record<string, unknown> }>(request);
      const result = await extController.installBySlug(workspaceId, slug, body.config, correlation);
      return jsonResponse(result, 201, correlationId);
    }

    if (rest.length === 2 && isUuid(rest[1]) && request.method === 'DELETE') {
      const result = await extController.uninstall(workspaceId, rest[1], correlation);
      return jsonResponse(result, 200, correlationId);
    }
  }

  // /workspaces/{wid}/webhooks
  if (rest[0] === 'webhooks') {
    const webhookController = controller(WebhookController);

    if (rest.length === 1 && request.method === 'GET') {
      const data = await webhookController.list(workspaceId);
      return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
    }

    if (rest.length === 1 && request.method === 'POST') {
      const body = await parseJsonBody<Parameters<WebhookController['create']>[1]>(request);
      const result = await webhookController.create(workspaceId, body, correlation);
      return jsonResponse(result, 201, correlationId);
    }

    if (rest.length >= 2 && isUuid(rest[1])) {
      const webhookId = rest[1];
      const hookRest = rest.slice(2);

      if (hookRest.length === 0 && request.method === 'PATCH') {
        const body = await parseJsonBody<Parameters<WebhookController['update']>[2]>(request);
        const result = await webhookController.update(workspaceId, webhookId, body, correlation);
        return jsonResponse(result, 200, correlationId);
      }

      if (hookRest.length === 0 && request.method === 'DELETE') {
        const result = await webhookController.remove(workspaceId, webhookId, correlation);
        return jsonResponse(result, 200, correlationId);
      }

      if (hookRest[0] === 'deliveries' && hookRest.length === 1 && request.method === 'GET') {
        const data = await webhookController.listDeliveries(workspaceId, webhookId);
        return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
      }
    }
  }

  // /workspaces/{wid}/billing/*
  if (rest[0] === 'billing') {
    const billingController = controller(BillingController);

    if (rest[1] === 'subscription' && rest.length === 2 && request.method === 'GET') {
      const subscription = await billingController.getSubscription(workspaceId);
      const entitlements = await billingController.listEntitlements(workspaceId);
      return jsonResponse(
        { subscription, entitlements, correlation_id: correlationId },
        200,
        correlationId
      );
    }

    if (rest[1] === 'checkout' && rest.length === 2 && request.method === 'POST') {
      const result = await billingController.createCheckoutSession(workspaceId, correlation);
      return jsonResponse({ ...result, correlation_id: correlationId }, 200, correlationId);
    }

    if (rest[1] === 'portal' && rest.length === 2 && request.method === 'POST') {
      const result = await billingController.createPortalSession(workspaceId);
      return jsonResponse({ ...result, correlation_id: correlationId }, 200, correlationId);
    }

    if (rest[1] === 'ai-usage' && rest.length === 2 && request.method === 'GET') {
      const summary = await billingController.getAiUsageSummary(workspaceId);
      return jsonResponse({ summary, correlation_id: correlationId }, 200, correlationId);
    }
  }

  return null;
}
