import type { StoryFieldsStorage } from './types.js';

/** Source of a structured-field revision per task-05d two-authority split. */
export type StructuredFieldSource = 'human_liveobject' | 'agent_action_bus' | 'source_of_truth';

export interface StructuredFieldRevision<K extends keyof StoryFieldsStorage = keyof StoryFieldsStorage> {
  field: K;
  value: StoryFieldsStorage[K];
  source: StructuredFieldSource;
  /** Monotonic revision clock (ms). */
  timestamp: number;
}

export interface ReconcileStructuredFieldsInput {
  /** Current LiveObject snapshot (may include in-flight human LWW edits). */
  liveObjectFields: StoryFieldsStorage;
  /** Authoritative fields from Supabase after Action Bus apply. */
  sourceOfTruthFields: StoryFieldsStorage;
  /** Optional in-flight human edits not yet persisted. */
  pendingHumanEdits?: StructuredFieldRevision[];
  /** Optional agent Action Bus apply that committed to SoT. */
  agentApply?: StructuredFieldRevision;
}

export interface ReconcileStructuredFieldsResult {
  fields: StoryFieldsStorage;
  /** Fields where human LiveObject briefly diverged before fan-out reconciled. */
  reconciledFields: (keyof StoryFieldsStorage)[];
}

/**
 * NF-01 acceptance: concurrent human LiveObject LWW + agent Action Bus on the same
 * structured field converges to source-of-truth after fan-out (task-05d CR-02).
 *
 * Human in-room edits may briefly diverge; committed Action Bus writes + webhook
 * fan-out always win for structured columns.
 */
export function reconcileStructuredFields(
  input: ReconcileStructuredFieldsInput,
): ReconcileStructuredFieldsResult {
  const reconciledFields: (keyof StoryFieldsStorage)[] = [];
  const next: StoryFieldsStorage = { ...input.liveObjectFields };

  const humanByField = new Map<keyof StoryFieldsStorage, StructuredFieldRevision>();
  for (const edit of input.pendingHumanEdits ?? []) {
    humanByField.set(edit.field, edit);
  }

  for (const field of Object.keys(input.sourceOfTruthFields) as (keyof StoryFieldsStorage)[]) {
    const soTValue = input.sourceOfTruthFields[field];
    const liveValue = input.liveObjectFields[field];
    const humanEdit = humanByField.get(field);

    if (input.agentApply && input.agentApply.field === field) {
      if (liveValue !== soTValue || (humanEdit && humanEdit.value !== soTValue)) {
        reconciledFields.push(field);
      }
      (next as Record<keyof StoryFieldsStorage, StoryFieldsStorage[keyof StoryFieldsStorage]>)[field] =
        soTValue;
      continue;
    }

    if (humanEdit && humanEdit.value !== soTValue) {
      reconciledFields.push(field);
    }

    (next as Record<keyof StoryFieldsStorage, StoryFieldsStorage[keyof StoryFieldsStorage]>)[field] =
      soTValue;
  }

  return { fields: next, reconciledFields };
}
