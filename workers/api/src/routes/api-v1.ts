import type { ApiWorkerEnv } from '../middleware/auth.js';
import { createDbClient, type DbClient } from '../lib/db.js';
import { isAuthorizationError } from '../lib/authorization.js';
import { correlationFromRequest, errorResponse, jsonResponse } from '../lib/http.js';
import { WorkspaceController } from '../controllers/workspace-controller.js';
import { EpicController } from '../controllers/epic-controller.js';
import {
  StoryController,
  MilestoneController,
  WorkflowStateController,
} from '../controllers/story-controller.js';
import { CycleController, ViewController } from '../controllers/cycle-view-controller.js';
import { RelationController } from '../controllers/relation-controller.js';

function parseJsonBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function handleApiRequest(
  env: ApiWorkerEnv,
  request: Request,
  userId: string
): Promise<Response> {
  const url = new URL(request.url);
  const correlation = correlationFromRequest(request);
  const correlationId = correlation.correlation_id;

  if (!url.pathname.startsWith('/api/v1')) {
    return errorResponse('not_found', 'Route not found', 404, correlationId);
  }

  const pathParts = url.pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean);

  if (pathParts[0] === 'health' && request.method === 'GET') {
    return jsonResponse({ status: 'ok', correlation_id: correlationId }, 200, correlationId);
  }

  const db = createDbClient(env);

  const controller = <T extends new (env: ApiWorkerEnv, db: DbClient, userId: string) => unknown>(
    Ctor: T
  ): InstanceType<T> => new Ctor(env, db, userId) as InstanceType<T>;

  try {
    // GET /workspaces
    if (pathParts[0] === 'workspaces' && pathParts.length === 1 && request.method === 'GET') {
      const wsController = controller(WorkspaceController);
      const data = await wsController.list(correlation);
      return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
    }

    // POST /workspaces
    if (pathParts[0] === 'workspaces' && pathParts.length === 1 && request.method === 'POST') {
      const body = await parseJsonBody<{ slug: string; name: string; icon_url?: string }>(request);
      const wsController = controller(WorkspaceController);
      const result = await wsController.create(body, correlation);
      return jsonResponse(result, 201, correlationId);
    }

    // /workspaces/{wid}/...
    if (pathParts[0] === 'workspaces' && pathParts.length >= 2 && isUuid(pathParts[1])) {
      const workspaceId = pathParts[1];
      const rest = pathParts.slice(2);

      // GET/PATCH /workspaces/{wid}
      if (rest.length === 0) {
        const wsController = controller(WorkspaceController);
        if (request.method === 'GET') {
          const workspace = await wsController.getById(workspaceId);
          if (!workspace) {
            return errorResponse('workspace_not_found', 'Workspace not found', 404, correlationId);
          }
          return jsonResponse({ workspace, correlation_id: correlationId }, 200, correlationId);
        }
        if (request.method === 'PATCH') {
          const body = await parseJsonBody<Record<string, unknown>>(request);
          const result = await wsController.update(workspaceId, body, correlation);
          return jsonResponse(result, 200, correlationId);
        }
      }

      // /workspaces/{wid}/workflow-states?team_id=
      if (rest[0] === 'workflow-states') {
        const workflowController = controller(WorkflowStateController);
        const teamId = url.searchParams.get('team_id');

        if (rest.length === 1 && request.method === 'GET') {
          if (!teamId || !isUuid(teamId)) {
            return errorResponse(
              'invalid_request',
              'Query parameter team_id (uuid) is required',
              400,
              correlationId
            );
          }
          const data = await workflowController.list(workspaceId, teamId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }

        if (rest.length === 1 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<WorkflowStateController['create']>[1]>(request);
          if (!body.team_id || !isUuid(body.team_id)) {
            return errorResponse('invalid_request', 'team_id is required', 400, correlationId);
          }
          const result = await workflowController.create(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
      }

      // /workspaces/{wid}/epics
      if (rest[0] === 'epics') {
        const epicController = controller(EpicController);
        const milestoneController = controller(MilestoneController);

        if (rest.length === 1 && request.method === 'GET') {
          const data = await epicController.list(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest.length === 1 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<EpicController['create']>[1]>(request);
          const result = await epicController.create(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }

        if (rest.length >= 2 && isUuid(rest[1])) {
          const epicId = rest[1];
          const epicRest = rest.slice(2);

          if (epicRest.length === 0) {
            if (request.method === 'GET') {
              const epic = await epicController.getById(workspaceId, epicId);
              if (!epic) {
                return errorResponse('epic_not_found', 'Epic not found', 404, correlationId);
              }
              return jsonResponse({ epic, correlation_id: correlationId }, 200, correlationId);
            }
            if (request.method === 'PATCH') {
              const body = await parseJsonBody<Parameters<EpicController['update']>[2]>(request);
              const result = await epicController.update(workspaceId, epicId, body, correlation);
              return jsonResponse(result, 200, correlationId);
            }
          }

          if (epicRest[0] === 'stories' && epicRest.length === 1 && request.method === 'GET') {
            const storyController = controller(StoryController);
            const data = await storyController.listByEpic(workspaceId, epicId);
            return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
          }

          if (epicRest[0] === 'milestones') {
            if (epicRest.length === 1 && request.method === 'GET') {
              const data = await milestoneController.listByEpic(workspaceId, epicId);
              return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
            }
            if (epicRest.length === 1 && request.method === 'POST') {
              const body = await parseJsonBody<{ name: string; description?: string; target_date?: string }>(
                request
              );
              const result = await milestoneController.create(workspaceId, epicId, body, correlation);
              return jsonResponse(result, 201, correlationId);
            }
            if (epicRest.length === 3 && epicRest[2] && isUuid(epicRest[1]) && request.method === 'PATCH') {
              const milestoneId = epicRest[1];
              const body = await parseJsonBody<Record<string, unknown>>(request);
              const result = await milestoneController.update(
                workspaceId,
                epicId,
                milestoneId,
                body,
                correlation
              );
              return jsonResponse(result, 200, correlationId);
            }
          }

          if (epicRest[0] === 'teams' && epicRest.length === 1 && request.method === 'PUT') {
            const body = await parseJsonBody<{ team_ids: string[] }>(request);
            await epicController.setTeams(workspaceId, epicId, body.team_ids ?? []);
            return jsonResponse({ ok: true, correlation_id: correlationId }, 200, correlationId);
          }
        }
      }

      // /workspaces/{wid}/views
      if (rest[0] === 'views') {
        const viewController = controller(ViewController);
        if (rest.length === 1 && request.method === 'GET') {
          const data = await viewController.list(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest.length === 1 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<ViewController['create']>[1]>(request);
          const result = await viewController.create(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
        if (rest.length === 2 && isUuid(rest[1])) {
          const viewId = rest[1];
          if (request.method === 'GET') {
            const view = await viewController.getById(workspaceId, viewId);
            if (!view) {
              return errorResponse('view_not_found', 'View not found', 404, correlationId);
            }
            return jsonResponse({ view, correlation_id: correlationId }, 200, correlationId);
          }
          if (request.method === 'PATCH') {
            const body = await parseJsonBody<Parameters<ViewController['update']>[2]>(request);
            const result = await viewController.update(workspaceId, viewId, body, correlation);
            return jsonResponse(result, 200, correlationId);
          }
          if (request.method === 'DELETE') {
            const result = await viewController.delete(workspaceId, viewId, correlation);
            return jsonResponse(result, 200, correlationId);
          }
        }
      }

      // /workspaces/{wid}/teams/{tid}/stories|issues|cycles
      if (rest[0] === 'teams' && rest.length >= 2 && isUuid(rest[1])) {
        const teamId = rest[1];
        const teamRest = rest.slice(2);
        const resource = teamRest[0];
        const isIssuesAlias = resource === 'issues';
        const storyResource = resource === 'stories' || isIssuesAlias;

        if (storyResource) {
          const storyController = controller(StoryController);
          const relationController = controller(RelationController);

          if (teamRest.length === 1 && request.method === 'GET') {
            const data = await storyController.list(workspaceId, teamId);
            return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
          }
          if (teamRest.length === 1 && request.method === 'POST') {
            const body = await parseJsonBody<Parameters<StoryController['create']>[1]>(request);
            const result = await storyController.create(
              workspaceId,
              { ...body, team_id: teamId },
              correlation
            );
            return jsonResponse(result, 201, correlationId);
          }

          if (teamRest.length >= 2) {
            const storyRef = teamRest[1];
            const storyRest = teamRest.slice(2);

            let story = isUuid(storyRef)
              ? await storyController.getById(workspaceId, teamId, storyRef)
              : await storyController.getByIdentifier(workspaceId, storyRef);

            if (!story && teamRest.length === 2) {
              if (request.method === 'GET') {
                return errorResponse('story_not_found', `Story ${storyRef} was not found`, 404, correlationId, {
                  story_ref: storyRef,
                });
              }
              if (request.method === 'PATCH') {
                return errorResponse('story_not_found', `Story ${storyRef} was not found`, 404, correlationId);
              }
            }

            if (story && storyRest.length === 0) {
              if (request.method === 'GET') {
                return jsonResponse({ story, correlation_id: correlationId }, 200, correlationId);
              }
              if (request.method === 'PATCH') {
                const body = await parseJsonBody<Parameters<StoryController['update']>[3]>(request);
                const result = await storyController.update(
                  workspaceId,
                  teamId,
                  story.id,
                  body,
                  correlation
                );
                return jsonResponse(result, 200, correlationId);
              }
            }

            if (story && storyRest[0] === 'relations') {
              if (storyRest.length === 1 && request.method === 'GET') {
                const data = await relationController.list(workspaceId, story.id);
                return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
              }
              if (storyRest.length === 1 && request.method === 'POST') {
                const body = await parseJsonBody<Parameters<RelationController['create']>[2]>(request);
                const result = await relationController.create(workspaceId, story.id, body, correlation);
                return jsonResponse(result, 201, correlationId);
              }
              if (storyRest.length === 2 && isUuid(storyRest[1]) && request.method === 'DELETE') {
                const result = await relationController.remove(
                  workspaceId,
                  story.id,
                  storyRest[1],
                  correlation
                );
                return jsonResponse(result, 200, correlationId);
              }
            }
          }
        }

        if (rest[2] === 'cycles' || teamRest[0] === 'cycles') {
          const cycleController = controller(CycleController);
          if (teamRest.length === 1 && request.method === 'GET') {
            const data = await cycleController.list(workspaceId, teamId);
            return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
          }
          if (teamRest.length === 1 && request.method === 'POST') {
            const body = await parseJsonBody<Parameters<CycleController['create']>[2]>(request);
            const result = await cycleController.create(workspaceId, teamId, body, correlation);
            return jsonResponse(result, 201, correlationId);
          }
          if (teamRest.length === 2 && isUuid(teamRest[1])) {
            const cycleId = teamRest[1];
            if (request.method === 'GET') {
              const cycle = await cycleController.getById(workspaceId, teamId, cycleId);
              if (!cycle) {
                return errorResponse('cycle_not_found', 'Cycle not found', 404, correlationId);
              }
              return jsonResponse({ cycle, correlation_id: correlationId }, 200, correlationId);
            }
            if (request.method === 'PATCH') {
              const body = await parseJsonBody<Parameters<CycleController['update']>[3]>(request);
              const result = await cycleController.update(workspaceId, teamId, cycleId, body, correlation);
              return jsonResponse(result, 200, correlationId);
            }
          }
          if (teamRest.length === 3 && teamRest[2] === 'complete' && isUuid(teamRest[1]) && request.method === 'POST') {
            const cycleId = teamRest[1];
            const result = await cycleController.complete(workspaceId, teamId, cycleId, correlation);
            return jsonResponse(result, 200, correlationId);
          }
        }
      }
    }

    return errorResponse('not_found', 'Route not found', 404, correlationId, { path: url.pathname });
  } catch (err) {
    if (isAuthorizationError(err)) {
      return errorResponse('forbidden', err.message, 403, correlationId);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    const code = status === 404 ? 'not_found' : 'internal_error';
    return errorResponse(code, message, status, correlationId);
  }
}
