import { describe, expect, it } from 'vitest';
import type { WorkflowState } from '@landi-flow/core/types';
import { resolveDefaultWorkflowStateId } from './workflow-state-defaults';

const sampleStates: WorkflowState[] = [
  {
    id: 'state-triage',
    team_id: 'team-1',
    name: 'Triage',
    category: 'triage',
    position: -1,
    is_default: false,
  },
  {
    id: 'state-todo',
    team_id: 'team-1',
    name: 'Todo',
    category: 'unstarted',
    position: 0,
    is_default: true,
  },
  {
    id: 'state-done',
    team_id: 'team-1',
    name: 'Done',
    category: 'completed',
    position: 2,
    is_default: false,
  },
];

describe('resolveDefaultWorkflowStateId', () => {
  it('returns the API default when provided', () => {
    expect(resolveDefaultWorkflowStateId('state-from-api', sampleStates)).toBe('state-from-api');
  });

  it('falls back to is_default when API default is null', () => {
    expect(resolveDefaultWorkflowStateId(null, sampleStates)).toBe('state-todo');
  });

  it('falls back to unstarted category when no is_default flag', () => {
    const states = sampleStates.map((state) => ({ ...state, is_default: false }));
    expect(resolveDefaultWorkflowStateId(null, states)).toBe('state-todo');
  });

  it('returns null for an empty state list', () => {
    expect(resolveDefaultWorkflowStateId(null, [])).toBeNull();
  });
});
