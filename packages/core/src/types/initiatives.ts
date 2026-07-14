/** CAP-058–060 — initiatives planning container. */

export type InitiativeStatus = 'active' | 'planned' | 'completed';

export interface Initiative {
  id: string;
  workspace_id: string;
  name: string;
  description_md: string | null;
  status: InitiativeStatus;
  owner_id: string | null;
  start_date: string | null;
  target_date: string | null;
  epic_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface InitiativeSettings {
  workspace_id: string;
  enabled: boolean;
  schedule_cadence: 'weekly' | 'biweekly' | 'monthly';
  updated_at: string;
}
