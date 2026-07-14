import { describe, expect, it } from 'vitest';
import { reconcileStructuredFields } from './structured-field-reconcile';
import type { StoryFieldsStorage } from './types';

const baseFields: StoryFieldsStorage = {
  title: 'Original title',
  statusId: 'state-todo',
  priority: 'medium',
  assigneeId: null,
  delegateAgentId: null,
  sortOrder: 100,
};

describe('NF-01: concurrent human LiveObject + agent Action Bus', () => {
  it('converges to source-of-truth after fan-out when human and agent edit same field', () => {
    const humanLiveObject: StoryFieldsStorage = {
      ...baseFields,
      title: 'Human in-room draft title',
    };

    const sourceOfTruth: StoryFieldsStorage = {
      ...baseFields,
      title: 'Agent applied via Action Bus',
      delegateAgentId: 'agent-triage',
    };

    const result = reconcileStructuredFields({
      liveObjectFields: humanLiveObject,
      sourceOfTruthFields: sourceOfTruth,
      pendingHumanEdits: [
        {
          field: 'title',
          value: 'Human in-room draft title',
          source: 'human_liveobject',
          timestamp: Date.now(),
        },
      ],
      agentApply: {
        field: 'title',
        value: 'Agent applied via Action Bus',
        source: 'agent_action_bus',
        timestamp: Date.now() - 50,
      },
    });

    expect(result.fields.title).toBe('Agent applied via Action Bus');
    expect(result.fields.delegateAgentId).toBe('agent-triage');
    expect(result.reconciledFields).toContain('title');
  });

  it('accepts concurrent human priority edit reconciled to SoT status change', () => {
    const live: StoryFieldsStorage = {
      ...baseFields,
      priority: 'urgent',
      statusId: 'state-todo',
    };
    const soT: StoryFieldsStorage = {
      ...baseFields,
      priority: 'high',
      statusId: 'state-in-progress',
      delegateAgentId: 'agent-1',
    };

    const result = reconcileStructuredFields({
      liveObjectFields: live,
      sourceOfTruthFields: soT,
      pendingHumanEdits: [
        {
          field: 'priority',
          value: 'urgent',
          source: 'human_liveobject',
          timestamp: 1000,
        },
      ],
      agentApply: {
        field: 'statusId',
        value: 'state-in-progress',
        source: 'agent_action_bus',
        timestamp: 999,
      },
    });

    expect(result.fields.statusId).toBe('state-in-progress');
    expect(result.fields.priority).toBe('high');
    expect(result.reconciledFields).toContain('priority');
  });

  it('leaves fields unchanged when LiveObject matches SoT', () => {
    const result = reconcileStructuredFields({
      liveObjectFields: baseFields,
      sourceOfTruthFields: baseFields,
    });
    expect(result.reconciledFields).toEqual([]);
    expect(result.fields).toEqual(baseFields);
  });
});
