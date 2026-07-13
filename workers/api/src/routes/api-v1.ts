import type { ApiWorkerEnv } from '../middleware/auth.js';
import { createDbClient, type DbClient } from '../lib/db.js';
import { isAuthorizationError } from '../lib/authorization.js';
import { isMemberInviteError } from '../lib/member-invite.js';
import { correlationFromRequest, errorResponse, jsonResponse } from '../lib/http.js';
import { logAndSinkObsError } from '../lib/obs-logger.js';
import { WorkspaceController } from '../controllers/workspace-controller.js';
import { EpicController } from '../controllers/epic-controller.js';
import {
  StoryController,
  MilestoneController,
  WorkflowStateController,
} from '../controllers/story-controller.js';
import { CycleController, ViewController } from '../controllers/cycle-view-controller.js';
import { RelationController } from '../controllers/relation-controller.js';
import { CustomerController } from '../controllers/customer-controller.js';
import { CustomerRequestController } from '../controllers/customer-request-controller.js';
import { SlaController } from '../controllers/sla-controller.js';
import { AdminSettingsController } from '../controllers/admin-settings-controller.js';
import { ProfileController } from '../controllers/profile-controller.js';
import { MemberController } from '../controllers/member-controller.js';
import { InboxController } from '../controllers/inbox-controller.js';
import { TeamController } from '../controllers/team-controller.js';
import {
  EpicLabelCatalogController,
  StoryLabelController,
} from '../controllers/label-controller.js';
import { handleIntegrationsRoutes } from './integrations-routes.js';

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
    const integrationsResponse = await handleIntegrationsRoutes(
      env,
      request,
      userId,
      pathParts,
      correlationId
    );
    if (integrationsResponse) {
      return integrationsResponse;
    }

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

    // GET/PATCH /me/profile
    if (pathParts[0] === 'me' && pathParts[1] === 'profile') {
      const profileController = controller(ProfileController);
      if (request.method === 'GET') {
        const profile = await profileController.getProfile();
        return jsonResponse({ profile, correlation_id: correlationId }, 200, correlationId);
      }
      if (request.method === 'PATCH') {
        const body = await parseJsonBody<Parameters<ProfileController['updateProfile']>[0]>(request);
        const result = await profileController.updateProfile(body, correlation);
        return jsonResponse(result, 200, correlationId);
      }
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

      // /workspaces/{wid}/labels
      if (rest[0] === 'labels') {
        const labelController = controller(StoryLabelController);

        if (rest.length === 1 && request.method === 'GET') {
          const data = await labelController.list(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest.length === 1 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<StoryLabelController['create']>[1]>(request);
          const result = await labelController.create(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
        if (rest.length === 2 && isUuid(rest[1])) {
          const labelId = rest[1];
          if (request.method === 'PATCH') {
            const body = await parseJsonBody<Parameters<StoryLabelController['update']>[2]>(request);
            const result = await labelController.update(workspaceId, labelId, body, correlation);
            return jsonResponse(result, 200, correlationId);
          }
          if (request.method === 'DELETE') {
            const result = await labelController.delete(workspaceId, labelId, correlation);
            return jsonResponse(result, 200, correlationId);
          }
        }
      }

      // /workspaces/{wid}/epic-labels
      if (rest[0] === 'epic-labels') {
        const epicLabelController = controller(EpicLabelCatalogController);

        if (rest.length === 1 && request.method === 'GET') {
          const data = await epicLabelController.list(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest.length === 1 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<EpicLabelCatalogController['create']>[1]>(request);
          const result = await epicLabelController.create(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
        if (rest.length === 2 && isUuid(rest[1])) {
          const labelId = rest[1];
          if (request.method === 'PATCH') {
            const body = await parseJsonBody<Parameters<EpicLabelCatalogController['update']>[2]>(request);
            const result = await epicLabelController.update(workspaceId, labelId, body, correlation);
            return jsonResponse(result, 200, correlationId);
          }
          if (request.method === 'DELETE') {
            const result = await epicLabelController.delete(workspaceId, labelId, correlation);
            return jsonResponse(result, 200, correlationId);
          }
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

      // GET /workspaces/{wid}/teams
      if (rest[0] === 'teams' && rest.length === 1 && request.method === 'GET') {
        const teamController = controller(TeamController);
        const data = await teamController.list(workspaceId);
        return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
      }

      // GET /workspaces/{wid}/epic-statuses
      if (rest[0] === 'epic-statuses' && rest.length === 1 && request.method === 'GET') {
        const teamController = controller(TeamController);
        const data = await teamController.listEpicStatuses(workspaceId);
        return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
      }

      // GET /workspaces/{wid}/context/defaults
      if (rest[0] === 'context' && rest[1] === 'defaults' && rest.length === 2 && request.method === 'GET') {
        const teamController = controller(TeamController);
        const defaults = await teamController.ensureWorkspaceDefaults(workspaceId, correlation);
        return jsonResponse({ ...defaults, correlation_id: correlationId }, 200, correlationId);
      }

      // /workspaces/{wid}/customer-requests
      if (rest[0] === 'customer-requests') {
        const requestController = controller(CustomerRequestController);

        if (rest.length === 1 && request.method === 'GET') {
          const data = await requestController.list(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest.length === 1 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<CustomerRequestController['create']>[1]>(request);
          const result = await requestController.create(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
        if (rest.length === 3 && rest[2] === 'link' && isUuid(rest[1]) && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<CustomerRequestController['link']>[2]>(request);
          const result = await requestController.link(workspaceId, rest[1], body, correlation);
          return jsonResponse(result, 200, correlationId);
        }
      }

      // /workspaces/{wid}/slas
      if (rest[0] === 'slas') {
        const slaController = controller(SlaController);

        if (rest.length === 1 && request.method === 'GET') {
          const data = await slaController.list(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest.length === 1 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<SlaController['create']>[1]>(request);
          const result = await slaController.create(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
        if (rest.length === 2 && isUuid(rest[1])) {
          const slaId = rest[1];
          if (request.method === 'PATCH') {
            const body = await parseJsonBody<Parameters<SlaController['update']>[2]>(request);
            const result = await slaController.update(workspaceId, slaId, body, correlation);
            return jsonResponse(result, 200, correlationId);
          }
          if (request.method === 'DELETE') {
            const result = await slaController.delete(workspaceId, slaId, correlation);
            return jsonResponse(result, 200, correlationId);
          }
        }
      }

      // /workspaces/{wid}/settings/*
      if (rest[0] === 'settings') {
        const adminController = controller(AdminSettingsController);

        if (rest[1] === 'teams' && rest.length === 2 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<AdminSettingsController['createTeam']>[1]>(request);
          const result = await adminController.createTeam(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
        if (rest[1] === 'teams' && rest.length === 3 && isUuid(rest[2]) && request.method === 'PATCH') {
          const body = await parseJsonBody<Parameters<AdminSettingsController['updateTeam']>[2]>(request);
          const result = await adminController.updateTeam(workspaceId, rest[2], body, correlation);
          return jsonResponse(result, 200, correlationId);
        }
        if (rest[1] === 'invite-links' && rest.length === 2 && request.method === 'GET') {
          const data = await adminController.listInviteLinks(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest[1] === 'invite-links' && rest.length === 2 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<AdminSettingsController['createInviteLink']>[1]>(request);
          const result = await adminController.createInviteLink(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
        if (rest[1] === 'invite-links' && rest.length === 4 && rest[3] === 'revoke' && isUuid(rest[2]) && request.method === 'POST') {
          const result = await adminController.revokeInviteLink(workspaceId, rest[2], correlation);
          return jsonResponse(result, 200, correlationId);
        }
        if (rest[1] === 'security' && rest.length === 2 && request.method === 'PATCH') {
          const body = await parseJsonBody<{ allowed_domains?: string[] }>(request);
          const result = await adminController.updateSecuritySettings(workspaceId, body, correlation);
          return jsonResponse(result, 200, correlationId);
        }
        if (rest[1] === 'application-members' && rest.length === 2 && request.method === 'GET') {
          const data = await adminController.listApplicationMembers(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest[1] === 'authorized-apps' && rest.length === 2 && request.method === 'GET') {
          const data = await adminController.listAuthorizedApps(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest[1] === 'authorized-apps' && rest.length === 4 && rest[3] === 'revoke' && isUuid(rest[2]) && request.method === 'POST') {
          const result = await adminController.revokeAuthorizedApp(workspaceId, rest[2], correlation);
          return jsonResponse(result, 200, correlationId);
        }
        if (rest[1] === 'import' && rest[2] === 'csv' && rest.length === 3 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<AdminSettingsController['importCsvStories']>[1]>(request);
          const result = await adminController.importCsvStories(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
      }

      // /workspaces/{wid}/profile/*
      if (rest[0] === 'profile') {
        const profileController = controller(ProfileController);

        if (rest[1] === 'notifications' && rest.length === 2 && request.method === 'GET') {
          const prefs = await profileController.getNotificationPrefs(workspaceId);
          return jsonResponse({ prefs, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest[1] === 'notifications' && rest.length === 2 && request.method === 'PATCH') {
          const body = await parseJsonBody<Parameters<ProfileController['updateNotificationPrefs']>[1]>(request);
          const result = await profileController.updateNotificationPrefs(workspaceId, body, correlation);
          return jsonResponse(result, 200, correlationId);
        }
        if (rest[1] === 'leave' && rest.length === 2 && request.method === 'POST') {
          const result = await profileController.leaveWorkspace(workspaceId, correlation);
          return jsonResponse(result, 200, correlationId);
        }
      }

      // /workspaces/{wid}/teams/{tid}/stories/{sid}/sla
      if (rest[0] === 'teams' && rest.length >= 4 && isUuid(rest[1]) && rest[2] === 'stories' && isUuid(rest[3]) && rest[4] === 'sla' && request.method === 'GET') {
        const slaController = controller(SlaController);
        const status = await slaController.getStorySlaStatus(workspaceId, rest[3]);
        return jsonResponse({ status, correlation_id: correlationId }, 200, correlationId);
      }

      // /workspaces/{wid}/customers
      if (rest[0] === 'customers') {
        const customerController = controller(CustomerController);

        if (rest.length === 1 && request.method === 'GET') {
          const data = await customerController.list(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest.length === 1 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<CustomerController['create']>[1]>(request);
          const result = await customerController.create(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
        if (rest.length === 2 && isUuid(rest[1])) {
          const customerId = rest[1];
          if (request.method === 'PATCH') {
            const body = await parseJsonBody<Parameters<CustomerController['update']>[2]>(request);
            const result = await customerController.update(workspaceId, customerId, body, correlation);
            return jsonResponse(result, 200, correlationId);
          }
          if (request.method === 'DELETE') {
            const result = await customerController.delete(workspaceId, customerId, correlation);
            return jsonResponse(result, 200, correlationId);
          }
        }
      }

      // /workspaces/{wid}/inbox/notifications | /inbox/activity
      if (rest[0] === 'inbox') {
        const inboxController = controller(InboxController);

        if (rest[1] === 'notifications' && rest.length === 2 && request.method === 'GET') {
          const data = await inboxController.listNotifications(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }

        if (rest[1] === 'activity' && rest.length === 2 && request.method === 'GET') {
          const data = await inboxController.listActivity(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
      }

      // /workspaces/{wid}/members
      if (rest[0] === 'members') {
        const memberController = controller(MemberController);

        if (rest.length === 1 && request.method === 'GET') {
          const data = await memberController.list(workspaceId);
          return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
        }
        if (rest.length === 1 && request.method === 'POST') {
          const body = await parseJsonBody<Parameters<MemberController['invite']>[1]>(request);
          const result = await memberController.invite(workspaceId, body, correlation);
          return jsonResponse(result, 201, correlationId);
        }
        if (rest.length === 2 && isUuid(rest[1])) {
          const memberId = rest[1];
          if (request.method === 'PATCH') {
            const body = await parseJsonBody<Parameters<MemberController['update']>[2]>(request);
            const result = await memberController.update(workspaceId, memberId, body, correlation);
            return jsonResponse(result, 200, correlationId);
          }
          if (request.method === 'DELETE') {
            const result = await memberController.remove(workspaceId, memberId, correlation);
            return jsonResponse(result, 200, correlationId);
          }
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
            if (request.method === 'DELETE') {
              const result = await epicController.archive(workspaceId, epicId, correlation);
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
              if (request.method === 'DELETE') {
                const result = await storyController.archive(
                  workspaceId,
                  teamId,
                  story.id,
                  correlation
                );
                return jsonResponse(result, 200, correlationId);
              }
            }

            if (story && storyRest[0] === 'activity' && storyRest.length === 1 && request.method === 'GET') {
              const inboxController = controller(InboxController);
              const data = await inboxController.listStoryActivity(workspaceId, story.id);
              return jsonResponse({ data, correlation_id: correlationId }, 200, correlationId);
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
    if (isMemberInviteError(err)) {
      return errorResponse(err.code, err.message, 400, correlationId);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    const code = status === 404 ? 'not_found' : 'internal_error';
    if (status >= 500) {
      await logAndSinkObsError(env, message, correlation, { path: url.pathname });
    }
    return errorResponse(code, message, status, correlationId);
  }
}
