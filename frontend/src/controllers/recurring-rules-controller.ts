import type { RecurringStoryRule } from '@landi-flow/core/types';
import { isMockAuthEnabled } from '@/lib/api/config';
import { createStory } from '@/controllers/story-controller';
import {
  createRecurringRule as createMockRecurringRule,
  listRecurringRules,
  runRecurringRule as runMockRecurringRule,
  toggleRecurringRule as toggleMockRecurringRule,
} from '@/lib/recurring-stories/recurring-stories-store';

interface RecurringRulesListResponse {
  ok: boolean;
  rules: RecurringStoryRule[];
  errorText?: string;
}

interface RecurringRuleMutationResponse {
  ok: boolean;
  rule: RecurringStoryRule;
  errorText?: string;
}

async function fetchRecurringRulesApi(teamId: string): Promise<RecurringStoryRule[]> {
  const response = await fetch(
    `/api/recurring-rules?team_id=${encodeURIComponent(teamId)}`,
    { cache: 'no-store' },
  );
  if (!response.ok) {
    throw new Error(`Failed to load recurring rules (${response.status})`);
  }
  const payload = (await response.json()) as RecurringRulesListResponse;
  if (!payload.ok) {
    throw new Error(payload.errorText ?? 'Failed to load recurring rules');
  }
  return payload.rules ?? [];
}

async function postRecurringRuleApi(body: Record<string, unknown>): Promise<RecurringStoryRule> {
  const response = await fetch('/api/recurring-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to create recurring rule (${response.status})`);
  }
  const payload = (await response.json()) as RecurringRuleMutationResponse;
  if (!payload.ok) {
    throw new Error(payload.errorText ?? 'Failed to create recurring rule');
  }
  return payload.rule;
}

async function patchRecurringRuleApi(
  body: Record<string, unknown>,
): Promise<RecurringStoryRule> {
  const response = await fetch('/api/recurring-rules', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to update recurring rule (${response.status})`);
  }
  const payload = (await response.json()) as RecurringRuleMutationResponse;
  if (!payload.ok) {
    throw new Error(payload.errorText ?? 'Failed to update recurring rule');
  }
  return payload.rule;
}

export async function loadRecurringRules(teamId: string): Promise<RecurringStoryRule[]> {
  if (isMockAuthEnabled()) {
    return listRecurringRules(teamId);
  }
  return fetchRecurringRulesApi(teamId);
}

export async function createRecurringRule(input: {
  workspaceId: string;
  teamId: string;
  titleTemplate: string;
  cadence?: RecurringStoryRule['cadence'];
}): Promise<RecurringStoryRule> {
  if (isMockAuthEnabled()) {
    return createMockRecurringRule(input.teamId, input.titleTemplate, input.cadence);
  }

  return postRecurringRuleApi({
    workspace_id: input.workspaceId,
    team_id: input.teamId,
    title_template: input.titleTemplate,
    cadence: input.cadence ?? 'weekly',
  });
}

export async function toggleRecurringRule(
  ruleId: string,
  enabled: boolean,
): Promise<RecurringStoryRule> {
  if (isMockAuthEnabled()) {
    const updated = toggleMockRecurringRule(ruleId, enabled);
    if (!updated) {
      throw new Error('Recurring rule not found');
    }
    return updated;
  }

  return patchRecurringRuleApi({ rule_id: ruleId, enabled });
}

export async function runRecurringRule(input: {
  workspaceId: string;
  rule: RecurringStoryRule;
}): Promise<{ storyId: string; rule: RecurringStoryRule }> {
  if (isMockAuthEnabled()) {
    const result = runMockRecurringRule(input.rule.id);
    if (!result) {
      throw new Error('Recurring rule is disabled or missing');
    }
    return { storyId: result.storyId, rule: result.rule };
  }

  if (!input.rule.enabled) {
    throw new Error('Recurring rule is disabled');
  }

  const now = new Date().toISOString();
  const dateLabel = now.slice(0, 10);
  const title = input.rule.title_template.replace('{date}', dateLabel);

  const story = await createStory({
    workspaceId: input.workspaceId,
    teamId: input.rule.team_id,
    title,
    descriptionMd: `Auto-spawned by recurring rule **${input.rule.id}** (${input.rule.cadence}).`,
  });

  const rule = await patchRecurringRuleApi({
    rule_id: input.rule.id,
    last_spawn_at: now,
    spawn_count: input.rule.spawn_count + 1,
  });

  return { storyId: story.id, rule };
}
