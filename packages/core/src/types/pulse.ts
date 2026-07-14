/** CAP-063–065 — Pulse product update feed. */

export interface PulseUpdate {
  id: string;
  workspace_id: string;
  epic_id: string | null;
  title: string;
  body_md: string;
  author_id: string | null;
  created_at: string;
}

export interface PulseSchedule {
  id: string;
  workspace_id: string;
  label: string;
  cadence: 'daily' | 'weekly' | 'biweekly';
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}
