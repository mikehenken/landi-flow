import type { Epic, Story, WorkflowState } from '@landi-flow/core/types';
import {
  buildBoardRoomId,
  buildEpicRoomId,
  buildStoryRoomId,
} from './rooms.js';
import type {
  BoardColumnStorage,
  BoardRoomStorage,
  EpicRoomStorage,
  HydratedBoardRoom,
  HydratedEpicRoom,
  HydratedStoryRoom,
  StoryRoomStorage,
} from './types.js';

export function storyToInitialStorage(story: Story): StoryRoomStorage {
  return {
    fields: {
      title: story.title,
      statusId: story.workflow_state_id,
      priority: story.priority,
      assigneeId: story.assignee_id,
      delegateAgentId: story.delegate_agent_id,
      sortOrder: story.sort_order,
    },
    labels: [],
  };
}

export function epicToInitialStorage(epic: Epic, storyOrder: string[]): EpicRoomStorage {
  return {
    summary: {
      name: epic.name,
      statusId: epic.status_id,
      priority: epic.priority,
      leadId: epic.lead_id,
      targetDate: epic.target_date,
    },
    storyOrder,
  };
}

export function storiesToBoardStorage(
  stories: Story[],
  workflowStates: WorkflowState[]
): BoardRoomStorage {
  const sortedStates = [...workflowStates].sort((a, b) => a.position - b.position);

  const columns: BoardColumnStorage[] = sortedStates.map((state) => {
    const cards = stories
      .filter((s) => s.workflow_state_id === state.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((s) => s.id);

    return {
      statusId: state.id,
      cards,
    };
  });

  return { columns };
}

export function hydrateStoryRoom(story: Story): HydratedStoryRoom {
  return {
    roomId: buildStoryRoomId(story.workspace_id, story.id),
    initialStorage: storyToInitialStorage(story),
    story,
  };
}

export function hydrateEpicRoom(
  epic: Epic,
  storyOrder: string[]
): HydratedEpicRoom {
  return {
    roomId: buildEpicRoomId(epic.workspace_id, epic.id),
    initialStorage: epicToInitialStorage(epic, storyOrder),
    epic,
  };
}

export function hydrateBoardRoom(
  workspaceId: string,
  teamId: string,
  stories: Story[],
  workflowStates: WorkflowState[]
): HydratedBoardRoom {
  return {
    roomId: buildBoardRoomId(workspaceId, teamId),
    initialStorage: storiesToBoardStorage(stories, workflowStates),
    teamId,
  };
}
