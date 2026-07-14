import type { ApiWorkerEnv } from '../middleware/auth.js';
import { createDbClient } from '../lib/db.js';
import { correlationFromRequest, errorResponse, jsonResponse } from '../lib/http.js';
import { logAndSinkObsError, logObs } from '../lib/obs-logger.js';

interface AsksIntakeBody {
  workspace_id: string;
  customer_id: string;
  quote: string;
  source?: 'web' | 'slack' | 'email' | 'api';
  source_url?: string | null;
  requester_name?: string | null;
}

function verifyAsksSecret(request: Request, env: ApiWorkerEnv): boolean {
  const configured = env.ASKS_INTAKE_WEBHOOK_SECRET?.trim();
  if (!configured) {
    return false;
  }
  const header =
    request.headers.get('X-Landi-Asks-Secret') ??
    request.headers.get('x-landi-asks-secret');
  return header === configured;
}

/** CAP-073: inbound asks intake webhook (Slack/email/web). */
export async function handleAsksIntakeWebhook(
  request: Request,
  env: ApiWorkerEnv,
): Promise<Response> {
  const correlation = correlationFromRequest(request);
  const correlationId = correlation.correlation_id;

  if (!verifyAsksSecret(request, env)) {
    await logAndSinkObsError(env, 'asks_intake_unauthorized', correlation);
    return errorResponse('unauthorized', 'Invalid asks intake secret', 401, correlationId);
  }

  let body: AsksIntakeBody;
  try {
    body = (await request.json()) as AsksIntakeBody;
  } catch {
    return errorResponse('invalid_body', 'Request body must be JSON', 400, correlationId);
  }

  if (!body.workspace_id || !body.customer_id || !body.quote?.trim()) {
    return errorResponse(
      'invalid_request',
      'workspace_id, customer_id, and quote are required',
      400,
      correlationId,
    );
  }

  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse('service_unavailable', 'Service role not configured', 503, correlationId);
  }

  const db = createDbClient(env);
  const { data, error } = await db
    .from('customer_requests')
    .insert({
      workspace_id: body.workspace_id,
      customer_id: body.customer_id,
      quote: body.quote.trim(),
      source: body.source ?? 'api',
      source_url: body.source_url ?? null,
      requester_name: body.requester_name ?? null,
      correlation_id: correlationId,
    })
    .select('id, workspace_id, customer_id, quote, source, created_at')
    .single();

  if (error || !data) {
    await logAndSinkObsError(env, `asks_intake_persist_failed: ${error?.message ?? 'unknown'}`, correlation, {
      workspace_id: body.workspace_id,
    });
    return errorResponse('persist_failed', error?.message ?? 'Failed to persist ask', 500, correlationId);
  }

  logObs('info', 'asks_intake_created', correlation, {
    request_id: (data as { id: string }).id,
    workspace_id: body.workspace_id,
  });

  return jsonResponse({ request: data, correlation_id: correlationId }, 201, correlationId);
}
