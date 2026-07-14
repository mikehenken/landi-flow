import type { RecurringStoryRule } from '@landi-flow/core/types';
import { DEMO_TEAM_ID, DEMO_WORKSPACE_ID, SEED_STORIES } from '@/lib/seed-data';
import { storyStore } from '@/stores/story-store';
import { WORKFLOW_STATES } from '@/lib/workflow-states';

export const RECURRING_RULES_STORAGE_KEY = 'landi-flow:recurring-story-rules';

export const SEED_RECURRING_RULES: RecurringStoryRule[] = [
  {
    id: 'recur-standup',
    workspace_id: DEMO_WORKSPACE_ID,
    team_id: DEMO_TEAM_ID,
    title_template: 'Weekly standup notes — {date}',
    cadence: 'weekly',
    enabled: true,
    last_spawn_at: null,
    spawn_count: 0,
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-01T10:00:00.000Z',
  },
];

function readRules(): RecurringStoryRule[] {
  if (typeof window === 'undefined') {
    return SEED_RECURRING_RULES;
  }
  try {
    const raw = window.localStorage.getItem(RECURRING_RULES_STORAGE_KEY);
    if (!raw) {
      return SEED_RECURRING_RULES;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RecurringStoryRule[]) : SEED_RECURRING_RULES;
  } catch {
    return SEED_RECURRING_RULES;
  }
}

function writeRules(rules: RecurringStoryRule[]): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(RECURRING_RULES_STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // ignore
  }
}

export function listRecurringRules(teamId: string = DEMO_TEAM_ID): RecurringStoryRule[] {
  return readRules().filter((row) => row.team_id === teamId);
}

export function createRecurringRule(
  teamId: string,
  titleTemplate: string,
  cadence: RecurringStoryRule['cadence'] = 'weekly',
): RecurringStoryRule {
  const now = new Date().toISOString();
  const rule: RecurringStoryRule = {
    id: `recur-${crypto.randomUUID()}`,
    workspace_id: DEMO_WORKSPACE_ID,
    team_id: teamId,
    title_template: titleTemplate,
    cadence,
    enabled: true,
    last_spawn_at: null,
    spawn_count: 0,
    created_at: now,
    updated_at: now,
  };
  writeRules([...readRules(), rule]);
  return rule;
}

export function toggleRecurringRule(ruleId: string, enabled: boolean): RecurringStoryRule | null {
  const rules = readRules();
  const index = rules.findIndex((row) => row.id === ruleId);
  if (index < 0) {
    return null;
  }
  const updated: RecurringStoryRule = {
    ...rules[index]!,
    enabled,
    updated_at: new Date().toISOString(),
  };
  writeRules(rules.map((row, i) => (i === index ? updated : row)));
  return updated;
}

/** CAP-010: scheduler spawns a story from rule template and records proof timestamp. */
export function runRecurringRule(ruleId: string): { rule: RecurringStoryRule; storyId: string } | null {
  const rules = readRules();
  const index = rules.findIndex((row) => row.id === ruleId);
  if (index < 0) {
    return null;
  }
  const rule = rules[index]!;
  if (!rule.enabled) {
    return null;
  }

  const dateLabel = new Date().toISOString().slice(0, 10);
  const title = rule.title_template.replace('{date}', dateLabel);
  const now = new Date().toISOString();
  const storyId = `story-recur-${crypto.randomUUID()}`;

  const nextNumber =
    SEED_STORIES.reduce((max, story) => Math.max(max, story.number), 0) + rule.spawn_count + 1;

  storyStore.upsertStory({
    id: storyId,
    workspace_id: DEMO_WORKSPACE_ID,
    team_id: rule.team_id,
    number: nextNumber,
    identifier: `LAN-${nextNumber}`,
    title,
    description_json: null,
    description_md: `Auto-spawned by recurring rule **${rule.id}** (${rule.cadence}).`,
    workflow_state_id: WORKFLOW_STATES.todo,
    priority: 'none',
    assignee_id: null,
    creator_id: 'user-jane',
    follower_ids: [],
    label_ids: [],
    delegate_agent_id: null,
    epic_id: null,
    milestone_id: null,
    cycle_id: null,
    estimate: null,
    due_date: null,
    sort_order: nextNumber,
    is_draft: false,
    archived_at: null,
    correlation_id: `corr-recur-${rule.id}`,
    created_at: now,
    updated_at: now,
  });

  const updatedRule: RecurringStoryRule = {
    ...rule,
    last_spawn_at: now,
    spawn_count: rule.spawn_count + 1,
    updated_at: now,
  };
  writeRules(rules.map((row, i) => (i === index ? updatedRule : row)));

  return { rule: updatedRule, storyId };
}
