import type { EpicStatusCategory, StoryPriority } from '@landi-flow/core/types';

export interface TaxonomyLabel {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  scope: 'story' | 'epic';
}

export interface StoryTemplate {
  id: string;
  name: string;
  title_template: string;
  description_md: string;
  default_priority: StoryPriority;
  default_workflow_state_id: string;
  label_ids: string[];
}

export interface EpicTemplate {
  id: string;
  name: string;
  name_template: string;
  description_md: string;
  default_status_id: string;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  body_md: string;
}

export interface EpicStatusGroup {
  id: string;
  name: string;
  category: EpicStatusCategory;
  position: number;
}

export interface ReleaseRecord {
  id: string;
  name: string;
  version: string;
  released_at: string | null;
  description: string | null;
}

export interface CustomEmoji {
  id: string;
  name: string;
  shortcode: string;
  image_url: string;
}
