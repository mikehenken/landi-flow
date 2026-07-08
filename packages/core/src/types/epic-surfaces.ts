/** CAP-045–047 — epic advanced surface link records. */

export interface EpicCustomerLink {
  id: string;
  epic_id: string;
  customer_id: string;
  created_at: string;
}

export interface EpicTeamLink {
  id: string;
  epic_id: string;
  team_id: string;
  created_at: string;
}

export interface EpicAttachedView {
  id: string;
  epic_id: string;
  view_id: string;
  position: number;
  created_at: string;
}
