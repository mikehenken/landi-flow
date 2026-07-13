'use client';

import * as React from 'react';
import type { Story } from '@landi-flow/core/types';
import { assignAndActRequest } from '@/lib/agents/assign-client';
import { getDelegateAttributionLabel } from '@/lib/agents/roster-client';
import {
  updateStoryDelegateAgent,
  updateStoryDescription,
  updateStoryEpic,
  updateStoryFollowers,
  updateStoryOwner,
  updateStoryPriority,
  updateStoryWorkflowState,
  updateStoryCycle,
  updateStoryEstimate,
  updateStoryDueDate,
  updateStoryTeam,
  updateStoryLabels,
} from '@/controllers/story-controller';
import { useAssignableMembers } from '@/hooks/use-assignable-members';
import { useStoryActivity } from '@/hooks/use-story-activity';
import type { PickerMember } from '@landi-flow/ui';

export interface StoryPropertyHandlers {
  storyActivity: ReturnType<typeof useStoryActivity>;
  pickerMembers: PickerMember[];
  requester: PickerMember | null;
  delegateMember: PickerMember | null;
  delegateAttribution: string | null;
  agentActivity: string | null;
  handleDescriptionChange: (markdown: string) => void;
  handleSelectOwner: (userId: string | null) => void;
  handleFollowersChange: (followerIds: string[]) => void;
  handleStatusChange: (workflowStateId: string) => void;
  handlePriorityChange: (priority: Story['priority']) => void;
  handleEpicChange: (epicId: string | null) => void;
  handleSelectAgent: (agentId: string | null) => void;
  handleCycleChange: (cycleId: string | null) => void;
  handleEstimateChange: (estimate: number | null) => void;
  handleDueDateChange: (dueDate: string | null) => void;
  handleTeamChange: (teamId: string) => void;
  handleLabelsChange: (labelIds: string[]) => void;
}

/** Shared story property mutation handlers for inspector, sidebar, and main content. */
export function useStoryPropertyHandlers(story: Story): StoryPropertyHandlers {
  const [agentActivity, setAgentActivity] = React.useState<string | null>(null);
  const storyActivity = useStoryActivity(story);
  const { pickerMembers, getMemberById, getAgentName } = useAssignableMembers();
  const requester =
    pickerMembers.find((member) => member.id === story.creator_id) ?? null;
  const delegateMember =
    pickerMembers.find((member) => member.id === story.delegate_agent_id) ?? null;
  const delegateAttribution = getDelegateAttributionLabel(
    getMemberById(story.delegate_agent_id),
  );

  const handleDescriptionChange = React.useCallback(
    (markdown: string) => {
      void updateStoryDescription(story.workspace_id, story, markdown);
    },
    [story],
  );

  const handleSelectOwner = React.useCallback(
    (userId: string | null) => {
      void updateStoryOwner(story.workspace_id, story, userId);
      void assignAndActRequest({
        entity: 'story',
        entityId: story.id,
        workspaceId: story.workspace_id,
        humanId: userId,
        entityLabel: story.identifier,
      });
    },
    [story],
  );

  const handleFollowersChange = React.useCallback(
    (followerIds: string[]) => {
      void updateStoryFollowers(story.workspace_id, story, followerIds);
    },
    [story],
  );

  const handleStatusChange = React.useCallback(
    (workflowStateId: string) => {
      void updateStoryWorkflowState(story.workspace_id, story, workflowStateId);
    },
    [story],
  );

  const handlePriorityChange = React.useCallback(
    (priority: Story['priority']) => {
      void updateStoryPriority(story.workspace_id, story, priority);
    },
    [story],
  );

  const handleEpicChange = React.useCallback(
    (epicId: string | null) => {
      void updateStoryEpic(story.workspace_id, story, epicId);
    },
    [story],
  );

  const handleCycleChange = React.useCallback(
    (cycleId: string | null) => {
      void updateStoryCycle(story.workspace_id, story, cycleId);
    },
    [story],
  );

  const handleEstimateChange = React.useCallback(
    (estimate: number | null) => {
      void updateStoryEstimate(story.workspace_id, story, estimate);
    },
    [story],
  );

  const handleDueDateChange = React.useCallback(
    (dueDate: string | null) => {
      void updateStoryDueDate(story.workspace_id, story, dueDate);
    },
    [story],
  );

  const handleTeamChange = React.useCallback(
    (teamId: string) => {
      void updateStoryTeam(story.workspace_id, story, teamId);
    },
    [story],
  );

  const handleSelectAgent = React.useCallback(
    (agentId: string | null) => {
      void updateStoryDelegateAgent(story.workspace_id, story, agentId);
      if (agentId) {
        setAgentActivity(`${getAgentName(agentId)} is acting via the Action Bus…`);
      } else {
        setAgentActivity(null);
      }
      void assignAndActRequest({
        entity: 'story',
        entityId: story.id,
        workspaceId: story.workspace_id,
        delegateAgentId: agentId,
        entityLabel: story.identifier,
      }).then((result) => {
        if (!agentId) {
          return;
        }
        setAgentActivity(
          result.ok
            ? `${getAgentName(agentId)} picked up ${story.identifier}${result.live ? '' : ' (mock Action Bus)'}`
            : `Assignment failed: ${result.errorText ?? 'unknown error'}`,
        );
        if (result.ok) {
          storyActivity.reload();
        }
      });
    },
    [story, getAgentName, storyActivity],
  );

  const handleLabelsChange = React.useCallback(
    (labelIds: string[]) => {
      void updateStoryLabels(story.workspace_id, story, labelIds);
    },
    [story],
  );

  return {
    storyActivity,
    pickerMembers,
    requester,
    delegateMember,
    delegateAttribution,
    agentActivity,
    handleDescriptionChange,
    handleSelectOwner,
    handleFollowersChange,
    handleStatusChange,
    handlePriorityChange,
    handleEpicChange,
    handleSelectAgent,
    handleCycleChange,
    handleEstimateChange,
    handleDueDateChange,
    handleTeamChange,
    handleLabelsChange,
  };
}
