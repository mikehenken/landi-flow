/** CAP-010 — recurring story spawn rules per team. */

export type RecurringCadence = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurringStoryRule {
  id: string;
  workspace_id: string;
  team_id: string;
  title_template: string;
  cadence: RecurringCadence;
  enabled: boolean;
  last_spawn_at: string | null;
  spawn_count: number;
  created_at: string;
  updated_at: string;
}
