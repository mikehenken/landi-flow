import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const STORYBOOK_BASE_URL =
  process.env.STORYBOOK_URL ?? 'http://localhost:6006';

/** Default screenshot output under package; override via STUDY_SCREENSHOT_DIR for study artifacts. */
export const SCREENSHOT_ROOT =
  process.env.STUDY_SCREENSHOT_DIR ??
  path.resolve(__dirname, '../../test-results/storybook-screenshots');

export type BrandTheme = 'landi-default' | 'acme-agency' | 'rtl-demo';

export interface VisualTarget {
  storyId: string;
  name: string;
  brand: BrandTheme;
  /** Fullscreen stories need wider viewport */
  fullscreen?: boolean;
}

/** Storybook 8 iframe URL for a single story. */
export function storyIframeUrl(storyId: string): string {
  const params = new URLSearchParams({
    id: storyId,
    viewMode: 'story',
  });
  return `${STORYBOOK_BASE_URL}/iframe.html?${params.toString()}`;
}

export function screenshotPath(
  category: string,
  fileName: string,
): string {
  return path.join(SCREENSHOT_ROOT, category, fileName);
}

/** Core UI stories captured across white-label brand themes. */
export const VISUAL_TARGETS: VisualTarget[] = [
  {
    storyId: 'theme-workspacethemeprovider--default-brand',
    name: 'theme-default-brand',
    brand: 'landi-default',
  },
  {
    storyId: 'theme-workspacethemeprovider--acme-agency-green',
    name: 'theme-acme-green',
    brand: 'acme-agency',
  },
  {
    storyId: 'theme-workspacethemeprovider--rtl-demo-purple',
    name: 'theme-rtl-purple',
    brand: 'rtl-demo',
  },
  {
    storyId: 'ui-button--primary',
    name: 'button-primary',
    brand: 'landi-default',
  },
  {
    storyId: 'domain-epicbadge--in-progress',
    name: 'epic-badge-in-progress',
    brand: 'landi-default',
  },
  {
    storyId: 'layout-sidebar--default',
    name: 'sidebar-default',
    brand: 'landi-default',
    fullscreen: true,
  },
  {
    storyId: 'layout-sidebar--three-panel-layout',
    name: 'sidebar-three-panel',
    brand: 'acme-agency',
    fullscreen: true,
  },
  {
    storyId: 'members-assigneepicker--unassigned',
    name: 'assignee-picker-unassigned',
    brand: 'landi-default',
  },
  {
    storyId: 'brand-brandassetspreview--chief-ux-review-matrix',
    name: 'brand-chief-ux-matrix',
    brand: 'landi-default',
    fullscreen: true,
  },
  {
    storyId: 'editor-instantmarkdowneditor--with-seed-content',
    name: 'markdown-editor-seed',
    brand: 'landi-default',
  },
];

export const I18N_STORY_IDS: Record<string, string> = {
  en: 'i18n-navigationshowcase--english',
  es: 'i18n-navigationshowcase--spanish',
  de: 'i18n-navigationshowcase--german',
  ar: 'i18n-navigationshowcase--arabic-rtl',
};

/** Expected navigation label snippets per locale (partial match). */
export const EXPECTED_NAV_LABELS: Record<string, string[]> = {
  en: ['Inbox', 'My Stories', 'Agents'],
  es: ['Bandeja', 'Historias', 'Agentes'],
  de: ['Posteingang', 'Meine Stories', 'Agenten'],
  ar: ['صندوق الوارد', 'قصصي', 'الوكلاء'],
};
