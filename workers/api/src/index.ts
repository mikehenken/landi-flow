import {
  isPublicApiPath,
  requireAuthenticatedRequest,
  type ApiWorkerEnv,
} from './middleware/auth.js';
import { handleApiRequest } from './routes/api-v1.js';

export { LifecycleEmitter } from './lib/outbox-emitter.js';
export type { PrepareEmitStatement } from './lib/outbox-emitter.js';
export { BaseController } from './controllers/base-controller.js';
export { WorkspaceController } from './controllers/workspace-controller.js';
export { EpicController } from './controllers/epic-controller.js';
export { StoryController, MilestoneController, WorkflowStateController } from './controllers/story-controller.js';
export type { StoryCreateInput, WorkflowStateCreateInput } from './controllers/story-controller.js';
export { CycleController, ViewController } from './controllers/cycle-view-controller.js';
export { RelationController } from './controllers/relation-controller.js';
export {
  isPublicApiPath,
  requireAuthenticatedRequest,
  type ApiWorkerEnv,
} from './middleware/auth.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: ApiWorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && isPublicApiPath(url.pathname)) {
      return jsonResponse({
        ok: true,
        service: 'landi-flow-api',
        auth: 'supabase-bearer',
      });
    }

    if (url.pathname === '/api/v1/health' && request.method === 'GET') {
      return jsonResponse({ status: 'ok' });
    }

    if (url.pathname === '/api/v1/me' && request.method === 'GET') {
      const authResult = await requireAuthenticatedRequest(request, env);
      if (authResult instanceof Response) {
        return authResult;
      }
      const { user } = authResult;
      return jsonResponse({
        id: user.id,
        email: user.email,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      });
    }

    if (url.pathname.startsWith('/api/v1/')) {
      const authResult = await requireAuthenticatedRequest(request, env);
      if (authResult instanceof Response) {
        return authResult;
      }
      return handleApiRequest(env, request, authResult.user.id);
    }

    return jsonResponse({ error: 'Not found' }, 404);
  },
};
